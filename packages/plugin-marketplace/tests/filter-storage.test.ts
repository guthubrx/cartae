/**
 * FilterStorageService Tests (Session 60A)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FilterStorageService } from '../src/services/FilterStorageService';
import type { PluginSearchFilters } from '../src/types';

describe('FilterStorageService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save filters to localStorage', () => {
    const filters: PluginSearchFilters = {
      category: 'productivity',
      minRating: 4,
      tags: ['react', 'typescript'],
    };

    FilterStorageService.saveFilters(filters);

    const stored = localStorage.getItem('cartae-marketplace-filters');
    expect(stored).toBe(JSON.stringify(filters));
  });

  it('should load filters from localStorage', () => {
    const filters: PluginSearchFilters = {
      category: 'integration',
      minDownloads: 1000,
      sortBy: 'rating',
    };

    localStorage.setItem('cartae-marketplace-filters', JSON.stringify(filters));

    const loaded = FilterStorageService.loadFilters();
    expect(loaded).toEqual(filters);
  });

  it('should return empty object when no filters are stored', () => {
    const loaded = FilterStorageService.loadFilters();
    expect(loaded).toEqual({});
  });

  it('should clear filters from localStorage', () => {
    const filters: PluginSearchFilters = { category: 'theme' };
    localStorage.setItem('cartae-marketplace-filters', JSON.stringify(filters));

    FilterStorageService.clearFilters();

    const stored = localStorage.getItem('cartae-marketplace-filters');
    expect(stored).toBeNull();
  });

  it('should check if filters exist in localStorage', () => {
    // Initially no filters
    expect(FilterStorageService.hasSavedFilters()).toBe(false);

    // After saving filters
    const filters: PluginSearchFilters = { minRating: 3 };
    FilterStorageService.saveFilters(filters);

    expect(FilterStorageService.hasSavedFilters()).toBe(true);
  });

  it('should handle malformed JSON gracefully', () => {
    localStorage.setItem('cartae-marketplace-filters', 'invalid json');

    const loaded = FilterStorageService.loadFilters();
    expect(loaded).toEqual({});
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw error
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const filters: PluginSearchFilters = { category: 'test' };

    // Should not throw error
    expect(() => FilterStorageService.saveFilters(filters)).not.toThrow();

    setItemSpy.mockRestore();
  });

  it('should handle complex filter objects', () => {
    const complexFilters: PluginSearchFilters = {
      category: 'developer',
      pricing: 'free',
      search: 'typescript',
      minRating: 4,
      minDownloads: 5000,
      tags: ['ui', 'components', 'library'],
      updatedAfter: '2024-01-01',
      sortBy: 'downloads',
      sortOrder: 'desc',
      logic: 'and',
    };

    FilterStorageService.saveFilters(complexFilters);
    const loaded = FilterStorageService.loadFilters();

    expect(loaded).toEqual(complexFilters);
  });
});
