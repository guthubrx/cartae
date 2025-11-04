/**
 * TeamsTransformer
 * Transforme les messages Teams en CartaeItems
 */

import { CartaeItem } from '@cartae/core';
import { BaseTransformer } from './BaseTransformer';
import { Office365Chat, Office365Message } from '../types/office365.types';

export class TeamsTransformer extends BaseTransformer {
  protected getItemType() {
    return 'message' as const;
  }

  protected getConnector() {
    return 'office365';
  }

  /**
   * Transforme un message Teams en CartaeItem
   */
  static toCartaeItem(chat: Office365Chat, message: Office365Message): CartaeItem {
    const transformer = new TeamsTransformer();
    return transformer.transform(chat, message);
  }

  /**
   * Transforme tous les messages d'un chat
   */
  static chatToCartaeItems(chat: Office365Chat): CartaeItem[] {
    return chat.messages.map((message) => TeamsTransformer.toCartaeItem(chat, message));
  }

  /**
   * Transforme plusieurs chats avec tous leurs messages
   */
  static chatsToCartaeItems(chats: Office365Chat[]): CartaeItem[] {
    return chats.flatMap((chat) => TeamsTransformer.chatToCartaeItems(chat));
  }

  /**
   * Transforme un message individuel
   */
  private transform(chat: Office365Chat, message: Office365Message): CartaeItem {
    // Créer un titre à partir du message
    const title = this.extractMessageTitle(message);

    // Créer l'item de base
    const item = this.createBaseCartaeItem(
      'message',
      title,
      message.id,
      `https://teams.microsoft.com/l/message/${chat.id}/${message.id}`
    );

    // Ajouter le contenu du message
    item.content = this.cleanContent(message.body, 500);

    // Ajouter l'auteur
    this.addAuthor(
      item,
      message.from?.user?.displayName,
      message.from?.user?.email
    );

    // Ajouter la date de création
    this.addCreatedDate(item, message.createdDateTime);

    // Ajouter les métadonnées
    item.metadata.status = 'new';
    item.metadata.priority = this.extractMessagePriority(message);

    // Ajouter les tags
    item.tags = this.generateMessageTags(message, chat);

    // Ajouter les métadonnées spécifiques Office365
    item.metadata.office365 = {
      messageId: message.id,
      chatId: chat.id,
      chatTopic: chat.topic || 'Unnamed Chat',
    };

    // JSON-LD pour compatibilité W3C
    item['@context'] = 'https://www.w3.org/ns/activitystreams';
    item['@type'] = 'ChatMessage';

    return item;
  }

  /**
   * Extrait un titre pertinent d'un message Teams
   */
  private extractMessageTitle(message: Office365Message): string {
    const content = message.body || '';

    // Prendre les 100 premiers caractères comme titre
    const firstLine = content.split('\n')[0];
    if (firstLine && firstLine.length > 5) {
      return firstLine.substring(0, 100).trim();
    }

    // Sinon, utiliser le nom de l'auteur + "sent a message"
    const authorName = message.from?.user?.displayName || 'Someone';
    return `${authorName} sent a message`;
  }

  /**
   * Extrait la priorité d'un message Teams
   */
  private extractMessagePriority(message: Office365Message): 'low' | 'medium' | 'high' | 'urgent' {
    const contentLower = (message.body || '').toLowerCase();

    // Détecte les mots-clés d'urgence
    if (
      contentLower.includes('@everyone') ||
      contentLower.includes('@channel') ||
      contentLower.includes('urgent') ||
      contentLower.includes('asap') ||
      contentLower.includes('critical')
    ) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Génère les tags pour un message Teams
   */
  private generateMessageTags(message: Office365Message, chat: Office365Chat): string[] {
    const tags = this.generateDefaultTags('message');

    // Tags basés sur les mentions
    const contentLower = (message.body || '').toLowerCase();

    if (contentLower.includes('@everyone')) {
      tags.push('#all-hands');
    }

    if (contentLower.includes('@channel')) {
      tags.push('#channel-announcement');
    }

    // Tags pour les discussions importantes
    if (
      contentLower.includes('urgent') ||
      contentLower.includes('critical') ||
      contentLower.includes('important')
    ) {
      tags.push('#urgent');
    }

    // Tags pour les demandes d'action
    if (
      contentLower.includes('please') ||
      contentLower.includes('can you') ||
      contentLower.includes('need') ||
      contentLower.includes('help')
    ) {
      tags.push('#action-required');
    }

    // Tags pour les mises à jour
    if (
      contentLower.includes('update') ||
      contentLower.includes('fyi') ||
      contentLower.includes('heads up')
    ) {
      tags.push('#informational');
    }

    // Tags pour les liens/ressources
    if (message.body?.includes('http')) {
      tags.push('#has-links');
    }

    // Deduplicates tags
    return Array.from(new Set(tags));
  }
}
