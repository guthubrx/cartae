/**
 * HistoryList - Display user's plugin viewing history (Session 60C)
 */

import React, { useState, useEffect } from 'react';
import type { PluginListing } from '../types';
import { HistoryService, type ViewHistoryItem } from '../services/HistoryService';
import { FavoritesService } from '../services/FavoritesService';

export interface HistoryListProps {
  allPlugins: PluginListing[];
  onViewDetails: (pluginId: string) => void;
  maxItems?: number;
}

export function HistoryList({ allPlugins, onViewDetails, maxItems = 20 }: HistoryListProps) {
  const [history, setHistory] = useState<ViewHistoryItem[]>([]);
  const [historyPlugins, setHistoryPlugins] = useState<PluginListing[]>([]);

  useEffect(() => {
    const loadHistory = () => {
      const recentHistory = HistoryService.getRecentHistory(maxItems);
      setHistory(recentHistory);

      const plugins = recentHistory
        .map(item => allPlugins.find(p => p.id === item.pluginId))
        .filter((p): p is PluginListing => p !== undefined);

      setHistoryPlugins(plugins);
    };

    loadHistory();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === HistoryService.STORAGE_KEY) {
        loadHistory();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [allPlugins, maxItems]);

  const handleRemoveFromHistory = (pluginId: string) => {
    HistoryService.removeFromHistory(pluginId);
    setHistory(prev => prev.filter(item => item.pluginId !== pluginId));
    setHistoryPlugins(prev => prev.filter(p => p.id !== pluginId));
  };

  const handleClearHistory = () => {
    HistoryService.clearHistory();
    setHistory([]);
    setHistoryPlugins([]);
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (historyPlugins.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🕒</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recent History</h3>
        <p className="text-gray-600">Your recently viewed plugins will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recently Viewed</h2>
          <p className="text-gray-600 mt-1">
            {historyPlugins.length} plugin{historyPlugins.length !== 1 ? 's' : ''} viewed
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearHistory}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
        >
          Clear History
        </button>
      </div>

      {/* History list */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {historyPlugins.map((plugin, index) => {
          const historyItem = history[index];
          const isFavorite = FavoritesService.isFavorite(plugin.id);

          return (
            <div
              key={plugin.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
              onClick={() => onViewDetails(plugin.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Plugin icon */}
                  {plugin.icon ? (
                    <img
                      src={plugin.icon}
                      alt={plugin.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🧩</span>
                    </div>
                  )}

                  {/* Plugin info */}
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {plugin.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      by {typeof plugin.author === 'string' ? plugin.author : plugin.author.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {plugin.category && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full capitalize">
                          {plugin.category}
                        </span>
                      )}
                      {isFavorite && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                          ⭐ Favorite
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Time ago */}
                  {historyItem && (
                    <span className="text-sm text-gray-500">
                      {formatTimeAgo(historyItem.viewedAt)}
                    </span>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveFromHistory(plugin.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                    title="Remove from history"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
