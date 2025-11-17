/**
 * CacheManager - Gestion du cache avec politique LRU
 *
 * Responsabilités :
 * - Politique LRU (Least Recently Used)
 * - Quotas par type d'item
 * - Pruning automatique
 * - Tracking métriques usage
 *
 * @module storage/CacheManager
 */
import type { CartaeItem } from '../types';
import type { CacheConfig, ItemType } from './CacheConfig';
/**
 * Métadonnées de cache pour un item
 */
export interface CacheItemMetadata {
    /** ID de l'item */
    id: string;
    /** Type d'item */
    type: ItemType;
    /** Taille estimée en MB */
    sizeMB: number;
    /** Timestamp dernier accès */
    lastAccessedAt: number;
    /** Timestamp de création dans le cache */
    cachedAt: number;
    /** Nombre d'accès */
    accessCount: number;
}
/**
 * Statistiques du cache
 */
export interface CacheStats {
    /** Nombre total d'items */
    totalItems: number;
    /** Taille totale en MB */
    totalSizeMB: number;
    /** Utilisation (0-1) */
    utilization: number;
    /** Stats par type */
    byType: Record<ItemType, {
        count: number;
        sizeMB: number;
        quotaUsage: number;
    }>;
    /** Nombre de hits cache */
    hits: number;
    /** Nombre de misses cache */
    misses: number;
    /** Hit rate (0-1) */
    hitRate: number;
    /** Dernier pruning */
    lastPruneAt: number | null;
    /** Items évincés durant le dernier pruning */
    lastPruneEvicted: number;
}
/**
 * CacheManager - Gestion intelligente du cache
 */
export declare class CacheManager {
    private config;
    private metadata;
    private stats;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Vérifier si un item peut être ajouté au cache
     */
    canAdd(item: CartaeItem): boolean;
    /**
     * Enregistrer l'ajout d'un item au cache
     */
    add(item: CartaeItem): void;
    /**
     * Marquer un item comme accédé (update LRU)
     */
    touch(itemId: string): void;
    /**
     * Supprimer un item du cache
     */
    remove(itemId: string): void;
    /**
     * Obtenir les items à évincer selon politique LRU
     *
     * @param count Nombre d'items à évincer
     * @returns IDs des items à supprimer
     */
    getItemsToEvict(count: number): string[];
    /**
     * Nettoyer le cache selon la politique configurée
     *
     * @returns IDs des items évincés
     */
    prune(): Promise<string[]>;
    /**
     * Vérifier si pruning est nécessaire
     */
    shouldPrune(): boolean;
    /**
     * Obtenir statistiques du cache
     */
    getStats(): CacheStats;
    /**
     * Obtenir métadonnées d'un item
     */
    getMetadata(itemId: string): CacheItemMetadata | undefined;
    /**
     * Obtenir toutes les métadonnées
     */
    getAllMetadata(): CacheItemMetadata[];
    /**
     * Réinitialiser le cache
     */
    clear(): void;
    /**
     * Obtenir configuration actuelle
     */
    getConfig(): CacheConfig;
    /**
     * Mettre à jour configuration (validation incluse)
     */
    updateConfig(newConfig: Partial<CacheConfig>): void;
    /**
     * Initialiser statistiques
     */
    private initStats;
    /**
     * Mettre à jour utilisation et quotas
     */
    private updateUtilization;
}
//# sourceMappingURL=CacheManager.d.ts.map