/**
 * Marketplace Cache Service
 * Service de cache intelligent pour le Marketplace de plugins
 *
 * Fonctionnalités:
 * - Cache en mémoire avec TTL configurable
 * - Persistance IndexedDB pour cache offline
 * - Stale-while-revalidate pour UX fluide
 * - Préfetching intelligent basé sur l'usage
 * - Invalidation sélective par tags
 * - Compression des données cachées
 * - Analytics de performance du cache
 */

import { CacheManager, type CacheOptions } from '../distribution/CacheManager';
import { CacheStrategy } from '../distribution/CacheStrategy';

// ============================================================================
// TYPES
// ============================================================================

export interface PluginListResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PluginResponse {
  id: string;
  name: string;
  version: string;
  description: string;
  [key: string]: any;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  lastCleared: number | null;
}

export interface MarketplaceCacheConfig {
  // Durées de cache (en millisecondes)
  pluginListTTL: number; // Liste de plugins
  pluginDetailTTL: number; // Détails d'un plugin
  featuredTTL: number; // Plugins featured
  trendingTTL: number; // Plugins trending
  searchTTL: number; // Résultats de recherche

  // Stale-while-revalidate
  staleWhileRevalidate: number; // Durée de service du stale

  // Préfetching
  prefetchEnabled: boolean; // Activer le préfetching
  prefetchThreshold: number; // Seuil d'activité pour préfetch

  // Persistance
  persistToIndexedDB: boolean; // Sauvegarder dans IndexedDB

  // Compression
  compressLargePayloads: boolean; // Compresser les gros payloads
  compressionThreshold: number; // Taille min pour compression (bytes)
}

// Configuration par défaut
const DEFAULT_CONFIG: MarketplaceCacheConfig = {
  pluginListTTL: 5 * 60 * 1000, // 5 minutes
  pluginDetailTTL: 10 * 60 * 1000, // 10 minutes
  featuredTTL: 15 * 60 * 1000, // 15 minutes
  trendingTTL: 5 * 60 * 1000, // 5 minutes
  searchTTL: 2 * 60 * 1000, // 2 minutes
  staleWhileRevalidate: 30 * 1000, // 30 secondes
  prefetchEnabled: true,
  prefetchThreshold: 3, // Préfetch après 3 vues
  persistToIndexedDB: true,
  compressLargePayloads: false, // TODO: Implémenter compression
  compressionThreshold: 100 * 1024, // 100 KB
};

// ============================================================================
// MARKETPLACE CACHE SERVICE
// ============================================================================

export class MarketplaceCacheService {
  private cacheManager: CacheManager;

  private config: MarketplaceCacheConfig;

  private stats: CacheStats;

  private viewCount: Map<string, number> = new Map();

  private prefetchQueue: Set<string> = new Set();

  constructor(config: Partial<MarketplaceCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialiser le CacheManager avec une stratégie par défaut
    this.cacheManager = new CacheManager(new CacheStrategy());

    // Initialiser les stats
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      lastCleared: null,
    };

