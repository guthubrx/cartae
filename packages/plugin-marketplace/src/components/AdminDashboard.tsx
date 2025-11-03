/**
 * AdminDashboard - Vue d'ensemble des statistiques marketplace pour admins
 * Nécessite authentification admin (GitHub OAuth)
 */

import React, { useEffect, useState } from 'react';
import { MarketplaceStats } from './MarketplaceStats';
import { ModerationQueue } from './ModerationQueue';
import { PluginAnalytics } from './PluginAnalytics';

export interface AdminDashboardProps {
  /** URL du registry (default: bigmind-registry) */
  registryUrl?: string;
  /** Callback pour vérifier si l'utilisateur est admin */
  isAdmin?: boolean;
  /** GitHub username de l'admin connecté */
  adminUsername?: string;
  /** Callback pour se déconnecter */
  onLogout?: () => void;
}

type TabType = 'overview' | 'moderation' | 'analytics';

export function AdminDashboard({
  registryUrl = 'https://bigmind-registry.workers.dev',
  isAdmin = false,
  adminUsername,
  onLogout
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuler vérification auth
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Protection: Seulement accessible aux admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            This dashboard is restricted to marketplace administrators only.
          </p>
          <p className="text-sm text-gray-500">
            Please log in with an authorized GitHub account.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"
          />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl">⚙️</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Marketplace Management & Analytics</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {adminUsername && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {adminUsername}
                  </p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('moderation')}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === 'moderation'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🛡️ Moderation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📈 Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <MarketplaceStats registryUrl={registryUrl} />
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="space-y-8">
            <ModerationQueue registryUrl={registryUrl} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <PluginAnalytics registryUrl={registryUrl} />
          </div>
        )}
      </main>
    </div>
  );
}
