/**
 * CartaeMetadata - Métadonnées enrichies pour CartaeItem
 *
 * Contient les informations contextuelles, l'enrichissement AI,
 * et les champs extensibles spécifiques à chaque type d'item.
 *
 * @module types/CartaeMetadata
 */
/**
 * Niveaux de priorité standards
 */
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
/**
 * Statuts standards (extensible selon les besoins)
 */
export type ItemStatus = 'new' | 'in_progress' | 'pending' | 'completed' | 'cancelled' | 'blocked';
/**
 * AI Insights - Enrichissements générés par l'intelligence artificielle
 */
export interface AIInsights {
    /**
     * Analyse du sentiment (-1 à 1)
     * -1 = très négatif, 0 = neutre, 1 = très positif
     */
    sentiment?: number;
    /**
     * Score de priorité calculé par l'AI (0 à 1)
     * 0 = pas prioritaire, 1 = très prioritaire
     */
    priorityScore?: number;
    /**
     * Tags suggérés automatiquement par l'AI
     * @example ["urgent", "budget", "client-satisfaction"]
     */
    suggestedTags?: string[];
    /**
     * Connexions détectées avec d'autres CartaeItems (IDs)
     * @example ["uuid-123", "uuid-456"]
     */
    connections?: string[];
    /**
     * Niveau de confiance de l'AI (0 à 1)
     * Permet au user de savoir si l'enrichissement est fiable
     * @example 0.95 = haute confiance, 0.3 = faible confiance
     */
    confidence?: number;
    /**
     * Résumé généré automatiquement (optionnel)
     */
    summary?: string;
    /**
     * Entités détectées (personnes, lieux, organisations)
     * @example { "persons": ["John Doe"], "orgs": ["Acme Corp"] }
     */
    entities?: {
        persons?: string[];
        organizations?: string[];
        locations?: string[];
        dates?: string[];
    };
    /**
     * Thèmes/Topics détectés
     * @example ["budget-planning", "customer-feedback", "technical-debt"]
     */
    topics?: string[];
    /**
     * Date de la dernière analyse AI
     */
    lastAnalyzedAt?: Date;
}
/**
 * Métadonnées d'un CartaeItem
 *
 * Structure extensible permettant de stocker des informations
 * contextuelles riches pour chaque item.
 */
export interface CartaeMetadata {
    /**
     * Auteur principal de l'item
     * @example "john.doe@company.com" | "John Doe"
     */
    author?: string;
    /**
     * Participants/collaborateurs impliqués
     * @example ["alice@company.com", "bob@company.com"]
     */
    participants?: string[];
    /**
     * Priorité définie par l'utilisateur
     */
    priority?: PriorityLevel;
    /**
     * Statut de l'item
     */
    status?: ItemStatus;
    /**
     * Date d'échéance (pour tasks, events)
     */
    dueDate?: Date;
    /**
     * Date de début (pour events, tasks)
     */
    startDate?: Date;
    /**
     * Date de fin (pour events, tasks)
     */
    endDate?: Date;
    /**
     * Lieu (pour events)
     * @example "Salle de réunion A", "Paris, France"
     */
    location?: string;
    /**
     * Durée estimée en minutes (pour tasks, events)
     * @example 60 = 1 heure, 30 = 30 minutes
     */
    duration?: number;
    /**
     * Progression (0 à 100%) (pour tasks)
     * @example 0 = pas commencé, 50 = à moitié, 100 = terminé
     */
    progress?: number;
    /**
     * Enrichissements AI (optionnel)
     */
    aiInsights?: AIInsights;
    /**
     * Champs personnalisés extensibles
     * Permet aux connectors d'ajouter des métadonnées spécifiques
     *
     * @example
     * {
     *   "office365": {
     *     "conversationId": "AAQkAGI...",
     *     "importance": "high"
     *   },
     *   "slack": {
     *     "channelId": "C12345",
     *     "threadTs": "1234567890.123456"
     *   }
     * }
     */
    [key: string]: unknown;
}
/**
 * Type guard pour vérifier si un objet est un AIInsights valide
 */
export declare function isAIInsights(obj: unknown): obj is AIInsights;
/**
 * Type guard pour vérifier si un objet est un CartaeMetadata valide
 */
export declare function isCartaeMetadata(obj: unknown): obj is CartaeMetadata;
//# sourceMappingURL=CartaeMetadata.d.ts.map