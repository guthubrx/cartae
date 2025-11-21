/**
 * Routes API Office365 - Synchronisation emails
 *
 * POST /api/office365/sync - Synchronise emails Office365 → PostgreSQL
 * POST /api/office365/refresh - Rafraîchit un token expiré
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../db/client';
import { z } from 'zod';
import { graphTokenService, owaTokenService } from '../../services/TokenRefreshService';

const router = Router();

/**
 * Schema Zod pour la requête de synchronisation
 */
const SyncRequestSchema = z.object({
  maxEmails: z.number().min(1).max(1000).optional().default(50),
  folder: z.string().optional().default('Inbox'),
  userId: z.string().uuid(), // ID du user authentifié
});

/**
 * Interface Email OWA REST API v2.0 - VERSION COMPLETE
 * Note: OWA REST API v2.0 retourne des champs en PascalCase
 * Docs: https://learn.microsoft.com/en-us/previous-versions/office/office-365-api/api/version-2.0/mail-rest-operations
 */
interface GraphEmail {
  // Champs de base
  Id: string;
  Subject: string;
  BodyPreview: string;

  // Corps complet
  Body?: {
    Content: string;
    ContentType: 'Text' | 'HTML';
  };
  UniqueBody?: {
    Content: string;
    ContentType: 'Text' | 'HTML';
  };

  // Expéditeur et destinataires
  From: {
    EmailAddress: {
      Address: string;
      Name?: string;
    };
  };
  Sender?: {
    EmailAddress: {
      Address: string;
      Name?: string;
    };
  };
  ToRecipients: Array<{
    EmailAddress: {
      Address: string;
      Name?: string;
    };
  }>;
  CcRecipients?: Array<{
    EmailAddress: {
      Address: string;
      Name?: string;
    };
  }>;
  BccRecipients?: Array<{
    EmailAddress: {
      Address: string;
      Name?: string;
    };
  }>;
  ReplyTo?: Array<{
    EmailAddress: {
      Address: string;
      Name?: string;
    };
  }>;

  // Dates
  ReceivedDateTime: string;
  SentDateTime?: string;
  CreatedDateTime?: string;
  LastModifiedDateTime?: string;

  // Statuts et propriétés
  HasAttachments: boolean;
  Importance: 'Low' | 'Normal' | 'High';
  IsRead: boolean;
  IsDraft?: boolean;
  IsDeliveryReceiptRequested?: boolean;
  IsReadReceiptRequested?: boolean;
  Categories: string[];

  // Conversation et organisation
  ConversationId?: string;
  ConversationIndex?: string;
  ParentFolderId?: string;
  IsFromMe?: boolean;

  // Pièces jointes
  Attachments?: Array<{
    '@odata.type': string;
    Id: string;
    Name: string;
    ContentType: string;
    Size: number;
    IsInline: boolean;
    LastModifiedDateTime?: string;
    ContentId?: string;
    ContentLocation?: string;
  }>;

  // Liens et identifiants
  WebLink?: string;
  InternetMessageId?: string;
  ChangeKey?: string;
  ItemClass?: string;

  // Flag/Suivi
  Flag?: {
    FlagStatus: 'NotFlagged' | 'Complete' | 'Flagged';
    StartDateTime?: string;
    DueDateTime?: string;
    CompletedDateTime?: string;
  };

  // Mentions et @
  MentionsPreview?: {
    IsMentioned: boolean;
  };
  Mentions?: Array<{
    Mentioned: {
      Name?: string;
      Address?: string;
    };
    CreatedDateTime?: string;
  }>;

  // Sensibilité et classification
  Sensitivity?: 'Normal' | 'Personal' | 'Private' | 'Confidential';
  InferenceClassification?: 'Focused' | 'Other';

  // Propriétés étendues
  SingleValueExtendedProperties?: Array<{
    Id: string;
    Value: string;
  }>;
  MultiValueExtendedProperties?: Array<{
    Id: string;
    Value: string[];
  }>;
}

/**
 * Appelle OWA REST API v2.0 pour récupérer emails
 * Utilise le token OWA (audience: outlook.office.com)
 * Docs: https://learn.microsoft.com/en-us/previous-versions/office/office-365-api/api/version-2.0/mail-rest-operations
 */
async function fetchEmailsFromGraph(token: string, maxEmails: number): Promise<GraphEmail[]> {
  // OWA REST API v2.0 endpoint
  const OWA_BASE_URL = 'https://outlook.office365.com/api';

  // Demander les emails avec pièces jointes et corps complet
  const endpoint = `${OWA_BASE_URL}/v2.0/me/mailfolders/inbox/messages?$top=${Math.min(maxEmails, 200)}&$orderby=ReceivedDateTime desc&$expand=Attachments`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OWA API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.value || [];
}

/**
 * Transforme un email OWA API en CartaeItem pour PostgreSQL - VERSION ENRICHIE
 * Note: Utilise les champs PascalCase de OWA REST API v2.0
 */
