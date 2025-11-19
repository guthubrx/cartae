/**
 * Routes API Office365 Teams - Synchronisation chats
 *
 * POST /api/office365/teams/sync - Synchronise chats Teams � PostgreSQL
 * GET /api/office365/teams/items - R�cup�re chats depuis PostgreSQL
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../db/client';
import { z } from 'zod';
import { TeamsService } from '../../services/TeamsService';
import { SimpleAuthAdapter } from './SimpleAuthAdapter';

const router = Router();

/**
 * Schema Zod pour la requ�te de synchronisation
 */
const SyncRequestSchema = z.object({
  maxChats: z.number().min(1).max(1000).optional().default(50),
  userId: z.string().uuid(), // ID du user authentifi�
});

/**
 * Interface Chat Microsoft Graph API v1.0
 * Docs: https://learn.microsoft.com/en-us/graph/api/chat-list
 */
interface GraphChat {
  id: string;
  topic: string | null;
  createdDateTime: string;
  lastUpdatedDateTime: string;
  chatType: 'oneOnOne' | 'group' | 'meeting';
  webUrl?: string;
  members?: Array<{
    '@odata.type': string;
    id: string;
    displayName?: string;
    email?: string;
  }>;
  lastMessagePreview?: {
    id: string;
    createdDateTime: string;
    body?: {
      content: string;
      contentType: 'text' | 'html';
    };
    from?: {
      user?: {
        id: string;
        displayName?: string;
      };
    };
  };
}

/**
 * Récupère chats Teams via TeamsService Session 70 (qui marchait !)
 */
async function fetchChatsFromGraph(
  token: string,
  maxChats: number
): Promise<any[]> {
  // Utiliser le TeamsService Session 70 qui marchait
  const authAdapter = new SimpleAuthAdapter(token);
  const teamsService = new TeamsService(authAdapter);

  const chats = await teamsService.listChats(maxChats);

  // Convertir TeamsChat[] en GraphChat[] (format compatible)
  return chats.map(chat => ({
    id: chat.id,
    topic: chat.topic,
    createdDateTime: chat.lastMessageDateTime.toISOString(),
    lastUpdatedDateTime: chat.lastMessageDateTime.toISOString(),
    chatType: chat.chatType,
    members: chat.members.map(m => ({
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      id: m.userId || '',
      displayName: m.displayName,
      email: m.email,
    })),
    lastMessagePreview: chat.lastMessagePreview ? {
      id: '',
      createdDateTime: chat.lastMessageDateTime.toISOString(),
      body: {
        content: chat.lastMessagePreview,
        contentType: 'text' as const,
      },
    } : undefined,
  }));
}

/**
 * Récupère TOUS les messages d'un chat Teams via Graph API
 * Endpoint: GET /v1.0/chats/{chatId}/messages
 */
