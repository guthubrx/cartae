/**
 * AuthorDashboard - Analytics dashboard for plugin authors (Session 60D)
 */

import React, { useState, useEffect } from 'react';
import type { PluginListing } from '../types';
import { AnalyticsService, type AuthorAnalytics } from '../services/AnalyticsService';

export interface AuthorDashboardProps {
  authorId: string;
  plugins: PluginListing[];
  onViewPlugin?: (pluginId: string) => void;
}

export function AuthorDashboard({ authorId, plugins, onViewPlugin }: AuthorDashboardProps) {
  const [analytics, setAnalytics] = useState<AuthorAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        const authorAnalytics = AnalyticsService.getAuthorAnalytics(authorId, plugins);
        setAnalytics(authorAnalytics);
      } catch (error) {
        console.error('[AuthorDashboard] Failed to load analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [authorId, plugins]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">
          Analytics data will appear here as users interact with your plugins.
        </p>
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return String(num);
  };

  const formatPercentage = (value: number): string => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Author Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Analytics for your {analytics.totalPlugins} plugin
              {analytics.totalPlugins !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const data = AnalyticsService.exportAnalytics();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `analytics-${authorId}-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-blue-600 text-xl">📥</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Downloads</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analytics.totalDownloads)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 text-xl">⭐</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.averageRating.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-purple-600 text-xl">💬</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ratings</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analytics.totalRatings)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-yellow-600 text-xl">📈</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Rating Ratio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(analytics.performanceMetrics.installToRatingRatio)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Plugins */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Plugins</h2>
        <div className="space-y-3">
          {analytics.topPlugins.map((plugin, index) => (
            <div
              key={plugin.pluginId}
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              onClick={() => onViewPlugin?.(plugin.pluginId)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{plugin.pluginName}</h3>
                  <p className="text-sm text-gray-600">
                    {formatNumber(plugin.downloads)} downloads
                  </p>
                </div>
              </div>
              <span className="text-blue-600">→</span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Install to Rating Ratio</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatPercentage(analytics.performanceMetrics.installToRatingRatio)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">User Retention</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatPercentage(analytics.performanceMetrics.userRetention)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Growth</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Monthly Downloads</p>
              <p className="text-xl font-semibold text-gray-900">
                +{formatNumber(analytics.monthlyGrowth.downloads)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Monthly Ratings</p>
              <p className="text-xl font-semibold text-gray-900">
                +{formatNumber(analytics.monthlyGrowth.ratings)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Engagement</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Total Plugins</p>
              <p className="text-xl font-semibold text-gray-900">{analytics.totalPlugins}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatNumber(analytics.totalDownloads)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
