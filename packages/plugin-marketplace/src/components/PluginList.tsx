/**
 * PluginList - Display a list of plugins with filters
 */

import React, { useEffect, useState } from 'react';
import { PluginStore } from '../PluginStore';
import type { PluginListing, PluginSearchFilters } from '../types';
import { PluginCard } from './PluginCard';
import { PluginFilters } from './PluginFilters';

export interface PluginListProps {
  registryUrl?: string;
  onInstall?: (pluginId: string) => Promise<void>;
  onUninstall?: (pluginId: string) => Promise<void>;
  onViewDetails?: (pluginId: string) => void;
}

export function PluginList({
  registryUrl = 'https://bigmind-registry.workers.dev',
  onInstall,
  onUninstall,
  onViewDetails,
}: PluginListProps) {
  const [plugins, setPlugins] = useState<PluginListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PluginSearchFilters>({});
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

  const store = new PluginStore(registryUrl);

  const loadPlugins = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await store.fetchPlugins(filters);
      setPlugins(data);
    } catch (err) {
      setError((err as Error).message);
      // eslint-disable-next-line no-console
      console.error('Failed to load plugins:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInstalledPlugins = () => {
    const installed = store.getInstalledPlugins();
    setInstalledIds(new Set(installed.map(p => p.id)));
  };

  useEffect(() => {
    loadPlugins();
    loadInstalledPlugins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleInstall = async (pluginId: string) => {
    if (onInstall) {
      await onInstall(pluginId);
      loadInstalledPlugins();
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (onUninstall) {
      await onUninstall(pluginId);
      loadInstalledPlugins();
    }
  };

  const handleFilterChange = (newFilters: PluginSearchFilters) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600
              mx-auto mb-4`}
          />
          <p className="text-gray-600">Loading plugins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <PluginFilters filters={filters} onFiltersChange={handleFilterChange} />

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {plugins.length} {plugins.length === 1 ? 'plugin' : 'plugins'} found
        </p>
      </div>

      {/* Grid */}
      {plugins.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <span className="text-6xl mb-4 block">🔍</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No plugins found</h3>
          <p className="text-gray-600">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plugins.map(plugin => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              installed={installedIds.has(plugin.id)}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