function emailToCartaeItem(email: GraphEmail, userId: string) {
  // Date du message (pas de l'import)
  const receivedDate = new Date(email.ReceivedDateTime);

  // Extraire les pièces jointes (nom, type, taille) - TOUS les champs
  const attachments =
    email.Attachments?.map(att => ({
      id: att.Id,
      name: att.Name,
      contentType: att.ContentType,
      size: att.Size,
      isInline: att.IsInline,
      lastModifiedDateTime: att.LastModifiedDateTime,
      contentId: att.ContentId,
      contentLocation: att.ContentLocation,
    })) || [];

  // Construire metadata enrichie avec TOUS les champs disponibles
  const metadata: any = {
    // Champs standards CartaeMetadata
    author: email.From?.EmailAddress?.Address || 'unknown',
    participants: email.ToRecipients?.map(r => r.EmailAddress.Address) || [],
    startDate: email.ReceivedDateTime,
    priority: email.Importance === 'High' ? 'high' : email.Importance === 'Low' ? 'low' : 'medium',
    status: email.IsRead ? 'read' : 'unread',

    // Champs extensibles spécifiques Office365 - VERSION COMPLETE
    office365: {
      // Corps complet
      bodyContent: email.Body?.Content || email.BodyPreview,
      bodyContentType: email.Body?.ContentType || 'text',
      uniqueBody: email.UniqueBody?.Content,
      uniqueBodyType: email.UniqueBody?.ContentType,

      // Preview court pour liste
      bodyPreview: email.BodyPreview,

      // Categories Outlook (séparées des tags Cartae)
      categories: email.Categories || [],

      // Expéditeur enrichi
      fromName: email.From?.EmailAddress?.Name,
      fromEmail: email.From?.EmailAddress?.Address,
      senderEmail: email.Sender?.EmailAddress?.Address,
      senderName: email.Sender?.EmailAddress?.Name,

      // Destinataires en copie
      ccRecipients:
        email.CcRecipients?.map(r => ({
          email: r.EmailAddress.Address,
          name: r.EmailAddress.Name,
        })) || [],
      bccRecipients:
        email.BccRecipients?.map(r => ({
          email: r.EmailAddress.Address,
          name: r.EmailAddress.Name,
        })) || [],
      replyTo:
        email.ReplyTo?.map(r => ({
          email: r.EmailAddress.Address,
          name: r.EmailAddress.Name,
        })) || [],

      // Participants enrichis (avec noms)
      toRecipients:
        email.ToRecipients?.map(r => ({
          email: r.EmailAddress.Address,
          name: r.EmailAddress.Name,
        })) || [],

      // Dates supplémentaires
      sentDateTime: email.SentDateTime,
      createdDateTime: email.CreatedDateTime,
      lastModifiedDateTime: email.LastModifiedDateTime,

      // Pièces jointes - TOUS les champs
      hasAttachments: email.HasAttachments,
      attachments,
      attachmentsCount: attachments.length,
      attachmentsTotalSize: attachments.reduce((sum, att) => sum + att.size, 0),

      // Organisation et conversation
      conversationId: email.ConversationId,
      conversationIndex: email.ConversationIndex,
      parentFolderId: email.ParentFolderId,
      isDraft: email.IsDraft || false,
      isFromMe: email.IsFromMe,

      // Identifiants et liens
      webLink: email.WebLink,
      internetMessageId: email.InternetMessageId,
      changeKey: email.ChangeKey,
      itemClass: email.ItemClass,

      // Flag/Suivi - TOUS les champs
      flagStatus: email.Flag?.FlagStatus,
      flagStartDate: email.Flag?.StartDateTime,
      flagDueDate: email.Flag?.DueDateTime,
      flagCompletedDate: email.Flag?.CompletedDateTime,

      // Importance et classification
      importance: email.Importance,
      sensitivity: email.Sensitivity,
      inferenceClassification: email.InferenceClassification,

      // Accusés de réception
      isDeliveryReceiptRequested: email.IsDeliveryReceiptRequested,
      isReadReceiptRequested: email.IsReadReceiptRequested,

      // Mentions et @
      isMentioned: email.MentionsPreview?.IsMentioned,
      mentions:
        email.Mentions?.map(m => ({
          name: m.Mentioned?.Name,
          email: m.Mentioned?.Address,
          createdDateTime: m.CreatedDateTime,
        })) || [],

      // Propriétés étendues
      singleValueExtendedProperties: email.SingleValueExtendedProperties || [],
      multiValueExtendedProperties: email.MultiValueExtendedProperties || [],
    },
  };

  return {
    user_id: userId,
    type: 'email',
    title: email.Subject || '(Sans sujet)',
    content: email.Body?.Content || email.BodyPreview || '',
    tags: email.Categories || [],
    categories: ['work', 'email'],
    source: {
      connector: 'office365-mail-simple',
      sourceId: email.Id,
    },
    metadata,
    archived: false,
    favorite: false,
    // ✅ Dates réelles du message (pas de l'import)
    created_at: receivedDate.toISOString(),
    updated_at: receivedDate.toISOString(),
  };
}

