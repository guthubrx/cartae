/**
 * FavoritesList - Display user's favorite plugins (Session 60C)
 */

import React, { useState, useEffect } from 'react';
import type { PluginListing } from '../types';
import { FavoritesService } from '../services/FavoritesService';
import { PluginCard } from './PluginCard';

export interface FavoritesListProps {
  allPlugins: PluginListing[];
  installedPlugins: string[];
  onInstall: (pluginId: string) => void;
  onUninstall: (pluginId: string) => void;
  onViewDetails: (pluginId: string) => void;
  onToggleFavorite?: (pluginId: string) => void;
}

export function FavoritesList({
  allPlugins,
  installedPlugins,
  onInstall,
  onUninstall,
  onViewDetails,
  onToggleFavorite,
}: FavoritesListProps) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritePlugins, setFavoritePlugins] = useState<PluginListing[]>([]);

  useEffect(() => {
    const loadFavorites = () => {
      const favorites = FavoritesService.getFavorites();
      setFavoriteIds(favorites);

      const plugins = allPlugins.filter(plugin => favorites.includes(plugin.id));
      setFavoritePlugins(plugins);
    };

    loadFavorites();

    // Listen for storage changes (e.g., from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FavoritesService.STORAGE_KEY) {
        loadFavorites();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [allPlugins]);

  const handleToggleFavorite = (pluginId: string) => {
    const isNowFavorite = FavoritesService.toggleFavorite(pluginId);
    setFavoriteIds(FavoritesService.getFavorites());

    // Update local state
    if (!isNowFavorite) {
      setFavoritePlugins(prev => prev.filter(p => p.id !== pluginId));
    } else {
      const plugin = allPlugins.find(p => p.id === pluginId);
      if (plugin) {
        setFavoritePlugins(prev => [...prev, plugin]);
      }
    }

    // Call external callback if provided
    onToggleFavorite?.(pluginId);
  };

  const handleClearFavorites = () => {
    FavoritesService.clearFavorites();
    setFavoriteIds([]);
    setFavoritePlugins([]);
  };

  if (favoritePlugins.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">⭐</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Favorites Yet</h3>
        <p className="text-gray-600 mb-4">
          Start adding plugins to your favorites to see them here.
        </p>
        <button
          type="button"
          onClick={() => onViewDetails('browse')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Browse Plugins
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Favorites</h2>
          <p className="text-gray-600 mt-1">
            {favoritePlugins.length} plugin{favoritePlugins.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearFavorites}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Favorites grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favoritePlugins.map(plugin => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            installed={installedPlugins.includes(plugin.id)}
            onInstall={onInstall}
            onUninstall={onUninstall}
            onViewDetails={onViewDetails}
            isFavorite
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}
