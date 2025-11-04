/**
 * MarketplacePage - Demo complète du package @cartae/plugin-marketplace
 * Route: /marketplace
 */

import React, { useState } from 'react';
import {
  // Discovery
  PluginList,
  PluginDetails,
  FeaturedPlugins,
  TrendingPlugins,
  PluginFilters,

  // Performance Optimized
  usePluginsQuery,
  OptimizedPluginGrid,

  // Admin
  AdminDashboard,

  // Services
  PluginStore,

  // Types
  type PluginListing,
  type PluginSearchFilters,
} from '@cartae/plugin-marketplace';

const REGISTRY_URL = 'https://bigmind-registry.workers.dev';

export function MarketplacePage() {
  const [view, setView] = useState<'home' | 'browse' | 'details' | 'admin'>('home');
  const [selectedPlugin, setSelectedPlugin] = useState<PluginListing | null>(null);
  const [filters, setFilters] = useState<PluginSearchFilters>({});
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);

  const pluginStore = new PluginStore(REGISTRY_URL);

  // Use optimized query with caching
  const { data: plugins, isLoading, error, refetch } = usePluginsQuery(REGISTRY_URL, filters);

  const handleInstall = async (pluginId: string) => {
    try {
      console.log('[Marketplace] Installing plugin:', pluginId);
      await pluginStore.installPlugin(pluginId);
      setInstalledPlugins(prev => [...prev, pluginId]);
      alert(`Plugin ${pluginId} installed successfully!`);
    } catch (err) {
      console.error('[Marketplace] Install failed:', err);
      alert(`Failed to install: ${(err as Error).message}`);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    try {
      console.log('[Marketplace] Uninstalling plugin:', pluginId);
      await pluginStore.uninstallPlugin(pluginId);
      setInstalledPlugins(prev => prev.filter(id => id !== pluginId));
      alert(`Plugin ${pluginId} uninstalled successfully!`);
    } catch (err) {
      console.error('[Marketplace] Uninstall failed:', err);
      alert(`Failed to uninstall: ${(err as Error).message}`);
    }
  };

  const handleViewDetails = (pluginId: string) => {
    const plugin = plugins?.find(p => p.id === pluginId);
    if (plugin) {
      setSelectedPlugin(plugin);
      setView('details');
    }
  };

  // Render Home View
  const renderHome = () => (
    <div className="space-y-8 p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🧩 Plugin Marketplace</h1>
        <p className="text-gray-600">Discover, install, and rate plugins for Cartae</p>
      </div>

      {/* Featured Plugins */}
      <FeaturedPlugins
        registryUrl={REGISTRY_URL}
        onViewDetails={handleViewDetails}
        onInstall={handleInstall}
        limit={6}
      />

      {/* Trending Plugins */}
      <TrendingPlugins registryUrl={REGISTRY_URL} onViewDetails={handleViewDetails} limit={10} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <button
          type="button"
          onClick={() => setView('browse')}
          className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all text-center"
        >
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse All Plugins</h3>
          <p className="text-sm text-gray-600">Explore the full catalog with filters</p>
        </button>

        <button
          type="button"
          onClick={() => setView('admin')}
          className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-lg transition-all text-center"
        >
          <div className="text-4xl mb-3">⚙️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Dashboard</h3>
          <p className="text-sm text-gray-600">Manage ratings & analytics</p>
        </button>

        <button
          type="button"
          onClick={() => refetch()}
          className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-green-500 hover:shadow-lg transition-all text-center"
        >
          <div className="text-4xl mb-3">🔄</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Refresh Data</h3>
          <p className="text-sm text-gray-600">Clear cache & reload plugins</p>
        </button>
      </div>
    </div>
  );

  // Render Browse View
  const renderBrowse = () => (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browse Plugins</h1>
          <p className="text-gray-600">{plugins?.length || 0} plugins available</p>
        </div>
        <button
          type="button"
          onClick={() => setView('home')}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
        >
          ← Back to Home
        </button>
      </div>

      {/* Filters */}
      <PluginFilters filters={filters} onFiltersChange={setFilters} />

      {/* Plugin Grid with Optimization */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading plugins...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">Error: {error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && plugins && (
        <OptimizedPluginGrid
          plugins={plugins}
          installed={installedPlugins}
          onInstall={handleInstall}
          onViewDetails={handleViewDetails}
        />
      )}
    </div>
  );

  // Render Details View
  const renderDetails = () => {
    if (!selectedPlugin) return null;

    return (
      <PluginDetails
        plugin={selectedPlugin}
        installed={installedPlugins.includes(selectedPlugin.id)}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        onBack={() => setView('browse')}
      />
    );
  };

  // Render Admin View
  const renderAdmin = () => (
    <div>
      <div className="mb-6 px-6 pt-6">
        <button
          type="button"
          onClick={() => setView('home')}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
        >
          ← Back to Home
        </button>
      </div>

      <AdminDashboard
        registryUrl={REGISTRY_URL}
        isAdmin // TODO: Replace with real auth check
        adminUsername="demo-admin"
        onLogout={() => {
          alert('Logout clicked');
          setView('home');
        }}
      />
    </div>
  );

  // Main Render
  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'home' && renderHome()}
      {view === 'browse' && renderBrowse()}
      {view === 'details' && renderDetails()}
      {view === 'admin' && renderAdmin()}
    </div>
  );
}
