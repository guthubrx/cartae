/**
 * TeamsTransformer - Transforme Teams data → CartaeItem
 *
 * Convertit les conversations/messages Teams (Graph API) en format universel CartaeItem.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CartaeItem, CartaeItemType } from '@cartae/core/types/CartaeItem';
import type { CartaeMetadata } from '@cartae/core/types/CartaeMetadata';
import type { TeamsChat, TeamsMessage } from '../services/TeamsService';

/**
 * Transforme un TeamsChat (conversation) en CartaeItem
 *
 * @param chat - Conversation Teams à transformer
 * @param options - Options de transformation (optionnel)
 * @returns CartaeItem formaté
 */
export function transformChatToCartaeItem(
  chat: TeamsChat,
  options?: {
    addDefaultTags?: boolean;
  }
): CartaeItem {
  const now = new Date();

  // Tags par défaut
  const tags: string[] = options?.addDefaultTags
    ? ['teams', 'chat', 'office365']
    : [];

  // Tags auto depuis type conversation
  tags.push(chat.chatType); // 'oneOnOne' | 'group' | 'meeting'

  // Titre de la conversation (topic ou membres)
  const title = chat.topic ||
    `Chat avec ${chat.members.map(m => m.displayName).join(', ')}`;

  // Métadonnées
  const metadata: CartaeMetadata = {
    participants: chat.members.map(m => m.email),

    // Champs extensibles Teams
    teams: {
      chatId: chat.id,
      chatType: chat.chatType,
      topic: chat.topic,
      members: chat.members.map(m => ({
        displayName: m.displayName,
        email: m.email,
        userId: m.userId,
      })),
      lastMessagePreview: chat.lastMessagePreview,
      lastMessageDateTime: chat.lastMessageDateTime,
    },
  };

  const cartaeItem: CartaeItem = {
    id: uuidv4(),
    type: 'message' as CartaeItemType,
    title,
    content: chat.lastMessagePreview,

    metadata,
    tags,

    source: {
      connector: 'office365',
      originalId: chat.id,
      url: `https://teams.microsoft.com/_#/conversations/${chat.id}`,
      lastSync: now,
      metadata: {
        service: 'teams-graph-api',
        version: 'v1.0',
      },
    },

    createdAt: chat.lastMessageDateTime,
    updatedAt: now,

    archived: false,
    favorite: false,
  };

  return cartaeItem;
}

/**
 * Transforme un TeamsMessage en CartaeItem
 *
 * @param message - Message Teams à transformer
 * @param chatId - ID de la conversation parente
 * @param options - Options de transformation (optionnel)
 * @returns CartaeItem formaté
 */
export function transformMessageToCartaeItem(
  message: TeamsMessage,
  chatId: string,
  options?: {
    addDefaultTags?: boolean;
  }
): CartaeItem {
  const now = new Date();

  // Tags par défaut
  const tags: string[] = options?.addDefaultTags
    ? ['teams', 'message', 'office365']
    : [];

  // Tags auto depuis attachments
  if (message.attachments && message.attachments.length > 0) {
    tags.push('has-attachments');
  }

  // Métadonnées
  const metadata: CartaeMetadata = {
    author: message.from.email,

    // Champs extensibles Teams
    teams: {
      messageId: message.id,
      chatId: chatId,
      bodyType: message.bodyType,
      from: {
        displayName: message.from.displayName,
        email: message.from.email,
        userId: message.from.userId,
      },
      attachments: message.attachments,
    },
  };

  // Titre = début du message (50 premiers caractères)
  const title = message.body.length > 50
    ? `${message.body.substring(0, 50)}...`
    : message.body;

  const cartaeItem: CartaeItem = {
    id: uuidv4(),
    type: 'message' as CartaeItemType,
    title,
    content: message.body,

    metadata,
    tags,

    source: {
      connector: 'office365',
      originalId: message.id,
      url: `https://teams.microsoft.com/_#/conversations/${chatId}?messageId=${message.id}`,
      lastSync: now,
      metadata: {
        service: 'teams-graph-api',
        version: 'v1.0',
        chatId,
      },
    },

    createdAt: message.createdDateTime,
    updatedAt: now,

    archived: false,
    favorite: false,
  };

  return cartaeItem;
}

/**
 * Transforme un batch de conversations en CartaeItems
 */
export function transformChatsToCartaeItems(
  chats: TeamsChat[],
  options?: Parameters<typeof transformChatToCartaeItem>[1]
): CartaeItem[] {
  return chats.map(chat => transformChatToCartaeItem(chat, options));
}

/**
 * Transforme un batch de messages en CartaeItems
 */
export function transformMessagesToCartaeItems(
  messages: TeamsMessage[],
  chatId: string,
  options?: Parameters<typeof transformMessageToCartaeItem>[2]
): CartaeItem[] {
  return messages.map(message =>
    transformMessageToCartaeItem(message, chatId, options)
  );
}

/**
 * Type guard pour vérifier si un CartaeItem est une conversation Teams
 */
export function isTeamsChat(item: CartaeItem): boolean {
  return (
    item.type === 'message' &&
    item.source.connector === 'office365' &&
    typeof item.metadata.teams === 'object' &&
    'chatType' in (item.metadata.teams as any)
  );
}

/**
 * Type guard pour vérifier si un CartaeItem est un message Teams
 */
export function isTeamsMessage(item: CartaeItem): boolean {
  return (
    item.type === 'message' &&
    item.source.connector === 'office365' &&
    typeof item.metadata.teams === 'object' &&
    'messageId' in (item.metadata.teams as any)
  );
}
