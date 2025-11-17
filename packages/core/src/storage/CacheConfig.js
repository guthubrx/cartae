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
export const DEFAULT_CACHE_CONFIG = {
    // ========================================================================
    // Limites Globales
    // ========================================================================
    maxItems: 500, // Gmail ~500 emails
    maxSizeMB: 150, // Gmail ~150 MB
    maxAgeDays: 30, // Notion ~30 jours
    // ========================================================================
    // Quotas par Type (pourcentages de maxItems/maxSizeMB)
    // ========================================================================
    quotas: {
        // Emails : 60% (usage principal attendu)
        email: {
            maxItems: 300, // 60% de 500
            maxSizeMB: 90, // 60% de 150 MB
        },
        // Tasks : 20% (usage moyen)
        task: {
            maxItems: 100, // 20% de 500
            maxSizeMB: 30, // 20% de 150 MB
        },
        // Notes : 16% (usage moyen-faible)
        note: {
            maxItems: 80, // 16% de 500
            maxSizeMB: 24, // 16% de 150 MB
        },
        // Events : 4% (usage faible)
        event: {
            maxItems: 20, // 4% de 500
            maxSizeMB: 6, // 4% de 150 MB
        },
        // Other : Aucun quota (items rares)
        other: {
            maxItems: 0, // Pas de limite spécifique
            maxSizeMB: 0, // Utilise l'espace restant
        },
    },
    // ========================================================================
    // Politique de Nettoyage
    // ========================================================================
    pruneStrategy: 'LRU', // Least Recently Used (défaut)
    pruneInterval: 24 * 60 * 60 * 1000, // 24 heures en ms
    pruneThreshold: 0.9, // Déclencher à 90% de capacité
    // ========================================================================
    // Chargement Initial
    // ========================================================================
    initialLoadStrategy: 'smart', // Charger intelligemment (hot data)
    initialLoadMaxItems: 100, // Max 100 items au démarrage
    // ========================================================================
    // Options Avancées
    // ========================================================================
    autoPruneEnabled: true, // Pruning automatique activé
    verbose: false, // Logs désactivés par défaut
};
/**
 * Configuration minimale (mode économie)
 */
export const MINIMAL_CACHE_CONFIG = {
    maxItems: 100,
    maxSizeMB: 30,
    maxAgeDays: 7,
    quotas: {
        email: { maxItems: 60, maxSizeMB: 18 },
        task: { maxItems: 20, maxSizeMB: 6 },
        note: { maxItems: 15, maxSizeMB: 4 },
        event: { maxItems: 5, maxSizeMB: 2 },
        other: { maxItems: 0, maxSizeMB: 0 },
    },
    pruneStrategy: 'LRU',
    pruneInterval: 12 * 60 * 60 * 1000, // 12h
    pruneThreshold: 0.85, // Plus agressif (85%)
    initialLoadStrategy: 'minimal',
    initialLoadMaxItems: 20,
    autoPruneEnabled: true,
    verbose: false,
};
/**
 * Configuration généreuse (mode performance)
 */
export const GENEROUS_CACHE_CONFIG = {
    maxItems: 1000,
    maxSizeMB: 300,
    maxAgeDays: 60,
    quotas: {
        email: { maxItems: 600, maxSizeMB: 180 },
        task: { maxItems: 200, maxSizeMB: 60 },
        note: { maxItems: 160, maxSizeMB: 48 },
        event: { maxItems: 40, maxSizeMB: 12 },
        other: { maxItems: 0, maxSizeMB: 0 },
    },
    pruneStrategy: 'priority', // Utilise scoring priorité
    pruneInterval: 48 * 60 * 60 * 1000, // 48h
    pruneThreshold: 0.95, // Plus permissif (95%)
    initialLoadStrategy: 'all',
    initialLoadMaxItems: 500,
    autoPruneEnabled: true,
    verbose: false,
};
/**
 * Helper : Calculer taille estimée d'un item (en MB)
 */
export function estimateItemSizeMB(item) {
    // Estimation grossière basée sur JSON.stringify
    const json = JSON.stringify(item);
    const bytes = new Blob([json]).size;
    return bytes / (1024 * 1024); // Convert to MB
}
/**
 * Helper : Extraire le type d'un CartaeItem
 */
export function getItemType(item) {
    const type = item.type?.toLowerCase() || 'other';
    if (['email', 'message'].includes(type))
        return 'email';
    if (['task', 'todo'].includes(type))
        return 'task';
    if (['note', 'document'].includes(type))
        return 'note';
    if (['event', 'calendar'].includes(type))
        return 'event';
    return 'other';
}
/**
 * Helper : Valider une configuration de cache
 */
export function validateCacheConfig(config) {
    const errors = [];
    // Limites globales
    if (config.maxItems <= 0) {
        errors.push('maxItems must be > 0');
    }
    if (config.maxSizeMB <= 0) {
        errors.push('maxSizeMB must be > 0');
    }
    if (config.maxAgeDays <= 0) {
        errors.push('maxAgeDays must be > 0');
    }
    // Quotas par type
    const totalQuotaItems = Object.values(config.quotas)
        .filter((q) => q.maxItems > 0)
        .reduce((sum, q) => sum + q.maxItems, 0);
    if (totalQuotaItems > config.maxItems) {
        errors.push(`Sum of quota maxItems (${totalQuotaItems}) exceeds global maxItems (${config.maxItems})`);
    }
    const totalQuotaSizeMB = Object.values(config.quotas)
        .filter((q) => q.maxSizeMB > 0)
        .reduce((sum, q) => sum + q.maxSizeMB, 0);
    if (totalQuotaSizeMB > config.maxSizeMB) {
        errors.push(`Sum of quota maxSizeMB (${totalQuotaSizeMB}) exceeds global maxSizeMB (${config.maxSizeMB})`);
    }
    // Pruning
    if (config.pruneThreshold < 0 || config.pruneThreshold > 1) {
        errors.push('pruneThreshold must be between 0 and 1');
    }
    if (config.pruneInterval <= 0) {
        errors.push('pruneInterval must be > 0');
    }
    // Initial load
    if (config.initialLoadMaxItems < 0) {
        errors.push('initialLoadMaxItems must be >= 0');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=CacheConfig.js.map