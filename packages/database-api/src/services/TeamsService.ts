/**
 * TeamsService - Microsoft Teams via Graph API
 *
 * Service pour conversations Teams via Graph API v1.0
 *
 * Endpoints :
 * - GET /me/chats - Liste conversations
 * - GET /me/chats/{id}/messages - Messages d'une conversation
 * - POST /me/chats/{id}/messages - Envoyer un message
 *
 * Documentation : https://learn.microsoft.com/graph/api/resources/chat
 */

import type { IAuthService } from '../types/auth.types';
import { globalCache, CacheTTL } from './CacheService';
import { fetchWithRetry } from '../utils/retryRequest';

/**
 * Interface pour une conversation Teams
 */
export interface TeamsChat {
  id: string;
  topic: string | null;
  chatType: 'oneOnOne' | 'group' | 'meeting';
  lastMessagePreview: string;
  lastMessageDateTime: Date;
  members: Array<{
    displayName: string;
    email: string;
    userId?: string;
  }>;
}

/**
 * Interface pour un message Teams
 */
/**
 * Attachment Teams (fichier dans message/chat)
 */
export interface TeamsAttachment {
  id: string;
  contentType: string;
  name?: string;
  contentUrl?: string;
}

export interface TeamsMessage {
  id: string;
  body: string;
  bodyType: 'text' | 'html';
  from: {
    displayName: string;
    email: string;
    userId?: string; // ID de l'utilisateur pour récupérer sa photo
  };
  createdDateTime: Date;
  attachments: TeamsAttachment[];
}

/**
 * Interface pour une équipe Teams
 */
export interface Team {
  id: string;
  displayName: string;
  description: string;
}

/**
 * Interface pour un canal Teams
 */
export interface Channel {
  id: string;
  displayName: string;
  description: string;
  membershipType: 'standard' | 'private' | 'shared';
}

/**
 * Service Microsoft Teams
 */
export class TeamsService {
  private readonly GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';

  constructor(private authService: IAuthService) {
    console.log('[TeamsService] Initialisé');
  }

