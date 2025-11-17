/**
 * CacheConfig - Configuration des politiques de cache
 *
 * Inspiré des best practices de :
 * - Gmail Web (~500 emails, 50-150 MB)
 * - Notion (~100 pages, 50-200 MB)
 * - Slack Web (7 jours messages, 30-100 MB)
 *
 * @module storage/CacheConfig
 */
/**
 * Type d'item CartaeItem
 */
export type ItemType = 'email' | 'task' | 'note' | 'event' | 'other';
/**
 * Stratégie de chargement initial
 */
export type InitialLoadStrategy = 'all' | 'smart' | 'minimal';
/**
 * Stratégie de pruning (nettoyage)
 */
export type PruneStrategy = 'LRU' | 'priority' | 'age';
/**
 * Quotas par type d'item
 */
export interface TypeQuota {
    /** Nombre max d'items de ce type */
    maxItems: number;
    /** Taille max en MB pour ce type */
    maxSizeMB: number;
}
/**
 * Configuration complète du cache
 */
export interface CacheConfig {
    /** Nombre maximum d'items dans le cache */
    maxItems: number;
    /** Taille maximale du cache en MB */
    maxSizeMB: number;
    /** Âge maximum d'un item non accédé (en jours) */
    maxAgeDays: number;
    /** Quotas spécifiques par type d'item */
    quotas: Record<ItemType, TypeQuota>;
    /** Stratégie de nettoyage */
    pruneStrategy: PruneStrategy;
    /** Interval de pruning automatique (ms) */
    pruneInterval: number;
    /** Seuil de déclenchement du pruning (0.9 = 90% de capacité) */
    pruneThreshold: number;
    /** Stratégie de chargement au démarrage */
    initialLoadStrategy: InitialLoadStrategy;
    /** Nombre max d'items à charger initialement (si strategy = 'smart' ou 'minimal') */
    initialLoadMaxItems: number;
    /** Activer le pruning automatique ? */
    autoPruneEnabled: boolean;
    /** Activer les logs de cache ? */
    verbose: boolean;
}
/**
 * Configuration par défaut - Inspirée Gmail/Notion
 *
 * Benchmarks référence :
 * - Gmail Web : 50-150 MB, ~500 emails
 * - Notion : 50-200 MB, ~100 pages
 * - Spotify Web : 200-500 MB (images HD, pas audio)
 * - Slack Web : 30-100 MB, 7 jours messages
 *
 * Notre approche : Conservative mais efficace
 * - 150 MB max (milieu de gamme Gmail)
 * - 500 items max (Gmail baseline)
 * - 30 jours rétention (Notion)
 */
export declare const DEFAULT_CACHE_CONFIG: CacheConfig;
/**
 * Configuration minimale (mode économie)
 */
export declare const MINIMAL_CACHE_CONFIG: CacheConfig;
/**
 * Configuration généreuse (mode performance)
 */
export declare const GENEROUS_CACHE_CONFIG: CacheConfig;
/**
 * Helper : Calculer taille estimée d'un item (en MB)
 */
export declare function estimateItemSizeMB(item: any): number;
/**
 * Helper : Extraire le type d'un CartaeItem
 */
export declare function getItemType(item: any): ItemType;
/**
 * Helper : Valider une configuration de cache
 */
export declare function validateCacheConfig(config: CacheConfig): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=CacheConfig.d.ts.map