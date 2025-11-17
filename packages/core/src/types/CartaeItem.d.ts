/**
 * CartaeItem - Format universel pour tous les items Cartae
 *
 * Ce format unifié permet de représenter n'importe quelle donnée provenant
 * de sources diverses (emails, tasks, documents, messages, events, notes)
 * de manière cohérente.
 *
 * Compatible JSON-LD pour interopérabilité W3C standards.
 *
 * @module types/CartaeItem
 */
import type { CartaeMetadata } from './CartaeMetadata';
import type { CartaeRelationship } from './CartaeRelationship';
/**
 * Types d'items supportés dans Cartae
 */
export type CartaeItemType = 'email' | 'task' | 'document' | 'message' | 'event' | 'note' | 'contact' | 'file';
/**
 * Source d'un CartaeItem (quel connector l'a créé)
 */
export interface CartaeSource {
    /**
     * Identifiant du connector source
     * @example "office365" | "gmail" | "slack" | "notion"
     */
    connector: string;
    /**
     * ID original dans le système source
     * @example "AAMkAGI2..." pour un email Office365
     */
    originalId: string;
    /**
     * URL vers la ressource originale (optionnel)
     * @example "https://outlook.office365.com/mail/..."
     */
    url?: string;
    /**
     * Timestamp de la dernière synchronisation
     */
    lastSync: Date;
    /**
     * Métadonnées spécifiques au connector (extensible)
     */
    metadata?: Record<string, unknown>;
}
/**
 * CartaeItem - Interface principale du format universel
 *
 * Tous les items dans Cartae (peu importe leur source) sont représentés
 * avec cette interface. Les champs spécifiques à une source sont stockés
 * dans `metadata`.
 */
export interface CartaeItem {
    /**
     * Identifiant unique de l'item (UUID v4)
     * Généré par Cartae, indépendant de l'ID source
     */
    id: string;
    /**
     * Type de l'item
     */
    type: CartaeItemType;
    /**
     * Titre court de l'item
     * @example "Réunion client A", "Specs technique projet X"
     */
    title: string;
    /**
     * Contenu textuel complet (optionnel)
     * Peut être un extrait, un résumé, ou le contenu complet selon le type
     */
    content?: string;
    /**
     * Contexte JSON-LD pour compatibilité W3C (optionnel)
     * @see https://www.w3.org/TR/json-ld/
     * @default "https://www.w3.org/ns/activitystreams"
     */
    '@context'?: string | string[] | Record<string, unknown>;
    /**
     * Type JSON-LD pour sémantique (optionnel)
     * @example "Note", "EmailMessage", "Task"
     * @see https://www.w3.org/TR/activitystreams-vocabulary/
     */
    '@type'?: string | string[];
    /**
     * Métadonnées enrichies de l'item
     */
    metadata: CartaeMetadata;
    /**
     * Relations avec d'autres CartaeItems (optionnel)
     */
    relationships?: CartaeRelationship[];
    /**
     * Tags utilisateur (folksonomy)
     * @example ["urgent", "client-a", "q1-2025"]
     */
    tags: string[];
    /**
     * Catégories hiérarchiques (taxonomy) (optionnel)
     * Compatible SKOS pour export standard
     * @example ["work/projects/client-a", "personal/learning"]
     */
    categories?: string[];
    /**
     * Informations sur la source de l'item
     */
    source: CartaeSource;
    /**
     * Date de création de l'item dans Cartae
     */
    createdAt: Date;
    /**
     * Date de dernière modification de l'item dans Cartae
     */
    updatedAt: Date;
    /**
     * Est-ce que l'item est archivé ?
     * @default false
     */
    archived?: boolean;
    /**
     * Est-ce que l'item est marqué comme favori ?
     * @default false
     */
    favorite?: boolean;
}
/**
 * Type guard pour vérifier si un objet est un CartaeItem valide
 *
 * @param obj - Objet à vérifier
 * @returns true si l'objet respecte la structure CartaeItem
 */
export declare function isCartaeItem(obj: unknown): obj is CartaeItem;
//# sourceMappingURL=CartaeItem.d.ts.map