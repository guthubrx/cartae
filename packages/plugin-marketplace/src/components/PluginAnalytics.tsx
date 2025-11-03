/**
 * PluginAnalytics - Analytics détaillées par plugin
 * Permet de sélectionner un plugin et voir ses métriques (downloads, ratings trend, etc.)
 */

import React, { useEffect, useState } from 'react';
import { PluginStore } from '../PluginStore';
import { RatingService } from '../RatingService';
import type { PluginListing } from '../types';
import { DownloadChart } from './DownloadChart';
import { RatingTrendChart } from './RatingTrendChart';

export interface PluginAnalyticsProps {
  registryUrl?: string;
}

interface PluginMetrics {
  plugin: PluginListing;
  totalDownloads: number;
  totalRatings: number;
  averageRating: number;
  ratingDistribution: [number, number, number, number, number];
  downloadHistory: Array<{ date: string; count: number }>;
  ratingHistory: Array<{ date: string; average: number; count: number }>;
}

export function PluginAnalytics({
  registryUrl = 'https://bigmind-registry.workers.dev'
}: PluginAnalyticsProps) {
  const [plugins, setPlugins] = useState<PluginListing[]>([]);
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PluginMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pluginStore = new PluginStore(registryUrl);
  const ratingService = new RatingService();

  const loadPlugins = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await pluginStore.fetchPlugins({});
      setPlugins(data);

      // Auto-select first plugin
      if (data.length > 0 && !selectedPluginId) {
        setSelectedPluginId(data[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to load plugins:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPluginMetrics = async (pluginId: string) => {
    setLoadingMetrics(true);

    try {
      // Get plugin details
      const plugin = plugins.find(p => p.id === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      // Get rating stats
      const ratingStats = await ratingService.getRatingStats(pluginId);

      // Mock download history (30 days)
      // TODO: Replace with real data from analytics service
      const downloadHistory = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 100) + 20
        };
      });

      // Mock rating history (30 days)
      const ratingHistory = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          average: 3 + Math.random() * 2, // 3-5 stars
          count: Math.floor(Math.random() * 10)
        };
      });

      setMetrics({
        plugin,
        totalDownloads: plugin.downloads || 0,
        totalRatings: ratingStats.totalCount,
        averageRating: ratingStats.averageRating,
        ratingDistribution: ratingStats.distribution,
        downloadHistory,
        ratingHistory
      });
    } catch (err) {
      console.error('Failed to load plugin metrics:', err);
      alert(`Failed to load metrics: ${(err as Error).message}`);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadPlugins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryUrl]);

  useEffect(() => {
    if (selectedPluginId) {
      loadPluginMetrics(selectedPluginId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPluginId]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading plugins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Failed to load plugins</h3>
        <p className="text-red-700 text-sm">{error}</p>
        <button
          type="button"
          onClick={loadPlugins}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <span className="text-6xl mb-4 block">📊</span>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No plugins yet</h3>
        <p className="text-gray-600">Analytics will appear when plugins are published.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Plugin Analytics</h2>
        <p className="text-sm text-gray-600">Detailed metrics and trends per plugin</p>
      </div>

      {/* Plugin Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label htmlFor="plugin-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Plugin
        </label>
        <select
          id="plugin-select"
          value={selectedPluginId || ''}
          onChange={(e) => setSelectedPluginId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        >
          {plugins.map(plugin => (
            <option key={plugin.id} value={plugin.id}>
              {plugin.name} ({formatNumber(plugin.downloads || 0)} downloads)
            </option>
          ))}
        </select>
      </div>

      {/* Metrics */}
      {loadingMetrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading metrics...</p>
          </div>
        </div>
      )}

      {!loadingMetrics && metrics && (
        <div className="space-y-6">
          {/* Plugin Info Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-6">
              {metrics.plugin.icon ? (
                <img
                  src={metrics.plugin.icon}
                  alt={metrics.plugin.name}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-4xl">🧩</span>
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">{metrics.plugin.name}</h3>
                  {metrics.plugin.verified && (
                    <span className="text-blue-500 text-xl" title="Verified">
                      ✓
                    </span>
                  )}
                  {metrics.plugin.featured && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{metrics.plugin.description}</p>

                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Author:</span>{' '}
                    <span className="font-medium text-gray-900">
                      {typeof metrics.plugin.author === 'string'
                        ? metrics.plugin.author
                        : metrics.plugin.author.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Version:</span>{' '}
                    <span className="font-medium text-gray-900">{metrics.plugin.version}</span>
                  </div>
                  {metrics.plugin.category && (
                    <div>
                      <span className="text-gray-500">Category:</span>{' '}
                      <span className="font-medium text-gray-900 capitalize">
                        {metrics.plugin.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">⬇️</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(metrics.totalDownloads)}
              </p>
              <p className="text-sm text-gray-600">Total Downloads</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">⭐</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {metrics.averageRating.toFixed(1)}
              </p>
              <p className="text-sm text-gray-600">
                Average Rating ({metrics.totalRatings} reviews)
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📈</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(
                  metrics.downloadHistory.slice(-7).reduce((sum, d) => sum + d.count, 0)
                )}
              </p>
              <p className="text-sm text-gray-600">Downloads (Last 7 days)</p>
            </div>
          </div>

          {/* Charts */}
          <DownloadChart data={metrics.downloadHistory} />
          <RatingTrendChart data={metrics.ratingHistory} />

          {/* Rating Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map(starCount => {
                const count = metrics.ratingDistribution[starCount - 1];
                const percentage =
                  metrics.totalRatings > 0 ? (count / metrics.totalRatings) * 100 : 0;

                return (
                  <div key={starCount} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-20">
                      <span className="text-sm font-medium">{starCount}</span>
                      <span className="text-yellow-500">★</span>
                    </div>
                    <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-24 text-right">
                      <span className="text-sm">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
