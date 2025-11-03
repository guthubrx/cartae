/**
 * FeaturedPlugins - Carousel of featured/curated plugins
 */

import React, { useEffect, useState } from 'react';
import { PluginStore } from '../PluginStore';
import type { PluginListing } from '../types';
import { PluginCard } from './PluginCard';

export interface FeaturedPluginsProps {
  registryUrl?: string;
  onViewDetails?: (pluginId: string) => void;
  onInstall?: (pluginId: string) => Promise<void>;
  limit?: number;
}

export function FeaturedPlugins({
  registryUrl = 'https://bigmind-registry.workers.dev',
  onViewDetails,
  onInstall,
  limit = 6
}: FeaturedPluginsProps) {
  const [plugins, setPlugins] = useState<PluginListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const store = new PluginStore(registryUrl);

  const loadFeaturedPlugins = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await store.fetchPlugins({ featured: true });
      setPlugins(data.slice(0, limit));
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to load featured plugins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeaturedPlugins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryUrl, limit]);

  // Auto-scroll carousel every 5 seconds
  useEffect(() => {
    if (plugins.length <= 1) return undefined;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % plugins.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [plugins.length]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? plugins.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % plugins.length);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12">
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600
              mx-auto mb-4`}
          />
          <p className="text-gray-600">Loading featured plugins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Failed to load featured plugins</h3>
        <p className="text-red-700 text-sm">{error}</p>
        <button
          type="button"
          onClick={loadFeaturedPlugins}
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
        <span className="text-6xl mb-4 block">⭐</span>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No featured plugins yet</h3>
        <p className="text-gray-600">Check back soon for curated picks!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Featured Plugins</h2>
        <span className="text-sm text-gray-600">
          {currentIndex + 1} / {plugins.length}
        </span>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Navigation buttons */}
        {plugins.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 bg-white border
                border-gray-300 rounded-full shadow-lg hover:bg-gray-50 transition-colors`}
              aria-label="Previous plugin"
            >
              ←
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 bg-white border
                border-gray-300 rounded-full shadow-lg hover:bg-gray-50 transition-colors`}
              aria-label="Next plugin"
            >
              →
            </button>
          </>
        )}

        {/* Cards carousel */}
        <div className="overflow-hidden px-12">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {plugins.map(plugin => (
              <div key={plugin.id} className="w-full flex-shrink-0 px-2">
                <PluginCard
                  plugin={plugin}
                  installed={false}
                  onInstall={onInstall}
                  onViewDetails={onViewDetails}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {plugins.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              aria-label={`Go to plugin ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
