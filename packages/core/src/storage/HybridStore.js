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
import { CacheManager } from './CacheManager';
import { SmartCache } from './SmartCache';
import { DEFAULT_CACHE_CONFIG } from './CacheConfig';
/**
 * HybridStore - Storage hybride avec sync bidirectionnel
 *
 * Architecture:
 * - Toutes les opérations CRUD → IndexedDB (rapide, local)
 * - Sync périodique: IndexedDB ↔ PostgreSQL
 * - Recherche avancée → PostgreSQL (full-text + sémantique)
 */
export class HybridStore {
    db;
    client;
    config;
    syncTimer = null;
    pruneTimer = null;
    cacheManager;
    smartCache;
    syncStats = {
        lastSync: null,
        itemsPushed: 0,
        itemsPulled: 0,
        errors: 0,
        isSyncing: false,
    };
    constructor(config) {
        this.db = config.indexedDBStore;
        this.client = config.databaseClient;
        this.config = {
            autoSync: true,
            syncInterval: 60000, // 60s
            syncOnInit: true,
            cacheConfig: DEFAULT_CACHE_CONFIG,
            ...config,
        };
        // Initialiser CacheManager et SmartCache
        this.cacheManager = new CacheManager(this.config.cacheConfig);
        this.smartCache = new SmartCache(this.cacheManager);
    }
    // ==========================================================================
    // Lifecycle
    // ==========================================================================
    async init() {
        // Init IndexedDB
        await this.db.init();
        // Charger items existants dans CacheManager
        const existingItems = await this.db.getAll();
        for (const item of existingItems) {
            this.cacheManager.add(item);
        }
        // Test connexion PostgreSQL
        const isConnected = await this.client.testConnection();
        if (!isConnected) {
            console.warn('⚠️  PostgreSQL API not reachable. Running in offline mode (IndexedDB only).');
            return;
        }
        // Sync initial si configuré
        if (this.config.syncOnInit) {
            await this.sync();
        }
        // Démarrer sync automatique si configuré
        if (this.config.autoSync) {
            this.startAutoSync();
        }
        // Démarrer auto-pruning si configuré
        const cacheConfig = this.cacheManager.getConfig();
        if (cacheConfig.autoPruneEnabled) {
            this.startAutoPrune();
        }
    }
    async close() {
        // Stop timers
        this.stopAutoSync();
        this.stopAutoPrune();
        // Sync final avant fermeture
        if (!this.syncStats.isSyncing) {
            await this.sync();
        }
        // Close IndexedDB
        await this.db.close();
    }
    // ==========================================================================
    // CRUD Operations (délègue à IndexedDB)
    // ==========================================================================
    async create(item) {
        // Vérifier quotas cache AVANT d'ajouter
        if (!this.cacheManager.canAdd(item)) {
            // Évincer un item pour faire de la place
            const toEvict = this.cacheManager.getItemsToEvict(1);
            if (toEvict.length > 0) {
                await this.db.delete(toEvict[0]);
                this.cacheManager.remove(toEvict[0]);
                console.log(`🧹 Evicted item ${toEvict[0]} to make space`);
            }
        }
        const created = await this.db.create(item);
        // Enregistrer dans CacheManager
        this.cacheManager.add(created);
        // Sync immédiat vers PostgreSQL en background (fire-and-forget)
        this.syncItemToPostgreSQL(created).catch((error) => {
            console.error('Failed to sync item to PostgreSQL:', error);
        });
        return created;
    }
    async createMany(items) {
        const created = await this.db.createMany(items);
        // Sync batch vers PostgreSQL en background
        this.syncItemsToPostgreSQL(created).catch((error) => {
            console.error('Failed to sync items to PostgreSQL:', error);
        });
        return created;
    }
    async get(id) {
        const item = await this.db.get(id);
        // Update LRU si item trouvé
        if (item) {
            this.cacheManager.touch(id);
        }
        return item;
    }
    async getMany(ids) {
        return this.db.getMany(ids);
    }
    async getAll() {
        return this.db.getAll();
    }
    async query(options) {
        return this.db.query(options);
    }
    async update(id, updates) {
        const updated = await this.db.update(id, updates);
        // Sync vers PostgreSQL
        this.syncItemToPostgreSQL(updated).catch((error) => {
            console.error('Failed to sync updated item to PostgreSQL:', error);
        });
        return updated;
    }
    async updateMany(updates) {
        const updated = await this.db.updateMany(updates);
        // Sync vers PostgreSQL
        this.syncItemsToPostgreSQL(updated).catch((error) => {
            console.error('Failed to sync updated items to PostgreSQL:', error);
        });
        return updated;
    }
    async delete(id) {
        await this.db.delete(id);
        // TODO: Implémenter DELETE dans database-api
        // Pour l'instant, on laisse dans PostgreSQL (soft delete possible)
    }
    async deleteMany(ids) {
        await this.db.deleteMany(ids);
    }
    async clear() {
        await this.db.clear();
    }
    // ==========================================================================
    // Indexes & Search (délègue à IndexedDB pour recherche simple)
    // ==========================================================================
    async getByTag(tag) {
        return this.db.getByTag(tag);
    }
    async getByConnector(connector) {
        return this.db.getByConnector(connector);
    }
    async getByType(type) {
        return this.db.getByType(type);
    }
    async getByDateRange(start, end) {
        return this.db.getByDateRange(start, end);
    }
    // ==========================================================================
    // Advanced Search (utilise PostgreSQL)
    // ==========================================================================
    /**
     * Full-text search via PostgreSQL
     *
     * Utilise l'index GIN sur title_tsv + content_tsv
     */
    async searchFullText(query, limit = 20) {
        try {
            const results = await this.client.search(query, limit);
            return results.map((r) => r.item);
        }
        catch (error) {
            console.error('Full-text search failed, falling back to IndexedDB:', error);
            // Fallback: recherche simple dans IndexedDB
            return this.fallbackSearch(query);
        }
    }
    /**
     * Semantic search via PostgreSQL + pgvector
     *
     * Requiert que les items aient des embeddings générés
     */
    async searchSemantic(embedding, limit = 20, minSimilarity = 0.7) {
        try {
            const results = await this.client.semanticSearch(embedding, limit, minSimilarity);
            return results.map((r) => r.item);
        }
        catch (error) {
            console.error('Semantic search failed:', error);
            return [];
        }
    }
    /**
     * Hybrid search (text + semantic)
     */
    async searchHybrid(text, embedding, textWeight = 0.5, vectorWeight = 0.5, limit = 20) {
        try {
            const results = await this.client.hybridSearch(text, embedding, textWeight, vectorWeight, limit);
            return results.map((r) => r.item);
        }
        catch (error) {
            console.error('Hybrid search failed:', error);
            return [];
        }
    }
    // ==========================================================================
    // Stats & Utilities
    // ==========================================================================
    async count() {
        return this.db.count();
    }
    async getStats() {
        const localStats = await this.db.getStats();
        try {
            const remoteStats = await this.client.getStats();
            return {
                ...localStats,
                lastSync: this.syncStats.lastSync || undefined,
                // Ajouter infos remote dans des champs custom
                remote: remoteStats,
            };
        }
        catch (error) {
            return localStats;
        }
    }
    async exists(id) {
        return this.db.exists(id);
    }
    async getVersion() {
        return this.db.getVersion();
    }
    async migrate(targetVersion) {
        return this.db.migrate(targetVersion);
    }
    // ==========================================================================
    // Sync Logic
    // ==========================================================================
    /**
     * Sync bidirectionnel IndexedDB ↔ PostgreSQL
     *
     * 1. Push items locaux vers PostgreSQL
     * 2. Pull items depuis PostgreSQL (TODO: implémenter)
     */
    async sync() {
        if (this.syncStats.isSyncing) {
            console.warn('Sync already in progress, skipping...');
            return;
        }
        this.syncStats.isSyncing = true;
        try {
            console.log('🔄 Starting sync IndexedDB → PostgreSQL...');
            // Get tous les items locaux
            const localItems = await this.db.getAll();
            if (localItems.length === 0) {
                console.log('✅ No local items to sync');
                this.syncStats.lastSync = new Date();
                return;
            }
            // Push vers PostgreSQL (batch)
            const result = await this.client.parseBatch(localItems);
            this.syncStats.itemsPushed += result.summary.created + result.summary.updated;
            this.syncStats.lastSync = new Date();
            console.log(`✅ Sync completed: ${result.summary.created} created, ${result.summary.updated} updated`);
        }
        catch (error) {
            console.error('❌ Sync failed:', error);
            this.syncStats.errors++;
            throw error;
        }
        finally {
            this.syncStats.isSyncing = false;
        }
    }
    /**
     * Sync un item vers PostgreSQL
     */
    async syncItemToPostgreSQL(item) {
        await this.client.parse(item);
    }
    /**
     * Sync multiple items vers PostgreSQL
     */
    async syncItemsToPostgreSQL(items) {
        if (items.length === 0)
            return;
        await this.client.parseBatch(items);
    }
    /**
     * Start auto-sync timer
     */
    startAutoSync() {
        if (this.syncTimer) {
            return;
        }
        console.log(`🔄 Auto-sync enabled (interval: ${this.config.syncInterval}ms)`);
        this.syncTimer = setInterval(() => {
            this.sync().catch((error) => {
                console.error('Auto-sync failed:', error);
            });
        }, this.config.syncInterval);
    }
    /**
     * Stop auto-sync timer
     */
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            console.log('🔄 Auto-sync disabled');
        }
    }
    /**
     * Get sync statistics
     */
    getSyncStats() {
        return { ...this.syncStats };
    }
    /**
     * Force sync manuel
     */
    async forceSync() {
        return this.sync();
    }
    // ==========================================================================
    // Cache Management (NEW - Session 77)
    // ==========================================================================
    /**
     * Start auto-prune timer
     */
    startAutoPrune() {
        if (this.pruneTimer) {
            return;
        }
        const config = this.cacheManager.getConfig();
        console.log(`🧹 Auto-prune enabled (interval: ${config.pruneInterval}ms)`);
        this.pruneTimer = setInterval(() => {
            this.performPrune().catch((error) => {
                console.error('Auto-prune failed:', error);
            });
        }, config.pruneInterval);
    }
    /**
     * Stop auto-prune timer
     */
    stopAutoPrune() {
        if (this.pruneTimer) {
            clearInterval(this.pruneTimer);
            this.pruneTimer = null;
            console.log('🧹 Auto-prune disabled');
        }
    }
    /**
     * Effectuer pruning du cache
     */
    async performPrune() {
        // Vérifier si pruning nécessaire
        if (!this.cacheManager.shouldPrune()) {
            return;
        }
        console.log('🧹 Starting cache pruning...');
        // Obtenir items à évincer
        const evicted = await this.cacheManager.prune();
        // Supprimer de IndexedDB
        if (evicted.length > 0) {
            await this.db.deleteMany(evicted);
            console.log(`🧹 Pruned ${evicted.length} items from cache`);
        }
        // Log stats
        const stats = this.cacheManager.getStats();
        console.log(`📊 Cache stats: ${stats.totalItems} items, ${stats.totalSizeMB.toFixed(2)} MB, ${(stats.utilization * 100).toFixed(1)}% utilization`);
    }
    /**
     * Force pruning manuel
     */
    async forcePrune() {
        return this.performPrune();
    }
    /**
     * Obtenir statistiques du cache
     */
    getCacheStats() {
        return this.cacheManager.getStats();
    }
    /**
     * Obtenir SmartCache (pour usage avancé)
     */
    getSmartCache() {
        return this.smartCache;
    }
    /**
     * Obtenir CacheManager (pour usage avancé)
     */
    getCacheManager() {
        return this.cacheManager;
    }
    // ==========================================================================
    // Fallback search (IndexedDB simple)
    // ==========================================================================
    /**
     * Fallback search si PostgreSQL indisponible
     *
     * Recherche simple dans title + content (case-insensitive)
     */
    async fallbackSearch(query) {
        const allItems = await this.db.getAll();
        const lowerQuery = query.toLowerCase();
        return allItems.filter((item) => {
            const titleMatch = item.title.toLowerCase().includes(lowerQuery);
            const contentMatch = item.content?.toLowerCase().includes(lowerQuery);
            return titleMatch || contentMatch;
        });
    }
}
//# sourceMappingURL=HybridStore.js.map