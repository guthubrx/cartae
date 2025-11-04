/**
 * EmailTransformer - Transforme OwaEmail → CartaeItem
 *
 * Convertit les emails Office 365 (OWA REST API) en format universel CartaeItem.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CartaeItem, CartaeItemType } from '@cartae/core/types/CartaeItem';
import type { CartaeMetadata, PriorityLevel } from '@cartae/core/types/CartaeMetadata';
import type { OwaEmail } from '../services/OwaRestEmailService';

/**
 * Transforme un OwaEmail en CartaeItem
 *
 * @param email - Email OWA à transformer
 * @param options - Options de transformation (optionnel)
 * @returns CartaeItem formaté
 */
export function transformEmailToCartaeItem(
  email: OwaEmail,
  options?: {
    addDefaultTags?: boolean;
    extractPriority?: boolean;
  }
): CartaeItem {
  const now = new Date();

  // Extraction priorité depuis sujet/corps (simple heuristique)
  const priority = options?.extractPriority
    ? extractPriorityFromEmail(email)
    : undefined;

  // Tags par défaut
  const tags: string[] = options?.addDefaultTags
    ? ['email', 'office365']
    : [];

  // Tags auto depuis lecture/attachments
  if (!email.isRead) tags.push('unread');
  if (email.hasAttachments) tags.push('has-attachments');

  // Métadonnées
  const metadata: CartaeMetadata = {
    author: email.from.email,
    participants: email.to.map(t => t.email),
    priority,
    status: email.isRead ? 'completed' : 'new',

    // Champs extensibles Office365
    office365: {
      emailId: email.id,
      hasAttachments: email.hasAttachments,
      isRead: email.isRead,
      bodyType: email.bodyType,
      fromName: email.from.name,
      toRecipients: email.to.map(t => ({ name: t.name, email: t.email })),
    },
  };

  const cartaeItem: CartaeItem = {
    id: uuidv4(),
    type: 'email' as CartaeItemType,
    title: email.subject,
    content: email.body,

    metadata,
    tags,

    source: {
      connector: 'office365',
      originalId: email.id,
      url: `https://outlook.office.com/mail/inbox/id/${email.id}`,
      lastSync: now,
      metadata: {
        service: 'owa-rest-api',
        version: 'v2.0',
      },
    },

    createdAt: email.receivedDateTime,
    updatedAt: now,

    archived: false,
    favorite: false,
  };

  return cartaeItem;
}

/**
 * Extrait la priorité d'un email (heuristique simple)
 *
 * Détecte mots-clés urgents dans sujet/corps
 */
function extractPriorityFromEmail(email: OwaEmail): PriorityLevel {
  const text = `${email.subject} ${email.body}`.toLowerCase();

  // Urgence
  if (
    text.includes('urgent') ||
    text.includes('asap') ||
    text.includes('immédiat') ||
    text.includes('critique')
  ) {
    return 'urgent';
  }

  // Haute priorité
  if (
    text.includes('important') ||
    text.includes('prioritaire') ||
    text.includes('high priority')
  ) {
    return 'high';
  }

  // Par défaut
  return 'medium';
}

/**
 * Transforme un batch d'emails en CartaeItems
 *
 * @param emails - Liste d'emails à transformer
 * @param options - Options de transformation
 * @returns Liste de CartaeItems
 */
export function transformEmailsToCartaeItems(
  emails: OwaEmail[],
  options?: Parameters<typeof transformEmailToCartaeItem>[1]
): CartaeItem[] {
  return emails.map(email => transformEmailToCartaeItem(email, options));
}

/**
 * Type guard pour vérifier si un CartaeItem est un email Office365
 */
export function isOffice365Email(item: CartaeItem): boolean {
  return (
    item.type === 'email' &&
    item.source.connector === 'office365' &&
    typeof item.metadata.office365 === 'object'
  );
}
