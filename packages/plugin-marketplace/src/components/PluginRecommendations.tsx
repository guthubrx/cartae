/**
 * PluginRecommendations - Display plugin recommendations (Session 60B)
 */

import React, { useState, useEffect } from 'react';
import type { PluginListing } from '../types';
import { RecommendationService } from '../services/RecommendationService';
import { PluginCard } from './PluginCard';

export interface PluginRecommendationsProps {
  targetPlugin?: PluginListing;
  allPlugins: PluginListing[];
  installedPlugins: string[];
  onInstall: (pluginId: string) => void;
  onViewDetails: (pluginId: string) => void;
  title?: string;
  maxResults?: number;
  type?: 'similar' | 'cross-sell' | 'trending';
}

export function PluginRecommendations({
  targetPlugin,
  allPlugins,
  installedPlugins,
  onInstall,
  onViewDetails,
  title,
  maxResults = 6,
  type = 'similar',
}: PluginRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<PluginListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const recommendationService = RecommendationService.getInstance();

  useEffect(() => {
    if (!targetPlugin && type !== 'trending') {
      setRecommendations([]);
      return;
    }

    const loadRecommendations = async () => {
      setIsLoading(true);
      try {
        let results: PluginListing[] = [];

        switch (type) {
          case 'similar':
            if (targetPlugin) {
              results = recommendationService.getSimilarPlugins(targetPlugin, allPlugins, {
                maxResults,
              });
            }
            break;

          case 'cross-sell':
            if (targetPlugin) {
              results = recommendationService.getCrossSellPlugins(
                targetPlugin,
                allPlugins,
                maxResults
              );
            }
            break;

          case 'trending':
            results = recommendationService.getTrendingPlugins(allPlugins, maxResults);
            break;

          default:
            results = [];
        }

        setRecommendations(results);
      } catch (error) {
        console.error('[PluginRecommendations] Failed to load recommendations:', error);
        setRecommendations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [targetPlugin, allPlugins, type, maxResults, recommendationService]);

  // Generate appropriate title based on type
  const getTitle = () => {
    if (title) return title;

    switch (type) {
      case 'similar':
        return 'Similar Plugins';
      case 'cross-sell':
        return 'Plugins You Might Like';
      case 'trending':
        return 'Trending Plugins';
      default:
        return 'Recommended Plugins';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{getTitle()}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: maxResults }).map((_, index) => (
            <div key={index} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-300 rounded mb-2" />
              <div className="h-3 bg-gray-300 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-300 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{getTitle()}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map(plugin => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            installed={installedPlugins.includes(plugin.id)}
            onInstall={onInstall}
            onViewDetails={onViewDetails}
            compact
          />
        ))}
      </div>

      {recommendations.length === maxResults && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => onViewDetails('browse')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all plugins →
          </button>
        </div>
      )}
    </div>
  );
}
