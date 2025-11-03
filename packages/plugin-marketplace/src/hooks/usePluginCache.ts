/**
 * usePluginCache - Hook de caching pour plugins avec React Query patterns
 * Cache intelligent avec invalidation et stale-while-revalidate
 */

import { useEffect, useState, useCallback } from 'react';
import type { PluginListing, PluginSearchFilters } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleAt: number;
}

interface CacheOptions {
  /** Durée de vie du cache en ms (default: 5 minutes) */
  ttl?: number;
  /** Durée avant que le cache soit considéré stale (default: 1 minute) */
  staleTime?: number;
  /** Fonction de fetch des données */
  fetcher: () => Promise<PluginListing[]>;
  /** Clé de cache unique */
  cacheKey: string;
  /** Refetch automatiquement au mount si stale */
  refetchOnMount?: boolean;
}

// Cache global en mémoire (partagé entre tous les hooks)
const globalCache = new Map<string, CacheEntry<PluginListing[]>>();

export function usePluginCache({
  ttl = 5 * 60 * 1000, // 5 minutes
  staleTime = 60 * 1000, // 1 minute
  fetcher,
  cacheKey,
  refetchOnMount = true
}: CacheOptions) {
  const [data, setData] = useState<PluginListing[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Check if cache is valid
  const getCachedData = useCallback((): PluginListing[] | null => {
    const cached = globalCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();

    // Check if expired
    if (now > cached.timestamp + ttl) {
      globalCache.delete(cacheKey);
      return null;
    }

    // Check if stale
    if (now > cached.staleAt) {
      setIsStale(true);
    }

    return cached.data;
  }, [cacheKey, ttl]);

  // Fetch data and update cache
  const fetchData = useCallback(
    async (backgroundRefetch = false) => {
      if (!backgroundRefetch) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await fetcher();

        const now = Date.now();
        const entry: CacheEntry<PluginListing[]> = {
          data: result,
          timestamp: now,
          staleAt: now + staleTime
        };

        globalCache.set(cacheKey, entry);
        setData(result);
        setIsStale(false);
        setLastFetchTime(now);

        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        console.error(`[usePluginCache] Fetch failed for ${cacheKey}:`, error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetcher, cacheKey, staleTime]
  );

  // Load initial data
  useEffect(() => {
    const cached = getCachedData();

    if (cached) {
      // Use cached data immediately
      setData(cached);
      setLastFetchTime(globalCache.get(cacheKey)?.timestamp || null);

      // Refetch in background if stale
      if (isStale && refetchOnMount) {
        fetchData(true); // Background refetch
      }
    } else {
      // No cache, fetch immediately
      fetchData();
    }
  }, [cacheKey]); // Only re-run if cacheKey changes

  // Manual refetch
  const refetch = useCallback(async () => {
    return fetchData(false);
  }, [fetchData]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    globalCache.delete(cacheKey);
    setIsStale(true);
  }, [cacheKey]);

  // Prefetch (for hover/anticipation)
  const prefetch = useCallback(async () => {
    const cached = getCachedData();
    if (!cached || isStale) {
      await fetchData(true); // Silent background fetch
    }
  }, [getCachedData, isStale, fetchData]);

  return {
    data,
    isLoading,
    isStale,
    error,
    lastFetchTime,
    refetch,
    invalidate,
    prefetch
  };
}

/**
 * usePluginsQuery - Hook spécialisé pour query plugins avec filters
 */
export function usePluginsQuery(
  registryUrl: string,
  filters: PluginSearchFilters = {},
  options?: Partial<CacheOptions>
) {
  // Generate cache key from filters
  const cacheKey = `plugins:${registryUrl}:${JSON.stringify(filters)}`;

  const fetcher = useCallback(async () => {
    const response = await fetch(`${registryUrl}/plugins`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const allPlugins: PluginListing[] = await response.json();

    // Apply client-side filters
    let filtered = allPlugins;

    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    if (filters.pricing) {
      filtered = filtered.filter(p => p.pricing === filters.pricing);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.featured !== undefined) {
      filtered = filtered.filter(p => p.featured === filters.featured);
    }

    if (filters.verified !== undefined) {
      filtered = filtered.filter(p => p.verified === filters.verified);
    }

    return filtered;
  }, [registryUrl, filters]);

  return usePluginCache({
    cacheKey,
    fetcher,
    ttl: 5 * 60 * 1000, // 5 minutes
    staleTime: 60 * 1000, // 1 minute
    ...options
  });
}

/**
 * Utility: Clear all caches
 */
export function clearAllCaches() {
  globalCache.clear();
}

/**
 * Utility: Get cache stats
 */
export function getCacheStats() {
  return {
    size: globalCache.size,
    keys: Array.from(globalCache.keys()),
    totalSize: Array.from(globalCache.values()).reduce(
      (sum, entry) => sum + JSON.stringify(entry.data).length,
      0
    )
  };
}
