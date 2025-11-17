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
import { DEFAULT_CACHE_CONFIG, estimateItemSizeMB, getItemType, validateCacheConfig } from './CacheConfig';
/**
 * CacheManager - Gestion intelligente du cache
 */
export class CacheManager {
    config;
    metadata = new Map();
    stats;
    constructor(config = {}) {
        // Merge avec config par défaut
        this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
        // Valider config
        const validation = validateCacheConfig(this.config);
        if (!validation.valid) {
            throw new Error(`Invalid cache config: ${validation.errors.join(', ')}`);
        }
        // Init stats
        this.stats = this.initStats();
        if (this.config.verbose) {
            console.log('✅ CacheManager initialized', this.config);
        }
    }
    // ==========================================================================
    // Public API
    // ==========================================================================
    /**
     * Vérifier si un item peut être ajouté au cache
     */
    canAdd(item) {
        const type = getItemType(item);
        const sizeMB = estimateItemSizeMB(item);
        // Vérifier limite globale items
        if (this.stats.totalItems >= this.config.maxItems) {
            if (this.config.verbose) {
                console.warn(`⚠️  Global item limit reached (${this.config.maxItems})`);
            }
            return false;
        }
        // Vérifier limite globale taille
        if (this.stats.totalSizeMB + sizeMB > this.config.maxSizeMB) {
            if (this.config.verbose) {
                console.warn(`⚠️  Global size limit reached (${this.config.maxSizeMB} MB)`);
            }
            return false;
        }
        // Vérifier quota par type (si défini)
        const quota = this.config.quotas[type];
        if (quota && quota.maxItems > 0) {
            const typeStats = this.stats.byType[type];
            if (typeStats.count >= quota.maxItems) {
                if (this.config.verbose) {
                    console.warn(`⚠️  Type ${type} item limit reached (${quota.maxItems})`);
                }
                return false;
            }
            if (typeStats.sizeMB + sizeMB > quota.maxSizeMB) {
                if (this.config.verbose) {
                    console.warn(`⚠️  Type ${type} size limit reached (${quota.maxSizeMB} MB)`);
                }
                return false;
            }
        }
        return true;
    }
    /**
     * Enregistrer l'ajout d'un item au cache
     */
    add(item) {
        const type = getItemType(item);
        const sizeMB = estimateItemSizeMB(item);
        const now = Date.now();
        const metadata = {
            id: item.id,
            type,
            sizeMB,
            lastAccessedAt: now,
            cachedAt: now,
            accessCount: 0,
        };
        this.metadata.set(item.id, metadata);
        // Update stats
        this.stats.totalItems++;
        this.stats.totalSizeMB += sizeMB;
        this.stats.byType[type].count++;
        this.stats.byType[type].sizeMB += sizeMB;
        this.updateUtilization();
        if (this.config.verbose) {
            console.log(`✅ Item added to cache: ${item.id} (${type}, ${sizeMB.toFixed(2)} MB)`);
        }
    }
    /**
     * Marquer un item comme accédé (update LRU)
     */
    touch(itemId) {
        const metadata = this.metadata.get(itemId);
        if (!metadata) {
            this.stats.misses++;
            return;
        }
        metadata.lastAccessedAt = Date.now();
        metadata.accessCount++;
        this.stats.hits++;
        if (this.config.verbose) {
            console.log(`👆 Item touched: ${itemId} (accessed ${metadata.accessCount} times)`);
        }
    }
    /**
     * Supprimer un item du cache
     */
    remove(itemId) {
        const metadata = this.metadata.get(itemId);
        if (!metadata) {
            return;
        }
        this.metadata.delete(itemId);
        // Update stats
        this.stats.totalItems--;
        this.stats.totalSizeMB -= metadata.sizeMB;
        this.stats.byType[metadata.type].count--;
        this.stats.byType[metadata.type].sizeMB -= metadata.sizeMB;
        this.updateUtilization();
        if (this.config.verbose) {
            console.log(`🗑️  Item removed from cache: ${itemId}`);
        }
    }
    /**
     * Obtenir les items à évincer selon politique LRU
     *
     * @param count Nombre d'items à évincer
     * @returns IDs des items à supprimer
     */
    getItemsToEvict(count) {
        // Trier metadata par lastAccessedAt (LRU)
        const sorted = Array.from(this.metadata.values()).sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
        // Prendre les N premiers (les moins récemment utilisés)
        return sorted.slice(0, count).map((m) => m.id);
    }
    /**
     * Nettoyer le cache selon la politique configurée
     *
     * @returns IDs des items évincés
     */
    async prune() {
        const now = Date.now();
        const evicted = [];
        // Stratégie 1 : Supprimer items trop vieux
        const maxAgeMs = this.config.maxAgeDays * 24 * 60 * 60 * 1000;
        for (const [id, metadata] of this.metadata.entries()) {
            const age = now - metadata.lastAccessedAt;
            if (age > maxAgeMs) {
                evicted.push(id);
                this.remove(id);
            }
        }
        // Stratégie 2 : Si utilisation > threshold, évincer LRU
        if (this.stats.utilization > this.config.pruneThreshold) {
            const itemsToEvict = Math.ceil(this.stats.totalItems * 0.1); // Évincer 10%
            const lruItems = this.getItemsToEvict(itemsToEvict);
            for (const id of lruItems) {
                if (!evicted.includes(id)) {
                    evicted.push(id);
                    this.remove(id);
                }
            }
        }
        // Update stats
        this.stats.lastPruneAt = now;
        this.stats.lastPruneEvicted = evicted.length;
        if (this.config.verbose && evicted.length > 0) {
            console.log(`🧹 Pruned ${evicted.length} items from cache`);
        }
        return evicted;
    }
    /**
     * Vérifier si pruning est nécessaire
     */
    shouldPrune() {
        // Vérifier threshold d'utilisation
        if (this.stats.utilization > this.config.pruneThreshold) {
            return true;
        }
        // Vérifier interval depuis dernier pruning
        if (this.stats.lastPruneAt) {
            const timeSinceLastPrune = Date.now() - this.stats.lastPruneAt;
            if (timeSinceLastPrune > this.config.pruneInterval) {
                return true;
            }
        }
        return false;
    }
    /**
     * Obtenir statistiques du cache
     */
    getStats() {
        this.updateUtilization();
        return { ...this.stats };
    }
    /**
     * Obtenir métadonnées d'un item
     */
    getMetadata(itemId) {
        return this.metadata.get(itemId);
    }
    /**
     * Obtenir toutes les métadonnées
     */
    getAllMetadata() {
        return Array.from(this.metadata.values());
    }
    /**
     * Réinitialiser le cache
     */
    clear() {
        this.metadata.clear();
        this.stats = this.initStats();
        if (this.config.verbose) {
            console.log('🧹 Cache cleared');
        }
    }
    /**
     * Obtenir configuration actuelle
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Mettre à jour configuration (validation incluse)
     */
    updateConfig(newConfig) {
        const merged = { ...this.config, ...newConfig };
        const validation = validateCacheConfig(merged);
        if (!validation.valid) {
            throw new Error(`Invalid cache config: ${validation.errors.join(', ')}`);
        }
        this.config = merged;
        if (this.config.verbose) {
            console.log('✅ Cache config updated', this.config);
        }
    }
    // ==========================================================================
    // Private Helpers
    // ==========================================================================
    /**
     * Initialiser statistiques
     */
    initStats() {
        return {
            totalItems: 0,
            totalSizeMB: 0,
            utilization: 0,
            byType: {
                email: { count: 0, sizeMB: 0, quotaUsage: 0 },
                task: { count: 0, sizeMB: 0, quotaUsage: 0 },
                note: { count: 0, sizeMB: 0, quotaUsage: 0 },
                event: { count: 0, sizeMB: 0, quotaUsage: 0 },
                other: { count: 0, sizeMB: 0, quotaUsage: 0 },
            },
            hits: 0,
            misses: 0,
            hitRate: 0,
            lastPruneAt: null,
            lastPruneEvicted: 0,
        };
    }
    /**
     * Mettre à jour utilisation et quotas
     */
    updateUtilization() {
        // Utilisation globale
        this.stats.utilization = this.stats.totalItems / this.config.maxItems;
        // Utilisation par type
        for (const type of Object.keys(this.stats.byType)) {
            const quota = this.config.quotas[type];
            const typeStats = this.stats.byType[type];
            if (quota && quota.maxItems > 0) {
                typeStats.quotaUsage = typeStats.count / quota.maxItems;
            }
            else {
                typeStats.quotaUsage = 0;
            }
        }
        // Hit rate
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }
}
//# sourceMappingURL=CacheManager.js.map