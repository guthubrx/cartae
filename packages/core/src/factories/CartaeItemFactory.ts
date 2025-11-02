/**
 * CartaeItemFactory - Helpers pour créer des CartaeItems
 *
 * Fournit des fonctions utilitaires pour créer facilement
 * des CartaeItems valides avec valeurs par défaut intelligentes.
 *
 * @module factories/CartaeItemFactory
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  CartaeItem,
  CartaeItemType,
  CartaeMetadata,
  CartaeSource,
  CartaeRelationship,
} from '../types';
import { validateCartaeItem } from '../schemas';

/**
 * Options pour créer un CartaeItem
 */
export interface CreateCartaeItemOptions {
  /** Type de l'item */
  type: CartaeItemType;

  /** Titre de l'item */
  title: string;

  /** Contenu textuel (optionnel) */
  content?: string;

  /** Connector source */
  connector: string;

  /** ID original dans le système source */
  originalId: string;

  /** URL vers la ressource originale (optionnel) */
  sourceUrl?: string;

  /** Métadonnées additionnelles */
  metadata?: Partial<CartaeMetadata>;

  /** Tags */
  tags?: string[];

  /** Catégories hiérarchiques */
  categories?: string[];

  /** Relations avec d'autres items */
  relationships?: CartaeRelationship[];

  /** JSON-LD context (optionnel) */
  jsonLdContext?: string | string[] | Record<string, unknown>;

  /** JSON-LD type (optionnel) */
  jsonLdType?: string | string[];

  /** Item archivé ? */
  archived?: boolean;

  /** Item favori ? */
  favorite?: boolean;

  /** Métadonnées source spécifiques au connector */
  sourceMetadata?: Record<string, unknown>;
}

/**
 * Crée un nouveau CartaeItem avec valeurs par défaut
 *
 * @param options - Options de création
 * @returns CartaeItem nouvellement créé
 *
 * @example
 * const item = createCartaeItem({
 *   type: 'email',
 *   title: 'Important meeting follow-up',
 *   content: 'Email body here...',
 *   connector: 'office365',
 *   originalId: 'AAMkAGI2...',
 *   tags: ['urgent', 'meeting'],
 *   metadata: {
 *     author: 'john@company.com',
 *     priority: 'high'
 *   }
 * });
 */
export function createCartaeItem(options: CreateCartaeItemOptions): CartaeItem {
  const now = new Date();

  const item: CartaeItem = {
    id: uuidv4(),
    type: options.type,
    title: options.title,
    content: options.content,
    '@context': options.jsonLdContext,
    '@type': options.jsonLdType,
    metadata: {
      ...options.metadata,
    },
    relationships: options.relationships,
    tags: options.tags || [],
    categories: options.categories,
    source: {
      connector: options.connector,
      originalId: options.originalId,
      url: options.sourceUrl,
      lastSync: now,
      metadata: options.sourceMetadata,
    },
    createdAt: now,
    updatedAt: now,
    archived: options.archived || false,
    favorite: options.favorite || false,
  };

  return item;
}

/**
 * Crée un CartaeItem et valide qu'il respecte le schema
 *
 * @param options - Options de création
 * @returns CartaeItem validé
 * @throws Error si la validation échoue
 *
 * @example
 * try {
 *   const item = createValidatedCartaeItem({ ... });
 *   // Item garanti valide
 * } catch (error) {
 *   console.error('Invalid item:', error);
 * }
 */
export function createValidatedCartaeItem(options: CreateCartaeItemOptions): CartaeItem {
  const item = createCartaeItem(options);
  const result = validateCartaeItem(item);

  if (!result.success) {
    throw new Error(`Invalid CartaeItem: ${JSON.stringify(result.error.errors, null, 2)}`);
  }

  return result.data as CartaeItem;
}

/**
 * Crée un CartaeItem de type email
 *
 * @param options - Options spécifiques email
 * @returns CartaeItem email
 */
export function createEmailItem(
  options: Omit<CreateCartaeItemOptions, 'type'> & {
    from?: string;
    to?: string[];
    cc?: string[];
    subject?: string;
  }
): CartaeItem {
  const { from, to, cc, subject, ...baseOptions } = options;

  return createCartaeItem({
    ...baseOptions,
    type: 'email',
    jsonLdContext: 'https://www.w3.org/ns/activitystreams',
    jsonLdType: 'EmailMessage',
    metadata: {
      ...baseOptions.metadata,
      author: from || baseOptions.metadata?.author,
      participants: to || baseOptions.metadata?.participants,
    },
  });
}

