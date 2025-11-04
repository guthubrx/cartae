/**
 * TeamsService
 * Service pour récupérer les messages Teams via l'API Microsoft Graph
 */

import { Office365AuthService } from './Office365AuthService';
import { Office365Chat } from '../types/office365.types';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const TEAMS_CHATS_ENDPOINT = '/me/chats';
const TEAMS_MESSAGES_ENDPOINT = (chatId: string) => `/me/chats/${chatId}/messages`;

export class TeamsService {
  constructor(private authService: Office365AuthService) {}

  /**
   * Récupère les messages Teams récents
   */
  async getRecentMessages(limit: number = 50): Promise<Office365Chat[]> {
    try {
      const token = await this.authService.getToken();

      // Récupérer les chats
      const chatsUrl = `${GRAPH_BASE_URL}${TEAMS_CHATS_ENDPOINT}?$top=20`;
      const chatsResponse = await fetch(chatsUrl, {
        headers: this.buildHeaders(token),
      });

      if (!chatsResponse.ok) {
        throw new Error(`Teams API error (chats): ${chatsResponse.status}`);
      }

      const chatsData = await chatsResponse.json();
      const chats = chatsData.value || [];

      // Récupérer les messages pour chaque chat (limiter à 5 premiers chats)
      const chatLimit = Math.min(chats.length, 5);
      const messagesPromises = chats.slice(0, chatLimit).map((chat: any) =>
        this.getChatMessages(chat.id, token, Math.ceil(limit / chatLimit))
      );

      const allChatsWithMessages = await Promise.all(messagesPromises);

      return allChatsWithMessages.filter(Boolean) as Office365Chat[];
    } catch (error) {
      console.error('[TeamsService] Error fetching recent messages:', error);
      return [];
    }
  }

  /**
   * Recherche des messages Teams (filtre côté client)
   */
  async searchMessages(query: string): Promise<Office365Chat[]> {
    try {
      // Récupérer tous les messages récents
      const allChats = await this.getRecentMessages(100);

      // Filtrer côté client
      const queryLower = query.toLowerCase();

      return allChats
        .map((chat) => ({
          ...chat,
          messages: chat.messages.filter((msg: any) =>
            msg.body.toLowerCase().includes(queryLower)
          ),
        }))
        .filter((chat) => chat.messages.length > 0);
    } catch (error) {
      console.error('[TeamsService] Error searching messages:', error);
      return [];
    }
  }

  /**
   * Récupère un chat par son ID
   */
  async getChatById(id: string): Promise<Office365Chat | null> {
    try {
      const token = await this.authService.getToken();
      return await this.getChatMessages(id, token, 50);
    } catch (error) {
      console.error('[TeamsService] Error fetching chat by ID:', error);
      return null;
    }
  }

  /**
   * Récupère les messages d'un chat spécifique
   */
  private async getChatMessages(
    chatId: string,
    token: string,
    limit: number
  ): Promise<Office365Chat | null> {
    try {
      const messagesUrl =
        `${GRAPH_BASE_URL}${TEAMS_MESSAGES_ENDPOINT(chatId)}?` +
        `$top=${Math.min(limit, 50)}&$orderby=createdDateTime desc`;

      const response = await fetch(messagesUrl, {
        headers: this.buildHeaders(token),
      });

      if (!response.ok) {
        throw new Error(`Teams API error (messages): ${response.status}`);
      }

      const data = await response.json();
      const messages = data.value || [];

      return {
        id: chatId,
        topic: '', // Teams chats n'ont pas toujours un topic
        messages: messages.map((msg: any) => ({
          id: msg.id,
          body: msg.body?.content || '',
          from: {
            user: {
              displayName: msg.from?.user?.displayName || 'Unknown',
              email: msg.from?.user?.userPrincipalName || '',
            },
          },
          createdDateTime: msg.createdDateTime || new Date().toISOString(),
        })),
      };
    } catch (error) {
      console.error('[TeamsService] Error getting chat messages:', error);
      return null;
    }
  }

  /**
   * Construit les headers d'authentification
   */
  private buildHeaders(token: string): HeadersInit {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }
}