async function fetchChatMessages(
  token: string,
  chatId: string,
  maxMessages: number = 50
): Promise<any[]> {
  const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
  const endpoint = `${GRAPH_BASE_URL}/chats/${chatId}/messages?$top=${maxMessages}&$orderby=createdDateTime desc`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Teams Messages] Failed to fetch messages for chat ${chatId}: ${response.status} - ${errorText}`);
      return []; // Retourner tableau vide en cas d'erreur (pas bloquer la synchro)
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.warn(`[Teams Messages] Error fetching messages for chat ${chatId}:`, error);
    return []; // Retourner tableau vide en cas d'erreur
  }
}

/**
 * Transforme un chat Teams en CartaeItem pour PostgreSQL - VERSION ENRICHIE
 */
function chatToCartaeItem(chat: GraphChat, userId: string, messages?: any[]) {
  // Extraire les participants (membres du chat)
  const participantsRaw = chat.members
    ?.map(m => m.email || m.displayName || m.id)
    .filter(Boolean) || [];

  // Participants enrichis (avec noms et emails)
  const participantsEnriched = chat.members?.map(m => ({
    id: m.id,
    displayName: m.displayName,
    email: m.email,
    type: m['@odata.type'],
  })) || [];

  // Extraire le contenu du dernier message (complet si on a les messages, sinon preview)
  const lastMessageContent = messages && messages.length > 0
    ? messages[0].body?.content || chat.lastMessagePreview?.body?.content || ''
    : chat.lastMessagePreview?.body?.content || '';
  const lastMessageAuthor = messages && messages.length > 0
    ? messages[0].from?.user?.displayName || chat.lastMessagePreview?.from?.user?.displayName || participantsRaw[0] || 'Teams'
    : chat.lastMessagePreview?.from?.user?.displayName || participantsRaw[0] || 'Teams';

  // Titre du chat (topic ou liste participants)
  const chatTitle =
    chat.topic ||
    (chat.chatType === 'oneOnOne'
      ? `Chat 1:1 avec ${participantsRaw.filter(p => !p.includes(userId))[0] || 'Unknown'}`
      : `Chat groupe (${participantsRaw.length} membres)`);

  // Tags lisibles selon chatType
  const chatTypeTags = {
    'oneOnOne': 'Chat 1:1',
    'group': 'Groupe',
    'meeting': 'Réunion'
  };
  const readableTag = chatTypeTags[chat.chatType] || chat.chatType;

  // Date de création (convertir string ISO en Date)
  const createdDate = new Date(chat.createdDateTime);
  const lastUpdatedDate = new Date(chat.lastUpdatedDateTime);

  // Construire metadata enrichie
  const metadata: any = {
    // Champs standards CartaeMetadata
    author: lastMessageAuthor,
    participants: participantsRaw,

    // Champs extensibles spécifiques Office365/Teams
    office365: {
      // Info du chat
      chatType: chat.chatType,
      chatTopic: chat.topic,
      webUrl: chat.webUrl,

      // Membres enrichis
      members: participantsEnriched,
      membersCount: participantsEnriched.length,

      // Dates
      createdDateTime: chat.createdDateTime,
      lastUpdatedDateTime: chat.lastUpdatedDateTime,

      // Dernier message (preview)
      lastMessagePreview: chat.lastMessagePreview ? {
        id: chat.lastMessagePreview.id,
        createdDateTime: chat.lastMessagePreview.createdDateTime,
        content: chat.lastMessagePreview.body?.content,
        contentType: chat.lastMessagePreview.body?.contentType,
        fromUserId: chat.lastMessagePreview.from?.user?.id,
        fromUserDisplayName: chat.lastMessagePreview.from?.user?.displayName,
      } : undefined,

      // TOUS les messages du chat (si récupérés)
      messages: messages?.map(msg => ({
        id: msg.id,
        createdDateTime: msg.createdDateTime,
        lastModifiedDateTime: msg.lastModifiedDateTime,
        deletedDateTime: msg.deletedDateTime,
        content: msg.body?.content,
        contentType: msg.body?.contentType,
        importance: msg.importance,
        fromUserId: msg.from?.user?.id,
        fromUserDisplayName: msg.from?.user?.displayName,
        attachments: msg.attachments?.map((att: any) => ({
          id: att.id,
          name: att.name,
          contentType: att.contentType,
        })) || [],
        mentions: msg.mentions?.map((mention: any) => ({
          id: mention.id,
          mentionText: mention.mentionText,
          mentioned: mention.mentioned,
        })) || [],
        reactions: msg.reactions?.map((reaction: any) => ({
          reactionType: reaction.reactionType,
          createdDateTime: reaction.createdDateTime,
          user: reaction.user,
        })) || [],
      })) || [],
      messagesCount: messages?.length || 0,
    },
  };

  return {
    user_id: userId,
    type: 'message',
    title: chatTitle,
    content: lastMessageContent,
    tags: [readableTag, 'teams'],
    categories: ['work', 'communication'],
    source: {
      connector: 'office365-teams-backend',
      sourceId: chat.id,
    },
    metadata,
    archived: false,
    favorite: false,
    // ✅ Dates réelles du chat (pas de l'import)
    created_at: createdDate.toISOString(),
    updated_at: lastUpdatedDate.toISOString(),
  };
}

/**
 * POST /api/office365/teams/sync
 * Synchronise chats Teams � PostgreSQL
 *
 * Headers:
 * - X-Office365-Token: Token Microsoft Graph API
 *
 * Body:
 * - maxChats: Nombre max de chats � synchroniser (d�faut: 50)
 * - userId: ID du user authentifi� (UUID)
 *
 * Response:
 * - success: boolean
 * - itemsImported: number
 * - itemsSkipped: number
 * - errors: string[] (optionnel)
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    // 1. Valider la requ�te
    const data = SyncRequestSchema.parse(req.body);

    // 2. R�cup�rer le token Office365 depuis le header
    const graphToken = req.headers['x-office365-token'] as string;

    if (!graphToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing X-Office365-Token header',
      });
    }

    // 3. Appeler Microsoft Graph API
    console.log(`[Office365 Teams] Fetching ${data.maxChats} chats for user ${data.userId}`);
    const chats = await fetchChatsFromGraph(graphToken, data.maxChats);

    console.log(`[Office365 Teams] Received ${chats.length} chats from Graph API`);

    // 4. Transformer et ins�rer chaque chat dans PostgreSQL
    let itemsImported = 0;
    let itemsSkipped = 0;
    const errors: string[] = [];

    for (const chat of chats) {
      try {
        // ✅ Récupérer TOUS les messages du chat (enrichissement)
        console.log(`[Office365 Teams] Fetching messages for chat ${chat.id}...`);
        const messages = await fetchChatMessages(graphToken, chat.id, 50);
        console.log(`[Office365 Teams] Retrieved ${messages.length} messages for chat ${chat.id}`);

        const item = chatToCartaeItem(chat, data.userId, messages);

        // TODO Session 120: Creer index unique pour ON CONFLICT
        // Pour l'instant, verification manuelle pour eviter doublons

        // Verifier si l'item existe deja
        const existingCheck = await pool.query(
          `SELECT id FROM cartae_items
           WHERE user_id = $1
           AND source->>'connector' = $2
           AND source->>'sourceId' = $3
           LIMIT 1`,
          [data.userId, 'office365-teams-backend', chat.id]
        );

        if (existingCheck.rows.length > 0) {
          itemsSkipped++; // Deja existant
          continue;
        }

        // INSERT simple sans ON CONFLICT
        const result = await pool.query(
          `INSERT INTO cartae_items (
            user_id, type, title, content, tags, categories, source, metadata, archived, favorite, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        }
      } catch (chatError) {
        const errorMsg = chatError instanceof Error ? chatError.message : 'Unknown error';
        console.error(`[Office365 Teams] Error importing chat ${chat.id}:`, errorMsg);
        errors.push(`Chat ${chat.id}: ${errorMsg}`);
      }
    }

    // 5. Retourner le r�sum�
    console.log(
      `[Office365 Teams] Sync complete: ${itemsImported} imported, ${itemsSkipped} skipped, ${errors.length} errors`
    );

    return res.json({
      success: true,
      itemsImported,
      itemsSkipped,
      totalProcessed: chats.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Office365 Teams] Sync error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/office365/teams/items
 * R�cup�re les chats import�s depuis Teams pour un user
 *
 * Query params:
 * - userId: ID du user (UUID)
 * - limit: Nombre max d'items (d�faut: 50)
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
       AND source->>'connector' = 'office365-teams-backend'
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
    console.error('[Office365 Teams] Error fetching items:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;