  /**
   * Récupère les informations de l'utilisateur courant
   */
  async getCurrentUser(): Promise<{ email: string; displayName: string }> {
    const cacheKey = 'teams:user:current';

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          console.log('[TeamsService] Récupération utilisateur courant...');

          const url = `${this.GRAPH_ENDPOINT}/me`;

          const response = await this.sendGraphRequest(url, { method: 'GET' });
          const data = JSON.parse(response);

          console.log('[TeamsService] ✅ Utilisateur récupéré');
          return {
            email: data.mail || data.userPrincipalName || '',
            displayName: data.displayName || 'Unknown',
          };

        } catch (error) {
          console.error('[TeamsService] ❌ Erreur récupération utilisateur:', error);
          throw this.handleError(error, 'Impossible de récupérer l\'utilisateur');
        }
      },
      CacheTTL.USER_INFO
    );
  }

  /**
   * Récupère la photo d'un utilisateur
   * @param userId - ID de l'utilisateur, ou vide pour l'utilisateur courant
   * @returns URL blob de la photo, ou null si pas de photo
   */
  async getUserPhoto(userId?: string): Promise<string | null> {
    const cacheKey = `teams:photo:${userId || 'me'}`;

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          const endpoint = userId ? `/users/${userId}/photo/$value` : '/me/photo/$value';
          const url = `${this.GRAPH_ENDPOINT}${endpoint}`;

          console.log(`[TeamsService] Récupération photo ${userId || 'me'}...`);

          const response = await this.sendGraphRequestBinary(url);

          if (!response) {
            console.log('[TeamsService] Pas de photo disponible');
            return null;
          }

          // Créer un blob URL
          const blob = new Blob([response], { type: 'image/jpeg' });
          const blobUrl = URL.createObjectURL(blob);

          console.log('[TeamsService] ✅ Photo récupérée');
          return blobUrl;

        } catch (error) {
          console.log('[TeamsService] Pas de photo pour cet utilisateur');
          return null;
        }
      },
      CacheTTL.PHOTOS
    );
  }

  /**
   * Liste les conversations Teams
   */
  async listChats(limit: number = 20): Promise<TeamsChat[]> {
    const cacheKey = `teams:chats:list:${limit}`;

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          console.log('[TeamsService] Liste des conversations Teams...');

          const url = `${this.GRAPH_ENDPOINT}/me/chats?$top=${limit}&$expand=members`;

          const response = await this.sendGraphRequest(url, { method: 'GET' });
          const data = JSON.parse(response);

          const chats: TeamsChat[] = (data.value || []).map((chat: any) => ({
            id: chat.id,
            topic: chat.topic || null,
            chatType: chat.chatType,
            lastMessagePreview: chat.lastMessagePreview?.content?.substring(0, 100) || '',
            lastMessageDateTime: new Date(chat.lastUpdatedDateTime || Date.now()),
            members: (chat.members || []).map((m: any) => ({
              displayName: m.displayName || 'Unknown',
              email: m.email || '',
              userId: m.userId || undefined,
            })),
          }));

          console.log(`[TeamsService] ✅ ${chats.length} conversations récupérées`);
          return chats;

        } catch (error) {
          console.error('[TeamsService] ❌ Erreur liste conversations:', error);
          throw this.handleError(error, 'Impossible de lister les conversations');
        }
      },
      CacheTTL.CHATS_LIST
    );
  }

  /**
   * Récupère les messages d'une conversation
   */
  async getChatMessages(chatId: string, limit: number = 50): Promise<TeamsMessage[]> {
    const cacheKey = `teams:chat:${chatId}:messages:${limit}`;

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          console.log(`[TeamsService] Récupération messages chat ${chatId}...`);

          const url = `${this.GRAPH_ENDPOINT}/me/chats/${chatId}/messages?$top=${limit}&$orderby=createdDateTime desc`;

          const response = await this.sendGraphRequest(url, { method: 'GET' });
          const data = JSON.parse(response);

          const messages: TeamsMessage[] = (data.value || []).map((msg: any) => ({
            id: msg.id,
            body: msg.body?.content || '',
            bodyType: msg.body?.contentType === 'html' ? 'html' : 'text',
            from: {
              displayName: msg.from?.user?.displayName || 'Unknown',
              email: msg.from?.user?.userPrincipalName || msg.from?.user?.email || '',
              userId: msg.from?.user?.id || undefined,
            },
            createdDateTime: new Date(msg.createdDateTime),
            attachments: msg.attachments || [],
          }));

          console.log(`[TeamsService] ✅ ${messages.length} messages récupérés`);
          return messages;

        } catch (error) {
          console.error('[TeamsService] ❌ Erreur récupération messages:', error);
          throw this.handleError(error, 'Impossible de récupérer les messages');
        }
      },
      CacheTTL.MESSAGES
    );
  }

  /**
   * Envoie un message dans une conversation
   */
  async sendMessage(chatId: string, content: string): Promise<void> {
    try {
      console.log('[TeamsService] Envoi message...');

      const message = {
        body: {
          contentType: 'text',
          content: content,
        },
      };

      const url = `${this.GRAPH_ENDPOINT}/me/chats/${chatId}/messages`;
      await this.sendGraphRequest(url, {
        method: 'POST',
        body: JSON.stringify(message),
      });

      // Invalider le cache des messages de ce chat
      globalCache.invalidatePrefix(`teams:chat:${chatId}:messages`);

      console.log('[TeamsService] ✅ Message envoyé');

    } catch (error) {
      console.error('[TeamsService] ❌ Erreur envoi message:', error);
      throw this.handleError(error, 'Impossible d\'envoyer le message');
    }
  }

  /**
   * Récupère et parse une pièce jointe d'un message Teams
   *
   * Note: Microsoft Graph ne fournit pas d'endpoint direct pour télécharger
   * les attachments Teams via /me/chats/{chatId}/messages/{messageId}/attachments.
   * Les fichiers sont stockés dans SharePoint/OneDrive et accessibles via contentUrl.
   *
   * @param chatId - ID du chat/channel
   * @param messageId - ID du message
   * @param attachmentId - ID de l'attachment
   * @param contentUrl - URL de téléchargement (optionnel, depuis TeamsAttachment.contentUrl)
   * @param options - Options de parsing
   * @returns ParsedAttachment avec contenu extrait
   */
  async getAttachmentWithParsing(
    chatId: string,
    messageId: string,
    attachmentId: string,
    contentUrl?: string,
    options: { extractText?: boolean; generatePreview?: boolean } = {}
  ) {
    try {
      console.log(`[TeamsService] Récupération attachment ${attachmentId}...`);

      // Option 1: Utiliser contentUrl si fourni (URL SharePoint/OneDrive)
      if (contentUrl) {
        const response = await this.sendGraphRequest(contentUrl, {
          method: 'GET',
        });

        // Convertir en base64 (Graph retourne binaire)
        const buffer = Buffer.from(response, 'binary');
        const contentBytes = buffer.toString('base64');

        // Détecter MIME type depuis URL ou headers
        const mimeType = this.guessMimeTypeFromUrl(contentUrl);

        // Parser
        const { o365AttachmentParserService } = await import(
          './O365AttachmentParserService'
        );

        const parsed = await o365AttachmentParserService.parseAttachment(
          attachmentId,
          contentBytes,
          mimeType,
          {
            extractText: options.extractText ?? true,
            generatePreview: options.generatePreview ?? true,
          }
        );

        console.log('[TeamsService] ✅ Attachment parsé (via contentUrl)');
        return parsed;
      }

      // Option 2: Fallback via hostedContents (pour fichiers inline)
      const url = `${this.GRAPH_ENDPOINT}/me/chats/${chatId}/messages/${messageId}/hostedContents/${attachmentId}/$value`;

      const response = await this.sendGraphRequestBinary(url);

      if (!response) {
        throw new Error('Impossible de récupérer le contenu de l\'attachment');
      }

      // Convertir ArrayBuffer en base64
      const buffer = Buffer.from(new Uint8Array(response));
      const contentBytes = buffer.toString('base64');

      // Parser
      const { o365AttachmentParserService } = await import(
        './O365AttachmentParserService'
      );

      const parsed = await o365AttachmentParserService.parseAttachment(
        attachmentId,
        contentBytes,
        'application/octet-stream', // MIME type inconnu pour hostedContents
        {
          extractText: options.extractText ?? true,
          generatePreview: options.generatePreview ?? true,
        }
      );

      console.log('[TeamsService] ✅ Attachment parsé (via hostedContents)');
      return parsed;
    } catch (error) {
      console.error('[TeamsService] ❌ Erreur parsing attachment:', error);
      throw this.handleError(error, "Impossible de parser l'attachment");
    }
  }

  /**
   * Devine le MIME type depuis une URL de fichier
   */
  private guessMimeTypeFromUrl(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Liste les équipes Teams dont l'utilisateur est membre
   */
  async listJoinedTeams(): Promise<Team[]> {
    try {
      console.log('[TeamsService] Liste des équipes Teams...');

      const url = `${this.GRAPH_ENDPOINT}/me/joinedTeams`;

      const response = await this.sendGraphRequest(url, { method: 'GET' });
      const data = JSON.parse(response);

      const teams: Team[] = (data.value || []).map((team: any) => ({
        id: team.id,
        displayName: team.displayName || 'Unknown',
        description: team.description || '',
      }));

      console.log(`[TeamsService] ✅ ${teams.length} équipes récupérées`);
      return teams;

    } catch (error) {
      console.error('[TeamsService] ❌ Erreur liste équipes:', error);
      throw this.handleError(error, 'Impossible de lister les équipes');
    }
  }

  /**
   * Liste les canaux d'une équipe
   */
  async listChannels(teamId: string): Promise<Channel[]> {
    try {
      console.log(`[TeamsService] Liste des canaux de l'équipe ${teamId}...`);

      const url = `${this.GRAPH_ENDPOINT}/teams/${teamId}/channels`;

      const response = await this.sendGraphRequest(url, { method: 'GET' });
      const data = JSON.parse(response);

      const channels: Channel[] = (data.value || []).map((channel: any) => ({
        id: channel.id,
        displayName: channel.displayName || 'Unknown',
        description: channel.description || '',
        membershipType: channel.membershipType || 'standard',
      }));

      console.log(`[TeamsService] ✅ ${channels.length} canaux récupérés`);
      return channels;

    } catch (error) {
      console.error('[TeamsService] ❌ Erreur liste canaux:', error);
      throw this.handleError(error, 'Impossible de lister les canaux');
    }
  }

  /**
   * Récupère les messages d'un canal
   */
  async getChannelMessages(teamId: string, channelId: string, limit: number = 50): Promise<TeamsMessage[]> {
    try {
      console.log(`[TeamsService] Récupération messages canal ${channelId}...`);

      const url = `${this.GRAPH_ENDPOINT}/teams/${teamId}/channels/${channelId}/messages?$top=${limit}`;

      const response = await this.sendGraphRequest(url, { method: 'GET' });
      const data = JSON.parse(response);

      const messages: TeamsMessage[] = (data.value || []).map((msg: any) => ({
        id: msg.id,
        body: msg.body?.content || '',
        bodyType: msg.body?.contentType === 'html' ? 'html' : 'text',
        from: {
          displayName: msg.from?.user?.displayName || 'Unknown',
          email: msg.from?.user?.userPrincipalName || msg.from?.user?.email || '',
          userId: msg.from?.user?.id || undefined,
        },
        createdDateTime: new Date(msg.createdDateTime),
        attachments: msg.attachments || [],
      }));

      console.log(`[TeamsService] ✅ ${messages.length} messages récupérés`);
      return messages;

    } catch (error) {
      console.error('[TeamsService] ❌ Erreur récupération messages canal:', error);
      throw this.handleError(error, 'Impossible de récupérer les messages du canal');
    }
  }

  /**
   * Envoie une requête Graph API avec retry automatique sur 503/504
   */
  private async sendGraphRequest(url: string, options: { method: string; body?: string }): Promise<string> {
    // TEMPORAIRE: Proxy Graph API timeout - utiliser fetch direct
    // TODO Session 29: Fixer content-script proxy timeout
    console.log('[TeamsService] 🌐 Fetch direct avec token + retry');
    const token = await this.authService.getToken('graph');

    const response = await fetchWithRetry(url, {
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
        if (event.data.type === 'CARTAE_GRAPH_RESPONSE' && event.data.requestId === requestId) {
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
        type: 'CARTAE_GRAPH_REQUEST',
        requestId: requestId,
        url: url,
        method: options.method,
        headers: {},
        body: options.body
      }, '*');
    });
  }

  /**
   * Envoie une requête Graph API et retourne une réponse binaire (ArrayBuffer)
   */
  private async sendGraphRequestBinary(url: string): Promise<ArrayBuffer | null> {
    try {
      // Vérifier si extension Firefox avec proxy CORS est disponible
      if (typeof (window as any).cartaeBrowserStorage !== 'undefined') {
        console.log('[TeamsService] 🌐 Utilisation proxy extension pour binaire (évite CORS)');
        // Pour le binaire, on utilise fetch direct car le proxy renvoie du texte
        // On va passer par l'extension mais différemment
      }

      // Fetch direct avec token
      const token = await this.authService.getToken('graph');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Pas de photo
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return arrayBuffer;

    } catch (error) {
      console.log('[TeamsService] Photo non disponible:', error);
      return null;
    }
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
