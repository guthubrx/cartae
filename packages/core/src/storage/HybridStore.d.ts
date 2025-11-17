/**
 * HybridStore - Storage hybride IndexedDB + PostgreSQL
 *
 * Combine le meilleur des deux mondes:
 * - IndexedDB: Cache local ultra-rapide pour opérations CRUD
 * - PostgreSQL: Persistance centrale + recherche full-text/sémantique
 *
 * Sync bidirectionnel automatique entre les deux.
 *
 * @module storage/HybridStore
 */
import type { CartaeItem } from '../types';
import type { StorageAdapter, QueryOptions, StorageStats } from './StorageAdapter';
import type { DatabaseClient } from './DatabaseClient';
import { IndexedDBStore } from './IndexedDBStore';
import { CacheManager } from './CacheManager';
import { SmartCache } from './SmartCache';
import type { CacheConfig } from './CacheConfig';
/**
 * Configuration HybridStore
 */
export interface HybridStoreConfig {
    /** Client database-api */
    databaseClient: DatabaseClient;
    /** IndexedDB store (cache local) */
    indexedDBStore: IndexedDBStore;
    /** Sync automatique activé ? */
    autoSync?: boolean;
    /** Interval sync (ms) - défaut 60s */
    syncInterval?: number;
    /** Sync au démarrage ? */
    syncOnInit?: boolean;
    /** Configuration du cache (optionnelle) */
    cacheConfig?: Partial<CacheConfig>;
}
/**
 * Statistiques de sync
 */
export interface SyncStats {
    /** Dernière sync */
    lastSync: Date | null;
    /** Items pushés vers PostgreSQL */
    itemsPushed: number;
    /** Items pullés depuis PostgreSQL */
    itemsPulled: number;
    /** Erreurs de sync */
    errors: number;
    /** Sync en cours ? */
    isSyncing: boolean;
}
/**
 * HybridStore - Storage hybride avec sync bidirectionnel
 *
 * Architecture:
 * - Toutes les opérations CRUD → IndexedDB (rapide, local)
 * - Sync périodique: IndexedDB ↔ PostgreSQL
 * - Recherche avancée → PostgreSQL (full-text + sémantique)
 */
export declare class HybridStore implements StorageAdapter {
    private db;
    private client;
    private config;
    private syncTimer;
    private pruneTimer;
    private cacheManager;
    private smartCache;
    private syncStats;
    constructor(config: HybridStoreConfig);
    init(): Promise<void>;
    close(): Promise<void>;
    create(item: CartaeItem): Promise<CartaeItem>;
    createMany(items: CartaeItem[]): Promise<CartaeItem[]>;
    get(id: string): Promise<CartaeItem | null>;
    getMany(ids: string[]): Promise<CartaeItem[]>;
    getAll(): Promise<CartaeItem[]>;
    query(options: QueryOptions): Promise<CartaeItem[]>;
    update(id: string, updates: Partial<CartaeItem>): Promise<CartaeItem>;
    updateMany(updates: Array<{
        id: string;
        updates: Partial<CartaeItem>;
    }>): Promise<CartaeItem[]>;
    delete(id: string): Promise<void>;
    deleteMany(ids: string[]): Promise<void>;
    clear(): Promise<void>;
    getByTag(tag: string): Promise<CartaeItem[]>;
    getByConnector(connector: string): Promise<CartaeItem[]>;
    getByType(type: string): Promise<CartaeItem[]>;
    getByDateRange(start: Date, end: Date): Promise<CartaeItem[]>;
    /**
     * Full-text search via PostgreSQL
     *
     * Utilise l'index GIN sur title_tsv + content_tsv
     */
    searchFullText(query: string, limit?: number): Promise<CartaeItem[]>;
    /**
     * Semantic search via PostgreSQL + pgvector
     *
     * Requiert que les items aient des embeddings générés
     */
    searchSemantic(embedding: number[], limit?: number, minSimilarity?: number): Promise<CartaeItem[]>;
    /**
     * Hybrid search (text + semantic)
     */
    searchHybrid(text: string, embedding: number[], textWeight?: number, vectorWeight?: number, limit?: number): Promise<CartaeItem[]>;
    count(): Promise<number>;
    getStats(): Promise<StorageStats>;
    exists(id: string): Promise<boolean>;
    getVersion(): Promise<number>;
    migrate(targetVersion: number): Promise<void>;
    /**
     * Sync bidirectionnel IndexedDB ↔ PostgreSQL
     *
     * 1. Push items locaux vers PostgreSQL
     * 2. Pull items depuis PostgreSQL (TODO: implémenter)
     */
    sync(): Promise<void>;
    /**
     * Sync un item vers PostgreSQL
     */
    private syncItemToPostgreSQL;
    /**
     * Sync multiple items vers PostgreSQL
     */
    private syncItemsToPostgreSQL;
    /**
     * Start auto-sync timer
     */
    private startAutoSync;
    /**
     * Stop auto-sync timer
     */
    private stopAutoSync;
    /**
     * Get sync statistics
     */
    getSyncStats(): SyncStats;
    /**
     * Force sync manuel
     */
    forceSync(): Promise<void>;
    /**
     * Start auto-prune timer
     */
    private startAutoPrune;
    /**
     * Stop auto-prune timer
     */
    private stopAutoPrune;
    /**
     * Effectuer pruning du cache
     */
    private performPrune;
    /**
     * Force pruning manuel
     */
    forcePrune(): Promise<void>;
    /**
     * Obtenir statistiques du cache
     */
    getCacheStats(): import("./CacheManager").CacheStats;
    /**
     * Obtenir SmartCache (pour usage avancé)
     */
    getSmartCache(): SmartCache;
    /**
     * Obtenir CacheManager (pour usage avancé)
     */
    getCacheManager(): CacheManager;
    /**
     * Fallback search si PostgreSQL indisponible
     *
     * Recherche simple dans title + content (case-insensitive)
     */
    private fallbackSearch;
}
//# sourceMappingURL=HybridStore.d.ts.map