/**
 * OwaRestEmailService - OWA REST API v2.0 pour emails
 *
 * Service pour emails via OWA REST API v2.0 (utilise token OWA capturé)
 *
 * Endpoints :
 * - GET /me/messages - Liste emails
 * - POST /me/sendmail - Envoyer email
 *
 * Documentation : https://learn.microsoft.com/previous-versions/office/office-365-api/
 */

import type { IAuthService } from '../types/auth.types';
import { globalCache, CacheTTL } from './CacheService';

/**
 * Interface pour un email
 */
export interface OwaEmail {
  id: string;
  subject: string;
  from: {
    name: string;
    email: string;
  };
  to: Array<{ name: string; email: string }>;
  body: string;
  bodyType: 'text' | 'html';
  receivedDateTime: Date;
  hasAttachments: boolean;
  isRead: boolean;
}

/**
 * Interface pour un attachment d'email
 */
export interface OwaAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
}

/**
 * Options pour envoyer un email
 */
export interface SendEmailOptions {
  to: string[];
  subject: string;
  body: string;
  bodyType?: 'text' | 'html';
  cc?: string[];
  bcc?: string[];
}

/**
 * Service OWA REST API v2.0 pour emails
 */
export class OwaRestEmailService {
  private readonly OWA_ENDPOINT = 'https://outlook.office.com/api/v2.0';

  constructor(private authService: IAuthService) {
    console.log('[OwaRestEmailService] Initialisé');
  }