/**
 * Crée un CartaeItem de type task
 *
 * @param options - Options spécifiques task
 * @returns CartaeItem task
 */
export function createTaskItem(
  options: Omit<CreateCartaeItemOptions, 'type'> & {
    status?: 'new' | 'in_progress' | 'completed';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: Date;
    assignee?: string;
  }
): CartaeItem {
  const { status, priority, dueDate, assignee, ...baseOptions } = options;

  return createCartaeItem({
    ...baseOptions,
    type: 'task',
    jsonLdContext: 'https://www.w3.org/ns/activitystreams',
    jsonLdType: 'Task',
    metadata: {
      ...baseOptions.metadata,
      status: status || 'new',
      priority: priority || 'medium',
      dueDate,
      author: assignee || baseOptions.metadata?.author,
    },
  });
}

/**
 * Crée un CartaeItem de type document
 *
 * @param options - Options spécifiques document
 * @returns CartaeItem document
 */
export function createDocumentItem(
  options: Omit<CreateCartaeItemOptions, 'type'> & {
    fileType?: string;
    fileSize?: number;
  }
): CartaeItem {
  const { fileType, fileSize, ...baseOptions } = options;

  return createCartaeItem({
    ...baseOptions,
    type: 'document',
    jsonLdContext: 'https://www.w3.org/ns/activitystreams',
    jsonLdType: 'Document',
    metadata: {
      ...baseOptions.metadata,
      // Stockage champs custom dans metadata extensible
      ...(fileType && { fileType }),
      ...(fileSize && { fileSize }),
    },
  });
}

/**
 * Crée un CartaeItem de type message (chat/teams)
 *
 * @param options - Options spécifiques message
 * @returns CartaeItem message
 */
export function createMessageItem(
  options: Omit<CreateCartaeItemOptions, 'type'> & {
    from?: string;
    channelId?: string;
    threadId?: string;
  }
): CartaeItem {
  const { from, channelId, threadId, ...baseOptions } = options;

  return createCartaeItem({
    ...baseOptions,
    type: 'message',
    jsonLdContext: 'https://www.w3.org/ns/activitystreams',
    jsonLdType: 'ChatMessage',
    metadata: {
      ...baseOptions.metadata,
      author: from || baseOptions.metadata?.author,
      // Champs custom pour chat
      ...(channelId && { channelId }),
      ...(threadId && { threadId }),
    },
  });
}

/**
 * Crée un CartaeItem de type event (calendar)
 *
 * @param options - Options spécifiques event
 * @returns CartaeItem event
 */
export function createEventItem(
  options: Omit<CreateCartaeItemOptions, 'type'> & {
    startDate?: Date;
    endDate?: Date;
    location?: string;
    attendees?: string[];
  }
): CartaeItem {
  const { startDate, endDate, location, attendees, ...baseOptions } = options;

  return createCartaeItem({
    ...baseOptions,
    type: 'event',
    jsonLdContext: 'https://www.w3.org/ns/activitystreams',
    jsonLdType: 'Event',
    metadata: {
      ...baseOptions.metadata,
      startDate,
      endDate,
      location,
      participants: attendees || baseOptions.metadata?.participants,
    },
  });
}

/**
 * Clone un CartaeItem existant avec nouvelles valeurs
 *
 * @param item - Item à cloner
 * @param updates - Champs à mettre à jour
 * @returns Nouveau CartaeItem cloné
 */
export function cloneCartaeItem(item: CartaeItem, updates?: Partial<CartaeItem>): CartaeItem {
  return {
    ...item,
    ...updates,
    id: updates?.id || uuidv4(), // Nouvel ID par défaut
    updatedAt: new Date(),
  };
}

/**
 * Vérifie si un CartaeItem est valide selon le schema Zod
 *
 * @param item - Item à vérifier
 * @returns true si valide, false sinon
 */
export function isValidCartaeItem(item: unknown): item is CartaeItem {
  const result = validateCartaeItem(item);
  return result.success;
}
