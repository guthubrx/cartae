/**
 * SmartCache - Cache intelligent avec scoring de priorité
 *
 * Responsabilités :
 * - Calculer score de priorité par item
 * - Chargement sélectif initial (hot data)
 * - Eviction intelligente (low priority first)
 *
 * @module storage/SmartCache
 */
import type { CartaeItem } from '../types';
import type { CacheManager } from './CacheManager';
/**
 * Score de priorité d'un item (0-100+)
 */
export interface PriorityScore {
    /** ID de l'item */
    itemId: string;
    /** Score total (0-100+) */
    total: number;
    /** Breakdown du score */
    breakdown: {
        /** Points pour status (unread, starred, etc.) */
        status: number;
        /** Points pour âge (récent vs vieux) */
        age: number;
        /** Points pour dernier accès */
        lastAccess: number;
        /** Points pour type d'item */
        type: number;
    };
}
/**
 * Métadonnées étendues pour scoring
 */
export interface ItemMetadata {
    /** Statut non lu ? */
    unread?: boolean;
    /** Item marqué (starred) ? */
    starred?: boolean;
    /** Item archivé ? */
    archived?: boolean;
    /** Priorité manuelle (high, medium, low) */
    priority?: 'high' | 'medium' | 'low';
    /** Dernière fois accédé */
    lastAccessedAt?: number;
}
/**
 * SmartCache - Gestion intelligente de la priorité des items
 */
export declare class SmartCache {
    private cacheManager;
    private config;
    constructor(cacheManager: CacheManager);
    /**
     * Calculer le score de priorité d'un item
     *
     * Algorithme :
     * - Unread : +50 points
     * - Starred : +40 points
     * - Archived : -60 points
     * - Age : -2 points par jour
     * - Last access : +30 points si accédé aujourd'hui (décroit ensuite)
     * - Priority : high +20, medium +10, low 0
     */
    calculatePriority(item: CartaeItem): PriorityScore;
    /**
     * Calculer scores pour plusieurs items
     */
    calculatePriorities(items: CartaeItem[]): PriorityScore[];
    /**
     * Trier items par priorité (high → low)
     */
    sortByPriority(items: CartaeItem[]): CartaeItem[];
    /**
     * Sélectionner items à charger initialement selon stratégie
     *
     * @param allItems Tous les items disponibles
     * @returns Items à charger
     */
    selectInitialItems(allItems: CartaeItem[]): CartaeItem[];
    /**
     * Sélectionner items à évincer intelligemment
     *
     * Combine LRU avec scoring de priorité :
     * - Items avec score bas sont évincés en premier
     * - Parmi items avec score similaire, évince les LRU
     *
     * @param items Items candidats à l'éviction
     * @param count Nombre d'items à évincer
     * @returns IDs des items à supprimer
     */
    selectItemsToEvict(items: CartaeItem[], count: number): string[];
    /**
     * Identifier "hot data" (items chauds)
     *
     * Critères :
     * - Score de priorité > 50
     * - Accédé dans les 7 derniers jours
     */
    identifyHotData(items: CartaeItem[]): CartaeItem[];
    /**
     * Identifier "cold data" (items froids)
     *
     * Critères :
     * - Score de priorité < 20
     * - Pas accédé depuis 30+ jours
     */
    identifyColdData(items: CartaeItem[]): CartaeItem[];
    /**
     * Obtenir statistiques de priorité
     */
    getPriorityStats(items: CartaeItem[]): {
        avgScore: number;
        minScore: number;
        maxScore: number;
        hotCount: number;
        coldCount: number;
    };
}
//# sourceMappingURL=SmartCache.d.ts.map