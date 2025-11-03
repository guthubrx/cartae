/**
 * useInfiniteScroll - Hook pour pagination infinie (infinite scroll)
 * Détecte quand l'utilisateur arrive en bas de page et charge plus de résultats
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions {
  /** Fonction appelée quand il faut charger plus */
  onLoadMore: () => Promise<void> | void;
  /** Y a-t-il encore des données à charger ? */
  hasMore: boolean;
  /** Est-on en train de charger ? */
  isLoading: boolean;
  /** Distance en pixels du bas avant de trigger (default: 200px) */
  threshold?: number;
  /** Element root à observer (default: window) */
  root?: Element | null;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 200,
  root = null
}: UseInfiniteScrollOptions) {
  const [isFetching, setIsFetching] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    if (isFetching || isLoading || !hasMore) return;

    setIsFetching(true);
    try {
      await onLoadMore();
    } catch (error) {
      console.error('[useInfiniteScroll] Load more failed:', error);
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, isLoading, hasMore, onLoadMore]);

  // Setup Intersection Observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return undefined;

    const options: IntersectionObserverInit = {
      root,
      rootMargin: `${threshold}px`,
      threshold: 0
    };

    observerRef.current = new IntersectionObserver(entries => {
      const [entry] = entries;

      if (entry.isIntersecting && hasMore && !isLoading) {
        handleLoadMore();
      }
    }, options);

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleLoadMore, hasMore, isLoading, threshold, root]);

  return {
    sentinelRef,
    isFetching: isFetching || isLoading
  };
}

/**
 * usePaginatedData - Hook combiné pour gérer pagination + infinite scroll
 */
interface UsePaginatedDataOptions<T> {
  /** Fonction de fetch avec page number */
  fetcher: (page: number) => Promise<T[]>;
  /** Nombre d'items par page */
  pageSize: number;
  /** Page initiale (default: 1) */
  initialPage?: number;
}

export function usePaginatedData<T>({
  fetcher,
  pageSize,
  initialPage = 1
}: UsePaginatedDataOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load initial data
  useEffect(() => {
    loadPage(initialPage, true);
  }, []); // Only on mount

  const loadPage = async (page: number, reset = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const newData = await fetcher(page);

      if (reset) {
        setData(newData);
      } else {
        setData(prev => [...prev, ...newData]);
      }

      setCurrentPage(page);
      setHasMore(newData.length >= pageSize);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error(`[usePaginatedData] Failed to load page ${page}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadPage(currentPage + 1);
  }, [currentPage, hasMore, isLoading]);

  const reset = useCallback(async () => {
    setCurrentPage(initialPage);
    setHasMore(true);
    await loadPage(initialPage, true);
  }, [initialPage]);

  const { sentinelRef, isFetching } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading
  });

  return {
    data,
    isLoading: isLoading || isFetching,
    error,
    hasMore,
    currentPage,
    loadMore,
    reset,
    sentinelRef
  };
}