/**
 * POST /api/office365/sync
 * Synchronise emails Office365 → PostgreSQL
 *
 * Headers:
 * - X-Office365-Token: Token Microsoft Graph API
 *
 * Body:
 * - maxEmails: Nombre max d'emails à synchroniser (défaut: 50)
 * - folder: Dossier à synchroniser (défaut: Inbox)
 * - userId: ID du user authentifié (UUID)
 *
 * Response:
 * - success: boolean
 * - itemsImported: number
 * - itemsSkipped: number
 * - errors: string[] (optionnel)
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    // 1. Valider la requête
    const data = SyncRequestSchema.parse(req.body);

    // 2. Récupérer le token Office365 depuis le header
    const graphToken = req.headers['x-office365-token'] as string;

    if (!graphToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing X-Office365-Token header',
      });
    }

    // 3. Appeler Microsoft Graph API
    console.log(`[Office365] Fetching ${data.maxEmails} emails for user ${data.userId}`);
    const emails = await fetchEmailsFromGraph(graphToken, data.maxEmails);

    console.log(`[Office365] Received ${emails.length} emails from Graph API`);

    // 4. Transformer et insérer chaque email dans PostgreSQL
    let itemsImported = 0;
    let itemsSkipped = 0;
    const errors: string[] = [];

    for (const email of emails) {
      try {
        const item = emailToCartaeItem(email, data.userId);

        // INSERT avec ON CONFLICT pour éviter duplicates (based on source.sourceId)
        const result = await pool.query(
          `INSERT INTO cartae_items (
            user_id, type, title, content, tags, categories, source, metadata, archived, favorite, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT ((source->>'sourceId'), user_id)
          DO NOTHING
          RETURNING id`,
          [
            item.user_id,
            item.type,
            item.title,
            item.content,
            item.tags,
            item.categories,
            JSON.stringify(item.source),
            JSON.stringify(item.metadata),
            item.archived,
            item.favorite,
            item.created_at,
            item.updated_at,
          ]
        );

        if (result.rowCount && result.rowCount > 0) {
          itemsImported++;
        } else {
          itemsSkipped++; // Déjà existant
        }
      } catch (emailError) {
        const errorMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
        console.error(`[Office365] Error importing email ${email.id}:`, errorMsg);
        errors.push(`Email ${email.id}: ${errorMsg}`);
      }
    }

    // 5. Retourner le résumé
    console.log(
      `[Office365] Sync complete: ${itemsImported} imported, ${itemsSkipped} skipped, ${errors.length} errors`
    );

    return res.json({
      success: true,
      itemsImported,
      itemsSkipped,
      totalProcessed: emails.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Office365] Sync error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/office365/items
 * Récupère les emails importés depuis Office365 pour un user
 *
 * Query params:
 * - userId: ID du user (UUID)
 * - limit: Nombre max d'items (défaut: 50)
 *
 * Response:
 * - success: boolean
 * - items: CartaeItem[]
 */
router.get('/items', async (req: Request, res: Response) => {
  try {
    const { userId, limit = '50' } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing userId query parameter',
      });
    }

    const itemLimit = Math.min(parseInt(limit as string, 10), 1000);

    const result = await pool.query(
      `SELECT * FROM cartae_items
       WHERE user_id = $1
       AND source->>'connector' = 'office365-mail-simple'
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, itemLimit]
    );

    // Convertir snake_case (PostgreSQL) vers camelCase (frontend)
    const items = result.rows.map((row: any) => ({
      ...row,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userId: row.user_id,
    }));

    return res.json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error) {
    console.error('[Office365] Error fetching items:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/office365/refresh
 * Rafraîchit un token Office365 expiré en utilisant le refresh token
 *
 * Body:
 * - refreshToken: Refresh token obtenu lors du login
 * - tokenType: 'graph' ou 'owa'
 * - scope: Scopes OAuth requis (optionnel)
 *
 * Response:
 * - success: boolean
 * - accessToken: string (nouveau access token)
 * - refreshToken: string (nouveau refresh token, ou ancien si inchangé)
 * - expiresAt: number (timestamp Unix en ms)
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken, tokenType = 'graph', scope } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing refreshToken in request body',
      });
    }

    // Sélectionner le service approprié
    const service = tokenType === 'owa' ? owaTokenService : graphTokenService;

    // Rafraîchir le token
    console.log(`[Office365] Rafraîchissement token ${tokenType}...`);
    const newTokenData = await service.refreshToken(refreshToken, scope);

    console.log(`[Office365] ✅ Token ${tokenType} rafraîchi avec succès`);

    return res.json({
      success: true,
      accessToken: newTokenData.accessToken,
      refreshToken: newTokenData.refreshToken,
      expiresAt: newTokenData.expiresAt,
    });
  } catch (error) {
    console.error('[Office365] Erreur refresh token:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Erreur 401 = refresh token invalide/expiré → re-login requis
    if (errorMessage.includes('401') || errorMessage.includes('invalid_grant')) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token invalide ou expiré. Re-connexion requise.',
        requiresReauth: true,
      });
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;