  /**
   * Liste les emails de la boîte de réception
   */
  async listInboxEmails(maxResults: number = 50): Promise<OwaEmail[]> {
    const cacheKey = `owa:inbox:${maxResults}`;

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          console.log('[OwaRestEmailService] Liste des emails Inbox...');

          const url = `${this.OWA_ENDPOINT}/me/messages?$top=${maxResults}&$orderby=ReceivedDateTime desc`;

          const response = await this.sendOwaRequest(url, { method: 'GET' });
          const data = JSON.parse(response);

          const emails: OwaEmail[] = (data.value || []).map((msg: any) => ({
            id: msg.Id,
            subject: msg.Subject || '(sans objet)',
            from: {
              name: msg.From?.EmailAddress?.Name || 'Inconnu',
              email: msg.From?.EmailAddress?.Address || '',
            },
            to: (msg.ToRecipients || []).map((r: any) => ({
              name: r.EmailAddress?.Name || '',
              email: r.EmailAddress?.Address || '',
            })),
            body: msg.BodyPreview || '',
            bodyType: msg.Body?.ContentType === 'HTML' ? 'html' : 'text',
            receivedDateTime: new Date(msg.DateTimeReceived),
            hasAttachments: msg.HasAttachments || false,
            isRead: msg.IsRead || false,
          }));

          console.log(`[OwaRestEmailService] ✅ ${emails.length} emails récupérés`);
          return emails;

        } catch (error) {
          console.error('[OwaRestEmailService] ❌ Erreur liste emails:', error);
          throw this.handleError(error, 'Impossible de lister les emails');
        }
      },
      CacheTTL.MESSAGES
    );
  }

  /**
   * Récupère un email complet par son ID
   */
  async getEmail(emailId: string): Promise<OwaEmail> {
    try {
      console.log(`[OwaRestEmailService] Récupération email ${emailId}...`);

      const url = `${this.OWA_ENDPOINT}/me/messages/${emailId}`;
      const response = await this.sendOwaRequest(url, { method: 'GET' });
      const msg = JSON.parse(response);

      const email: OwaEmail = {
        id: msg.Id,
        subject: msg.Subject || '(sans objet)',
        from: {
          name: msg.From?.EmailAddress?.Name || 'Inconnu',
          email: msg.From?.EmailAddress?.Address || '',
        },
        to: (msg.ToRecipients || []).map((r: any) => ({
          name: r.EmailAddress?.Name || '',
          email: r.EmailAddress?.Address || '',
        })),
        body: msg.Body?.Content || '',
        bodyType: msg.Body?.ContentType === 'HTML' ? 'html' : 'text',
        receivedDateTime: new Date(msg.DateTimeReceived),
        hasAttachments: msg.HasAttachments || false,
        isRead: msg.IsRead || false,
      };

      console.log('[OwaRestEmailService] ✅ Email récupéré');
      return email;

    } catch (error) {
      console.error('[OwaRestEmailService] ❌ Erreur récupération email:', error);
      throw this.handleError(error, 'Impossible de récupérer l\'email');
    }
  }

  /**
   * Récupère et parse une pièce jointe d'un email
   *
   * @param emailId - ID de l'email
   * @param attachmentId - ID de l'attachment
   * @param options - Options de parsing
   * @returns ParsedAttachment avec contenu extrait
   */
  async getAttachmentWithParsing(
    emailId: string,
    attachmentId: string,
    options: { extractText?: boolean; generatePreview?: boolean } = {}
  ) {
    try {
      console.log(`[OwaRestEmailService] Récupération attachment ${attachmentId}...`);

      const url = `${this.OWA_ENDPOINT}/me/messages/${emailId}/attachments/${attachmentId}`;
      const response = await this.sendOwaRequest(url, { method: 'GET' });
      const attachment = JSON.parse(response);

      if (!attachment.ContentBytes) {
        throw new Error('Attachment sans contenu (ContentBytes manquant)');
      }

      // Parser avec o365AttachmentParserService
      const { o365AttachmentParserService } = await import(
        './O365AttachmentParserService'
      );

      const parsed = await o365AttachmentParserService.parseAttachment(
        attachmentId,
        attachment.ContentBytes,
        attachment.ContentType || 'application/octet-stream',
        {
          extractText: options.extractText ?? true,
          generatePreview: options.generatePreview ?? true,
          fileName: attachment.Name, // Pour fallback détection par extension
        }
      );

      console.log('[OwaRestEmailService] ✅ Attachment parsé');
      return parsed;
    } catch (error) {
      console.error(
        '[OwaRestEmailService] ❌ Erreur parsing attachment:',
        error
      );
      throw this.handleError(error, "Impossible de parser l'attachment");
    }
  }

  /**
   * Liste les pièces jointes d'un email
   *
   * @param emailId - ID de l'email
   * @returns Liste des attachments
   */
  async listAttachments(emailId: string): Promise<OwaAttachment[]> {
    try {
      console.log(`[OwaRestEmailService] Liste attachments email ${emailId}...`);

      const url = `${this.OWA_ENDPOINT}/me/messages/${emailId}/attachments`;
      const response = await this.sendOwaRequest(url, { method: 'GET' });
      const data = JSON.parse(response);

      const attachments: OwaAttachment[] = (data.value || []).map((att: any) => ({
        id: att.Id,
        name: att.Name || 'Sans nom',
        contentType: att.ContentType || 'application/octet-stream',
        size: att.Size || 0,
        isInline: att.IsInline || false,
      }));

      console.log(`[OwaRestEmailService] ✅ ${attachments.length} attachments récupérés`);
      return attachments;
    } catch (error) {
      console.error('[OwaRestEmailService] ❌ Erreur liste attachments:', error);
      throw this.handleError(error, 'Impossible de lister les attachments');
    }
  }

  /**
   * Envoie un email
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      console.log('[OwaRestEmailService] Envoi email...');
      console.log('  To:', options.to.join(', '));
      console.log('  Subject:', options.subject);

      const bodyType = options.bodyType === 'html' ? 'HTML' : 'Text';

      // Format OWA REST API v2.0 (identique à popup.js)
      const message = {
        Message: {
          Subject: options.subject,
          Body: {
            ContentType: bodyType,
            Content: options.body,
          },
          ToRecipients: options.to.map(email => ({
            EmailAddress: { Address: email }
          })),
          CcRecipients: (options.cc || []).map(email => ({
            EmailAddress: { Address: email }
          })),
          BccRecipients: (options.bcc || []).map(email => ({
            EmailAddress: { Address: email }
          })),
        },
      };

      const url = `${this.OWA_ENDPOINT}/me/sendmail`;
      await this.sendOwaRequest(url, {
        method: 'POST',
        body: JSON.stringify(message),
      });

      console.log('[OwaRestEmailService] ✅ Email envoyé');

    } catch (error) {
      console.error('[OwaRestEmailService] ❌ Erreur envoi email:', error);
      throw this.handleError(error, 'Impossible d\'envoyer l\'email');
    }
  }

  /**
   * Envoie une requête OWA REST API
   */
  private async sendOwaRequest(url: string, options: { method: string; body?: string }): Promise<string> {
    // TEMPORAIRE: Proxy OWA pas encore implémenté dans content-script
    // TODO Session 29: Ajouter support OWA dans content-script
    console.log('[OwaRestEmailService] 🌐 Fetch direct avec token');
    const token = await this.authService.getToken('owa');

    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: options.body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const responseText = await response.text();
    return responseText;
  }

  /**
   * Envoie via proxy extension (évite CORS)
   */
  private async sendViaExtensionProxy(url: string, options: { method: string; body?: string }): Promise<string> {
    const requestId = Math.random().toString(36).slice(2, 15);

    return new Promise((resolve, reject) => {
      // Handler pour la réponse
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'CARTAE_OWA_RESPONSE' && event.data.requestId === requestId) {
          window.removeEventListener('message', handler);

          const response = event.data.response;

          if (!response.success) {
            reject(new Error(response.error || 'Extension proxy error'));
            return;
          }

          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`HTTP ${response.status}: ${response.body}`));
            return;
          }

          resolve(response.body);
        }
      };

      window.addEventListener('message', handler);

      // Timeout 30s
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Extension proxy timeout'));
      }, 30000);

      // Envoyer requête via content script
      window.postMessage({
        type: 'CARTAE_OWA_REQUEST',
        requestId: requestId,
        url: url,
        method: options.method,
        headers: {},
        body: options.body
      }, '*');
    });
  }

  /**
   * Gère les erreurs
   */
  private handleError(error: any, context: string): Error {
    if (error instanceof Error) {
      return new Error(`${context}: ${error.message}`);
    }
    return new Error(`${context}: ${String(error)}`);
  }
}
