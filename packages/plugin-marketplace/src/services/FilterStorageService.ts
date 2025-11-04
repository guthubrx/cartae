/**
 * FilterStorageService - Persist filters in localStorage (Session 60A)
 */

import type { PluginSearchFilters } from '../types';

const STORAGE_KEY = 'cartae-marketplace-filters';

export class FilterStorageService {
  static saveFilters(filters: PluginSearchFilters): void {
    try {
      const serialized = JSON.stringify(filters);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.warn('[FilterStorage] Failed to save filters:', error);
    }
  }

  static loadFilters(): PluginSearchFilters {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[FilterStorage] Failed to load filters:', error);
    }
    return {};
  }

  static clearFilters(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[FilterStorage] Failed to clear filters:', error);
    }
  }

  static hasSavedFilters(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch (error) {
      return false;
    }
  }
}
