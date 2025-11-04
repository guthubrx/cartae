/**
 * usePersistentFilters - Hook for managing filters with localStorage persistence (Session 60A)
 */

import { useState, useEffect, useCallback } from 'react';
import type { PluginSearchFilters } from '../types';
import { FilterStorageService } from '../services/FilterStorageService';

export function usePersistentFilters(initialFilters: PluginSearchFilters = {}) {
  const [filters, setFilters] = useState<PluginSearchFilters>(() => {
    // Load saved filters on initial render
    const saved = FilterStorageService.loadFilters();
    return { ...initialFilters, ...saved };
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    FilterStorageService.saveFilters(filters);
  }, [filters]);

  const updateFilters = useCallback((newFilters: PluginSearchFilters) => {
    setFilters(newFilters);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    FilterStorageService.clearFilters();
  }, [initialFilters]);

  const hasActiveFilters = useCallback(
    () =>
      Object.keys(filters).some(key => {
        const value = filters[key as keyof PluginSearchFilters];
        return value !== undefined && value !== '' && value !== false;
      }),
    [filters]
  );

  return {
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
  };
}
