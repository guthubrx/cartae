/**
 * MarketplaceStats - Statistiques globales du marketplace
 * Vue d'ensemble: total plugins, downloads, ratings, etc.
 */

import React, { useEffect, useState } from 'react';
import { PluginStore } from '../PluginStore';
import { RatingService } from '../RatingService';

export interface MarketplaceStatsProps {
  registryUrl?: string;
}

interface StatsData {
  totalPlugins: number;
  totalDownloads: number;
  totalRatings: number;
  averageRating: number;
  pendingModerations: number;
  featuredPlugins: number;
  verifiedAuthors: number;
  categoriesCount: number;
}

export function MarketplaceStats({
  registryUrl = 'https://bigmind-registry.workers.dev'
}: MarketplaceStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pluginStore = new PluginStore(registryUrl);
  const ratingService = new RatingService();

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all plugins to compute stats
      const plugins = await pluginStore.fetchPlugins({});

      // Compute global stats
      const totalDownloads = plugins.reduce((sum, p) => sum + (p.downloads || 0), 0);
      const featuredCount = plugins.filter(p => p.featured).length;
      const verifiedCount = plugins.filter(p => p.verified).length;

      // Extract unique categories
      const categories = new Set(plugins.map(p => p.category).filter(Boolean));

      // Compute average rating across all plugins
      const pluginsWithRatings = plugins.filter(p => p.rating);
      const avgRating = pluginsWithRatings.length > 0
        ? pluginsWithRatings.reduce((sum, p) => sum + (p.rating || 0), 0) / pluginsWithRatings.length
        : 0;

      // Get pending moderation count
      const pendingResult = await ratingService.getPendingRatings(1, 1000);
      const pendingCount = pendingResult.total;

      // Count total ratings (sum across all plugins)
      let totalRatingsCount = 0;
      for (const plugin of plugins) {
        try {
          const pluginStats = await ratingService.getRatingStats(plugin.id);
          totalRatingsCount += pluginStats.totalCount;
        } catch (err) {
          // Skip if plugin has no ratings
          console.debug(`No ratings for plugin ${plugin.id}`);
        }
      }

      setStats({
        totalPlugins: plugins.length,
        totalDownloads,
        totalRatings: totalRatingsCount,
        averageRating: avgRating,
        pendingModerations: pendingCount,
        featuredPlugins: featuredCount,
        verifiedAuthors: verifiedCount,
        categoriesCount: categories.size
      });
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to load marketplace stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryUrl]);

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
          <p className="text-gray-600">Loading marketplace statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Failed to load statistics</h3>
        <p className="text-red-700 text-sm">{error}</p>
        <button
          type="button"
          onClick={loadStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Marketplace Overview</h2>
        <p className="text-sm text-gray-600">Global statistics and key metrics</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Plugins */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🧩</span>
            <span className="text-sm text-gray-500">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {formatNumber(stats.totalPlugins)}
          </p>
          <p className="text-sm text-gray-600">Plugins</p>
        </div>

        {/* Total Downloads */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">⬇️</span>
            <span className="text-sm text-gray-500">All-time</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {formatNumber(stats.totalDownloads)}
          </p>
          <p className="text-sm text-gray-600">Downloads</p>
        </div>

        {/* Total Ratings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">⭐</span>
            <span className="text-sm text-gray-500">Reviews</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {formatNumber(stats.totalRatings)}
          </p>
          <p className="text-sm text-gray-600">
            Avg: {stats.averageRating.toFixed(1)} ★
          </p>
        </div>

        {/* Pending Moderation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🛡️</span>
            <span className="text-sm text-gray-500">Queue</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {stats.pendingModerations}
          </p>
          <p className="text-sm text-gray-600">Pending Review</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Featured Plugins */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⭐</span>
            <span className="text-sm font-medium text-blue-900">Featured</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {stats.featuredPlugins}
          </p>
        </div>

        {/* Verified Authors */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✓</span>
            <span className="text-sm font-medium text-green-900">Verified</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {stats.verifiedAuthors}
          </p>
        </div>

        {/* Categories */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📁</span>
            <span className="text-sm font-medium text-purple-900">Categories</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {stats.categoriesCount}
          </p>
        </div>
      </div>

      {/* Health Indicators */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Indicators</h3>

        <div className="space-y-4">
          {/* Moderation Queue Health */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Moderation Queue</span>
              <span className={`text-sm font-semibold ${
                stats.pendingModerations === 0 ? 'text-green-600' :
                stats.pendingModerations < 10 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {stats.pendingModerations === 0 ? '✓ Clear' :
                 stats.pendingModerations < 10 ? '⚠ Low' :
                 '🔴 High'}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  stats.pendingModerations === 0 ? 'bg-green-500' :
                  stats.pendingModerations < 10 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{
                  width: `${Math.min(100, (stats.pendingModerations / 20) * 100)}%`
                }}
              />
            </div>
          </div>

          {/* Featured Coverage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Featured Coverage</span>
              <span className="text-sm font-semibold text-blue-600">
                {((stats.featuredPlugins / stats.totalPlugins) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{
                  width: `${(stats.featuredPlugins / stats.totalPlugins) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Verified Coverage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Verified Authors</span>
              <span className="text-sm font-semibold text-green-600">
                {((stats.verifiedAuthors / stats.totalPlugins) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${(stats.verifiedAuthors / stats.totalPlugins) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
