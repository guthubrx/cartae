/**
 * Admin Panel Component
 * Panneau de contrôle principal pour l'administration de Cartae
 */

import React, { useState, useEffect } from 'react';
import { MarketplaceSourceControl } from './MarketplaceSourceControl';
import { SourceHealthMonitor } from './SourceHealthMonitor';
import { UsageStatsPanel } from './UsageStatsPanel';
import { ConfigHistoryPanel } from './ConfigHistoryPanel';

type Tab = 'marketplace' | 'monitoring' | 'history' | 'settings';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('marketplace');

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Cartae Admin Panel</h1>
        <p className="admin-subtitle">Contrôle et monitoring du système</p>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setActiveTab('marketplace')}
        >
          🏪 Marketplace
        </button>
        <button
          className={`admin-tab ${activeTab === 'monitoring' ? 'active' : ''}`}
          onClick={() => setActiveTab('monitoring')}
        >
          📊 Monitoring
        </button>
        <button
          className={`admin-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Historique
        </button>
        <button
          className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Paramètres
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'marketplace' && (
          <div className="admin-section">
            <h2>Contrôle de la Source Marketplace</h2>
            <p className="section-description">
              Gérez la source des plugins marketplace. Les changements sont appliqués immédiatement
              à toutes les applications installées.
            </p>
            <MarketplaceSourceControl />
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="admin-section">
            <h2>Monitoring des Sources</h2>
            <p className="section-description">
              Surveillez l'état de santé et les performances des différentes sources.
            </p>
            <SourceHealthMonitor />
            <UsageStatsPanel />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="admin-section">
            <h2>Historique des Changements</h2>
            <p className="section-description">
              Consultez l'historique des modifications de configuration.
            </p>
            <ConfigHistoryPanel />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="admin-section">
            <h2>Paramètres</h2>
            <p className="section-description">
              Configurez les paramètres du plugin admin.
            </p>
            <div className="settings-placeholder">
              <p>Paramètres à venir...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
