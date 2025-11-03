/**
 * TrendingPlugins - Horizontal scrollable list of trending plugins (top downloads)
 */

import React, { useEffect, useState } from 'react';
import { PluginStore } from '../PluginStore';
import type { PluginListing } from '../types';

export interface TrendingPluginsProps {
  registryUrl?: string;
  onViewDetails?: (pluginId: string) => void;
  limit?: number;
}

export function TrendingPlugins({
  registryUrl = 'https://bigmind-registry.workers.dev',
  onViewDetails,
  limit = 10
}: TrendingPluginsProps) {
  const [plugins, setPlugins] = useState<PluginListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const store = new PluginStore(registryUrl);

  const loadTrendingPlugins = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch plugins sorted by downloads
      const data = await store.fetchPlugins({});
      const sorted = data.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      setPlugins(sorted.slice(0, limit));
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to load trending plugins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrendingPlugins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryUrl, limit]);

  const formatDownloads = (count?: number) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Trending</h2>
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600
              mx-auto mb-4`}
          />
          <p className="text-gray-600">Loading trending plugins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Failed to load trending plugins</h3>
        <p className="text-red-700 text-sm">{error}</p>
        <button
          type="button"
          onClick={loadTrendingPlugins}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (plugins.length === 0) {
    return null; // Don't show section if no trending plugins
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Trending</h2>
        <span className="text-sm text-gray-600">Most downloaded this week</span>
      </div>

      {/* Horizontal scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
          {plugins.map((plugin, index) => (
            <button
              key={plugin.id}
              type="button"
              onClick={() => onViewDetails?.(plugin.id)}
              className={`flex-shrink-0 w-72 bg-white border border-gray-200 rounded-lg p-4
                hover:shadow-md transition-shadow cursor-pointer text-left`}
            >
              {/* Rank badge */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold
                    text-white ${
                      index === 0
                        ? 'bg-yellow-500'
                        : index === 1
                          ? 'bg-gray-400'
                          : index === 2
                            ? 'bg-orange-600'
                            : 'bg-gray-300'
                    }`}
                >
                  {index + 1}
                </div>

                {/* Icon */}
                {plugin.icon ? (
                  <img
                    src={plugin.icon}
                    alt={plugin.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                    <span className="text-2xl">🧩</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{plugin.name}</h3>
                    {plugin.verified && (
                      <span className="text-blue-500" title="Verified">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {typeof plugin.author === 'string' ? plugin.author : plugin.author.name}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-700 line-clamp-2 mb-3">{plugin.description}</p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {plugin.rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span>{plugin.rating.toFixed(1)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span>⬇️</span>
                  <span className="font-semibold">{formatDownloads(plugin.downloads)}</span>
                </div>
                {plugin.category && (
                  <span
                    className={`px-2 py-0.5 bg-gray-100 text-gray-700 rounded capitalize
                      text-xs`}
                  >
                    {plugin.category}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Scroll hint (if many plugins) */}
      {plugins.length > 3 && (
        <p className="text-sm text-gray-500 text-center">← Scroll to see more →</p>
      )}
    </div>
  );
}
