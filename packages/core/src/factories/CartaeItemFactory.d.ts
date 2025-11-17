/**
 * CartaeItemFactory - Helpers pour créer des CartaeItems
 *
 * Fournit des fonctions utilitaires pour créer facilement
 * des CartaeItems valides avec valeurs par défaut intelligentes.
 *
 * @module factories/CartaeItemFactory
 */
import type { CartaeItem, CartaeItemType, CartaeMetadata, CartaeRelationship } from '../types';
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
export declare function createCartaeItem(options: CreateCartaeItemOptions): CartaeItem;
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
export declare function createValidatedCartaeItem(options: CreateCartaeItemOptions): CartaeItem;
/**
 * Crée un CartaeItem de type email
 *
 * @param options - Options spécifiques email
 * @returns CartaeItem email
 */
export declare function createEmailItem(options: Omit<CreateCartaeItemOptions, 'type'> & {
    from?: string;
    to?: string[];
    cc?: string[];
    subject?: string;
}): CartaeItem;
/**
 * Crée un CartaeItem de type task
 *
 * @param options - Options spécifiques task
 * @returns CartaeItem task
 */
export declare function createTaskItem(options: Omit<CreateCartaeItemOptions, 'type'> & {
    status?: 'new' | 'in_progress' | 'completed';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: Date;
    assignee?: string;
}): CartaeItem;
/**
 * Crée un CartaeItem de type document
 *
 * @param options - Options spécifiques document
 * @returns CartaeItem document
 */
export declare function createDocumentItem(options: Omit<CreateCartaeItemOptions, 'type'> & {
    fileType?: string;
    fileSize?: number;
}): CartaeItem;
/**
 * Crée un CartaeItem de type message (chat/teams)
 *
 * @param options - Options spécifiques message
 * @returns CartaeItem message
 */
export declare function createMessageItem(options: Omit<CreateCartaeItemOptions, 'type'> & {
    from?: string;
    channelId?: string;
    threadId?: string;
}): CartaeItem;
/**
 * Crée un CartaeItem de type event (calendar)
 *
 * @param options - Options spécifiques event
 * @returns CartaeItem event
 */
export declare function createEventItem(options: Omit<CreateCartaeItemOptions, 'type'> & {
    startDate?: Date;
    endDate?: Date;
    location?: string;
    attendees?: string[];
}): CartaeItem;
/**
 * Clone un CartaeItem existant avec nouvelles valeurs
 *
 * @param item - Item à cloner
 * @param updates - Champs à mettre à jour
 * @returns Nouveau CartaeItem cloné
 */
export declare function cloneCartaeItem(item: CartaeItem, updates?: Partial<CartaeItem>): CartaeItem;
/**
 * Vérifie si un CartaeItem est valide selon le schema Zod
 *
 * @param item - Item à vérifier
 * @returns true si valide, false sinon
 */
export declare function isValidCartaeItem(item: unknown): item is CartaeItem;
//# sourceMappingURL=CartaeItemFactory.d.ts.map