/**
 * EmailTransformer
 * Transforme les emails Office365 en CartaeItems
 */

import { CartaeItem } from '@cartae/core';
import { BaseTransformer } from './BaseTransformer';
import { Office365Email } from '../types/office365.types';

export class EmailTransformer extends BaseTransformer {
  protected getItemType() {
    return 'email' as const;
  }

  protected getConnector() {
    return 'office365';
  }

  /**
   * Transforme un email Office365 en CartaeItem
   */
  static toCartaeItem(email: Office365Email): CartaeItem {
    const transformer = new EmailTransformer();
    return transformer.transform(email);
  }

  /**
   * Transforme une liste d'emails
   */
  static toCartaeItems(emails: Office365Email[]): CartaeItem[] {
    return emails.map((email) => EmailTransformer.toCartaeItem(email));
  }

  /**
   * Transforme un email individuel
   */
  private transform(email: Office365Email): CartaeItem {
    // Créer l'item de base
    const item = this.createBaseCartaeItem(
      'email',
      email.subject || '(No Subject)',
      email.id,
      `https://outlook.office365.com/mail/inbox/${email.id}`
    );

    // Ajouter le contenu
    item.content = this.cleanContent(email.bodyPreview, 500);

    // Ajouter l'auteur
    this.addAuthor(item, email.from?.name, email.from?.email);

    // Ajouter la date de réception
    this.addCreatedDate(item, email.receivedDateTime);

    // Ajouter les métadonnées
    const priority = this.extractPriority(
      email.importance === 'high',
      email.flag?.flagStatus === 'flagged',
      false
    );
    item.metadata.priority = priority;
    item.metadata.status = email.isRead ? 'in_progress' : 'new';

    // Ajouter les tags en fonction du contenu
    item.tags = this.generateEmailTags(email);

    // Ajouter les métadonnées spécifiques Office365
    item.metadata.office365 = {
      messageId: email.id,
      importance: email.importance,
      hasAttachments: email.hasAttachments,
      isRead: email.isRead,
      flagStatus: email.flag?.flagStatus,
    };

    // JSON-LD pour compatibilité W3C
    item['@context'] = 'https://www.w3.org/ns/activitystreams';
    item['@type'] = 'EmailMessage';

    return item;
  }

  /**
   * Génère les tags pour un email
   */
  private generateEmailTags(email: Office365Email): string[] {
    const tags = this.generateDefaultTags('email');

    // Tags basés sur l'importance
    if (email.importance === 'high') {
      tags.push('#important');
    }

    // Tags basés sur le statut de lecture
    if (!email.isRead) {
      tags.push('#unread');
    }

    // Tags basés sur les pièces jointes
    if (email.hasAttachments) {
      tags.push('#attachments');
    }

    // Tags basés sur les drapeaux
    if (email.flag?.flagStatus === 'flagged') {
      tags.push('#flagged');
    }

    if (email.flag?.flagStatus === 'complete') {
      tags.push('#completed');
    }

    // Tags basés sur le contenu (keywords simples)
    const subjectLower = email.subject?.toLowerCase() || '';
    if (
      subjectLower.includes('urgent') ||
      subjectLower.includes('asap') ||
      subjectLower.includes('critical')
    ) {
      tags.push('#urgent');
    }

    if (
      subjectLower.includes('fyi') ||
      subjectLower.includes('info') ||
      subjectLower.includes('announcement')
    ) {
      tags.push('#informational');
    }

    if (subjectLower.includes('follow') || subjectLower.includes('action')) {
      tags.push('#action-required');
    }

    // Deduplicates tags
    return Array.from(new Set(tags));
  }
}