    // Restaurer le cache depuis IndexedDB si activé
    if (this.config.persistToIndexedDB) {
      this.restoreFromIndexedDB();
    }
  }

  // ==========================================================================
  // CACHE OPERATIONS
  // ==========================================================================

  /**
   * Cache la liste de plugins
   */
  async cachePluginList(
    key: string,
    data: PluginListResponse,
    options?: Partial<CacheOptions>
  ): Promise<void> {
    const cacheOptions: CacheOptions = {
      maxAge: this.config.pluginListTTL,
      staleWhileRevalidate: this.config.staleWhileRevalidate,
      tags: ['plugin-list', 'plugins'],
      ...options,
    };

    await this.cacheManager.set(key, data, cacheOptions);

    // Préfetch des détails des premiers plugins si activé
    if (this.config.prefetchEnabled && data.data.length > 0) {
      this.schedulePrefetch(data.data.slice(0, 5));
    }
  }

  /**
   * Récupère la liste de plugins depuis le cache
   */
  async getPluginList(key: string): Promise<PluginListResponse | null> {
    this.stats.totalRequests++;

    const cached = await this.cacheManager.get<PluginListResponse>(key);

    if (cached) {
      this.stats.hits++;
      this.updateHitRate();
      return cached;
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Cache les détails d'un plugin
   */
  async cachePluginDetail(pluginId: string, data: PluginResponse): Promise<void> {
    const key = `plugin:${pluginId}`;

    const cacheOptions: CacheOptions = {
      maxAge: this.config.pluginDetailTTL,
      staleWhileRevalidate: this.config.staleWhileRevalidate,
      tags: ['plugin-detail', `plugin:${pluginId}`],
    };

    await this.cacheManager.set(key, data, cacheOptions);

    // Track views pour préfetching intelligent
    this.trackView(pluginId);
  }

  /**
   * Récupère les détails d'un plugin depuis le cache
   */
  async getPluginDetail(pluginId: string): Promise<PluginResponse | null> {
    this.stats.totalRequests++;

    const key = `plugin:${pluginId}`;
    const cached = await this.cacheManager.get<PluginResponse>(key);

    if (cached) {
      this.stats.hits++;
      this.updateHitRate();
      this.trackView(pluginId);
      return cached;
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Cache les plugins featured
   */
  async cacheFeatured(data: PluginResponse[]): Promise<void> {
    const cacheOptions: CacheOptions = {
      maxAge: this.config.featuredTTL,
      staleWhileRevalidate: this.config.staleWhileRevalidate,
      tags: ['featured', 'plugins'],
    };

    await this.cacheManager.set('plugins:featured', data, cacheOptions);
  }

  /**
   * Récupère les plugins featured depuis le cache
   */
  async getFeatured(): Promise<PluginResponse[] | null> {
    this.stats.totalRequests++;

    const cached = await this.cacheManager.get<PluginResponse[]>('plugins:featured');

    if (cached) {
      this.stats.hits++;
      this.updateHitRate();
      return cached;
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Cache les plugins trending
   */
  async cacheTrending(data: PluginResponse[]): Promise<void> {
    const cacheOptions: CacheOptions = {
      maxAge: this.config.trendingTTL,
      staleWhileRevalidate: this.config.staleWhileRevalidate,
      tags: ['trending', 'plugins'],
    };

    await this.cacheManager.set('plugins:trending', data, cacheOptions);
  }

  /**
   * Récupère les plugins trending depuis le cache
   */
  async getTrending(): Promise<PluginResponse[] | null> {
    this.stats.totalRequests++;

    const cached = await this.cacheManager.get<PluginResponse[]>('plugins:trending');

    if (cached) {
      this.stats.hits++;
      this.updateHitRate();
      return cached;
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Cache les résultats de recherche
   */
  async cacheSearchResults(query: string, data: any): Promise<void> {
    const key = `search:${query.toLowerCase()}`;

    const cacheOptions: CacheOptions = {
      maxAge: this.config.searchTTL,
      staleWhileRevalidate: this.config.staleWhileRevalidate,
      tags: ['search', 'plugins'],
    };

    await this.cacheManager.set(key, data, cacheOptions);
  }

  /**
   * Récupère les résultats de recherche depuis le cache
   */
  async getSearchResults(query: string): Promise<any | null> {
    this.stats.totalRequests++;

    const key = `search:${query.toLowerCase()}`;
    const cached = await this.cacheManager.get<any>(key);

    if (cached) {
      this.stats.hits++;
      this.updateHitRate();
      return cached;
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  // ==========================================================================
  // INVALIDATION
  // ==========================================================================

  /**
   * Invalide le cache d'un plugin spécifique
   */
  async invalidatePlugin(pluginId: string): Promise<void> {
    await this.cacheManager.invalidateByTag(`plugin:${pluginId}`);
  }

  /**
   * Invalide toutes les listes de plugins
   */
  async invalidatePluginLists(): Promise<void> {
    await this.cacheManager.invalidateByTag('plugin-list');
  }

  /**
   * Invalide tout le cache du marketplace
   */
  async invalidateAll(): Promise<void> {
    await this.cacheManager.clear();
    this.stats.lastCleared = Date.now();
    this.viewCount.clear();
    this.prefetchQueue.clear();
  }

  /**
   * Invalide le cache des recherches
   */
  async invalidateSearches(): Promise<void> {
    await this.cacheManager.invalidateByTag('search');
  }

  // ==========================================================================
  // PREFETCHING
  // ==========================================================================

  /**
   * Track une vue de plugin pour préfetching intelligent
   */
  private trackView(pluginId: string): void {
    const count = (this.viewCount.get(pluginId) || 0) + 1;
    this.viewCount.set(pluginId, count);

    // Si le plugin est vu souvent, le marquer pour préfetch
    if (count >= this.config.prefetchThreshold) {
      this.prefetchQueue.add(pluginId);
    }
  }

  /**
   * Schedule le préfetch de détails de plugins
   */
  private schedulePrefetch(plugins: PluginResponse[]): void {
    if (!this.config.prefetchEnabled) return;

    // Ajouter à la queue de préfetch
    plugins.forEach(plugin => {
      if (!this.prefetchQueue.has(plugin.id)) {
        this.prefetchQueue.add(plugin.id);
      }
    });

    // Déclencher le préfetch après un petit délai (éviter de bloquer)
    setTimeout(() => this.executePrefetch(), 1000);
  }

  /**
   * Exécute le préfetch des plugins en queue
   */
  private async executePrefetch(): Promise<void> {
    // Cette méthode serait appelée par le composant avec une callback
    // pour fetch les détails des plugins
    // TODO: Implémenter avec injection de dépendance
  }

  /**
   * Récupère les plugins à préfetch
   */
  getPrefetchQueue(): string[] {
    return Array.from(this.prefetchQueue);
  }

  /**
   * Marque un plugin comme préfetché
   */
  markPrefetched(pluginId: string): void {
    this.prefetchQueue.delete(pluginId);
  }

  // ==========================================================================
  // PERSISTENCE (IndexedDB)
  // ==========================================================================

  /**
   * Sauvegarde le cache dans IndexedDB
   */
  private async saveToIndexedDB(): Promise<void> {
    if (!this.config.persistToIndexedDB) return;

    try {
      // TODO: Implémenter sauvegarde IndexedDB
      // Utiliser une bibliothèque comme idb ou idb-keyval
      console.log('Saving cache to IndexedDB...');
    } catch (error) {
      console.error('Failed to save cache to IndexedDB:', error);
    }
  }

  /**
   * Restaure le cache depuis IndexedDB
   */
  private async restoreFromIndexedDB(): Promise<void> {
    if (!this.config.persistToIndexedDB) return;

    try {
      // TODO: Implémenter restauration IndexedDB
      console.log('Restoring cache from IndexedDB...');
    } catch (error) {
      console.error('Failed to restore cache from IndexedDB:', error);
    }
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Met à jour le hit rate
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests === 0) {
      this.stats.hitRate = 0;
    } else {
      this.stats.hitRate = (this.stats.hits / this.stats.totalRequests) * 100;
    }
  }

  /**
   * Récupère les statistiques du cache
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset les statistiques
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      lastCleared: null,
    };
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Met à jour la configuration
   */
  updateConfig(config: Partial<MarketplaceCacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Récupère la configuration actuelle
   */
  getConfig(): MarketplaceCacheConfig {
    return { ...this.config };
  }
}

// ============================================================================
// INSTANCE SINGLETON
// ============================================================================

/**
 * Instance singleton du service de cache Marketplace
 */
export const marketplaceCacheService = new MarketplaceCacheService();

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * Hook React pour utiliser le cache Marketplace
 */
export function useMarketplaceCache() {
  return {
    cachePluginList: marketplaceCacheService.cachePluginList.bind(marketplaceCacheService),
    getPluginList: marketplaceCacheService.getPluginList.bind(marketplaceCacheService),
    cachePluginDetail: marketplaceCacheService.cachePluginDetail.bind(marketplaceCacheService),
    getPluginDetail: marketplaceCacheService.getPluginDetail.bind(marketplaceCacheService),
    cacheFeatured: marketplaceCacheService.cacheFeatured.bind(marketplaceCacheService),
    getFeatured: marketplaceCacheService.getFeatured.bind(marketplaceCacheService),
    cacheTrending: marketplaceCacheService.cacheTrending.bind(marketplaceCacheService),
    getTrending: marketplaceCacheService.getTrending.bind(marketplaceCacheService),
    cacheSearchResults: marketplaceCacheService.cacheSearchResults.bind(marketplaceCacheService),
    getSearchResults: marketplaceCacheService.getSearchResults.bind(marketplaceCacheService),
    invalidatePlugin: marketplaceCacheService.invalidatePlugin.bind(marketplaceCacheService),
    invalidateAll: marketplaceCacheService.invalidateAll.bind(marketplaceCacheService),
    getStats: marketplaceCacheService.getStats.bind(marketplaceCacheService),
    getPrefetchQueue: marketplaceCacheService.getPrefetchQueue.bind(marketplaceCacheService),
    markPrefetched: marketplaceCacheService.markPrefetched.bind(marketplaceCacheService),
  };
}
