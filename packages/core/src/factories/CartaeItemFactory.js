/**
 * CartaeItemFactory - Helpers pour créer des CartaeItems
 *
 * Fournit des fonctions utilitaires pour créer facilement
 * des CartaeItems valides avec valeurs par défaut intelligentes.
 *
 * @module factories/CartaeItemFactory
 */
import { v4 as uuidv4 } from 'uuid';
import { validateCartaeItem } from '../schemas';
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
export function createCartaeItem(options) {
    const now = new Date();
    const item = {
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
export function createValidatedCartaeItem(options) {
    const item = createCartaeItem(options);
    const result = validateCartaeItem(item);
    if (!result.success) {
        throw new Error(`Invalid CartaeItem: ${JSON.stringify(result.error.errors, null, 2)}`);
    }
    return result.data;
}
/**
 * Crée un CartaeItem de type email
 *
 * @param options - Options spécifiques email
 * @returns CartaeItem email
 */
export function createEmailItem(options) {
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
export function createTaskItem(options) {
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
export function createDocumentItem(options) {
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
export function createMessageItem(options) {
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
export function createEventItem(options) {
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
export function cloneCartaeItem(item, updates) {
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
export function isValidCartaeItem(item) {
    const result = validateCartaeItem(item);
    return result.success;
}
//# sourceMappingURL=CartaeItemFactory.js.map