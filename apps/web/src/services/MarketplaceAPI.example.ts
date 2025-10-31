/**
 * Marketplace API Client - Example Integration
 * Exemple d'intégration du cache avec l'API Marketplace
 *
 * Ce fichier montre comment utiliser MarketplaceCacheService
 * avec les appels API au backend Cloudflare Worker
 *
 * IMPORTANT: Utilise MarketplaceSourceResolver pour basculer dynamiquement
 * entre Git et Cloudflare CDN sans rebuild.
 */

import { marketplaceCacheService } from './MarketplaceCacheService';
import { marketplaceSourceResolver } from './MarketplaceSourceResolver';
import type { PluginListResponse, PluginResponse } from './MarketplaceCacheService';

/**
 * Fetch avec cache intelligent
 */
async function fetchWithCache<T>(
  url: string,
  cacheKey: string,
  getCached: () => Promise<T | null>,
  setCached: (data: T) => Promise<void>
): Promise<T> {
  // 1. Essayer le cache d'abord
  const cached = await getCached();

  if (cached) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached;
  }

  console.log(`[Cache MISS] ${cacheKey}`);

  // 2. Fetch depuis l'API
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  const data = await response.json();

  // 3. Mettre en cache
  await setCached(data);

  return data;
}

/**
 * Récupère la liste des plugins avec pagination et filtres
 */
export async function fetchPluginList(params: {
  page?: number;
  limit?: number;
  category?: string;
  source?: string;
  pricing?: string;
  featured?: string;
  q?: string;
  sort?: string;
}): Promise<PluginListResponse> {
  // Construire l'URL avec les paramètres
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, String(value));
    }
  });

  // Résoudre l'URL via le resolver (bascule dynamique Git/Cloudflare)
  const url = await marketplaceSourceResolver.resolveUrl(`api/plugins?${queryParams.toString()}`);

  // Cache key unique basé sur les paramètres
  const cacheKey = `plugin-list:${queryParams.toString()}`;

  return fetchWithCache(
    url,
    cacheKey,
    () => marketplaceCacheService.getPluginList(cacheKey),
    data => marketplaceCacheService.cachePluginList(cacheKey, data)
  );
}

/**
 * Récupère les détails d'un plugin
 */
export async function fetchPluginDetail(pluginId: string): Promise<PluginResponse> {
  // Résoudre l'URL via le resolver
  const url = await marketplaceSourceResolver.resolveUrl(`api/plugins/${pluginId}`);

  return fetchWithCache(
    url,
    pluginId,
    () => marketplaceCacheService.getPluginDetail(pluginId),
    data => marketplaceCacheService.cachePluginDetail(pluginId, data)
  );
}

/**
 * Récupère les plugins featured
 */
export async function fetchFeaturedPlugins(): Promise<{ data: PluginResponse[] }> {
  const url = await marketplaceSourceResolver.resolveUrl('api/plugins/featured');

  return fetchWithCache(
    url,
    'featured',
    () => marketplaceCacheService.getFeatured().then(data => (data ? { data } : null)),
    response => marketplaceCacheService.cacheFeatured(response.data)
  );
}

/**
 * Récupère les plugins trending
 */
export async function fetchTrendingPlugins(): Promise<{ data: PluginResponse[] }> {
  const url = await marketplaceSourceResolver.resolveUrl('api/plugins/trending');

  return fetchWithCache(
    url,
    'trending',
    () => marketplaceCacheService.getTrending().then(data => (data ? { data } : null)),
    response => marketplaceCacheService.cacheTrending(response.data)
  );
}

/**
 * Recherche de plugins
 */
export async function searchPlugins(query: string): Promise<{
  query: string;
  results: PluginResponse[];
  total: number;
}> {
  if (!query || query.length < 2) {
    throw new Error('Query must be at least 2 characters');
  }

  const url = await marketplaceSourceResolver.resolveUrl(`api/search?q=${encodeURIComponent(query)}`);

  return fetchWithCache(
    url,
    query,
    () => marketplaceCacheService.getSearchResults(query),
    data => marketplaceCacheService.cacheSearchResults(query, data)
  );
}

/**
 * Télécharge un plugin
 */
export async function downloadPlugin(pluginId: string, version: string = 'latest'): Promise<Blob> {
  const url = await marketplaceSourceResolver.resolveUrl(
    `api/plugins/${pluginId}/download?version=${version}`
  );

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * Track une installation
 */
export async function trackInstall(pluginId: string, version: string): Promise<void> {
  const url = await marketplaceSourceResolver.resolveUrl(`api/plugins/${pluginId}/track-install`);

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ version }),
  });
}

/**
 * Préfetch des détails de plugins
 * Appelé automatiquement par le cache service
 */
export async function prefetchPluginDetails(pluginIds: string[]): Promise<void> {
  // Préfetch en parallèle mais limité
  const batchSize = 5;

  for (let i = 0; i < pluginIds.length; i += batchSize) {
    const batch = pluginIds.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async pluginId => {
        try {
          await fetchPluginDetail(pluginId);
          marketplaceCacheService.markPrefetched(pluginId);
        } catch (error) {
          console.error(`Failed to prefetch ${pluginId}:`, error);
        }
      })
    );

    // Petit délai entre les batches
    if (i + batchSize < pluginIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Hook d'effet pour préfetching automatique
 * À utiliser dans les composants React
 */
export function usePrefetchEffect(): void {
  // TODO: Implémenter avec useEffect
  // Récupérer la queue de préfetch et lancer le préfetch
}

/**
 * Exemple d'utilisation dans un composant React
 */
/*
import { useEffect, useState } from 'react';
import { fetchPluginList, fetchPluginDetail, prefetchPluginDetails } from './MarketplaceAPI';
import { marketplaceCacheService } from './MarketplaceCacheService';

export function ExampleMarketplaceComponent() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlugins() {
      try {
        // Charger la liste
        const response = await fetchPluginList({ page: 1, limit: 20 });
        setPlugins(response.data);

        // Préfetch automatique des détails
        const prefetchQueue = marketplaceCacheService.getPrefetchQueue();
        if (prefetchQueue.length > 0) {
          prefetchPluginDetails(prefetchQueue);
        }
      } catch (error) {
        console.error('Failed to load plugins:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPlugins();
  }, []);

  // Afficher les stats de cache (dev mode)
  useEffect(() => {
    const stats = marketplaceCacheService.getStats();
    console.log('Cache Stats:', stats);
  }, [plugins]);

  return (
    <div>
      {loading ? <p>Loading...</p> : <PluginList plugins={plugins} />}
    </div>
  );
}
*/
