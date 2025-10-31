/**
 * Usage Stats Panel Component
 * Affiche les statistiques d'utilisation des sources
 */

import React, { useState, useEffect } from 'react';

// Types pour les stats
interface ResolverStats {
  totalRequests: number;
  gitRequests: number;
  cloudflareRequests: number;
  fallbacks: number;
  errors: number;
  avgResponseTime: number;
}

// Mock pour le développement
const marketplaceSourceResolver = {
  getStats: (): ResolverStats => ({
    totalRequests: 0,
    gitRequests: 0,
    cloudflareRequests: 0,
    fallbacks: 0,
    errors: 0,
    avgResponseTime: 0,
  }),
  resetStats: () => {},
};

export const UsageStatsPanel: React.FC = () => {
  const [stats, setStats] = useState<ResolverStats | null>(null);

  useEffect(() => {
    loadStats();

    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(loadStats, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadStats = () => {
    const currentStats = marketplaceSourceResolver.getStats();
    setStats(currentStats);
  };

  const handleResetStats = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser les statistiques ?')) {
      marketplaceSourceResolver.resetStats();
      loadStats();
    }
  };

  if (!stats) {
    return <div className="loading">Chargement des statistiques...</div>;
  }

  const gitPercentage = stats.totalRequests > 0
    ? Math.round((stats.gitRequests / stats.totalRequests) * 100)
    : 0;

  const cloudflarePercentage = stats.totalRequests > 0
    ? Math.round((stats.cloudflareRequests / stats.totalRequests) * 100)
    : 0;

  const errorRate = stats.totalRequests > 0
    ? ((stats.errors / stats.totalRequests) * 100).toFixed(2)
    : '0.00';

  const fallbackRate = stats.totalRequests > 0
    ? ((stats.fallbacks / stats.totalRequests) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="stats-panel">
      <div className="panel-header">
        <h3>Statistiques d'Utilisation</h3>
        <button onClick={handleResetStats} className="reset-btn">
          🔄 Réinitialiser
        </button>
      </div>

      <div className="stats-grid">
        {/* Total Requests */}
        <div className="stat-card stat-primary">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Requêtes</div>
            <div className="stat-value">{stats.totalRequests.toLocaleString()}</div>
          </div>
        </div>

        {/* Git Requests */}
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-label">Requêtes Git</div>
            <div className="stat-value">{stats.gitRequests.toLocaleString()}</div>
            <div className="stat-percentage">{gitPercentage}% du total</div>
          </div>
        </div>

        {/* Cloudflare Requests */}
        <div className="stat-card">
          <div className="stat-icon">☁️</div>
          <div className="stat-content">
            <div className="stat-label">Requêtes CDN</div>
            <div className="stat-value">{stats.cloudflareRequests.toLocaleString()}</div>
            <div className="stat-percentage">{cloudflarePercentage}% du total</div>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-label">Temps Moyen</div>
            <div className="stat-value">{Math.round(stats.avgResponseTime)}ms</div>
            <div className="stat-percentage">Temps de résolution</div>
          </div>
        </div>

        {/* Fallbacks */}
        <div className="stat-card stat-warning">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-label">Fallbacks</div>
            <div className="stat-value">{stats.fallbacks.toLocaleString()}</div>
            <div className="stat-percentage">{fallbackRate}% du total</div>
          </div>
        </div>

        {/* Errors */}
        <div className="stat-card stat-error">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-label">Erreurs</div>
            <div className="stat-value">{stats.errors.toLocaleString()}</div>
            <div className="stat-percentage">{errorRate}% du total</div>
          </div>
        </div>
      </div>

      {/* Distribution Chart */}
      {stats.totalRequests > 0 && (
        <div className="distribution-chart">
          <h4>Distribution des Requêtes</h4>
          <div className="chart-bar">
            {stats.gitRequests > 0 && (
              <div
                className="chart-segment chart-git"
                style={{ width: `${gitPercentage}%` }}
                title={`Git: ${gitPercentage}%`}
              >
                {gitPercentage > 10 && `Git ${gitPercentage}%`}
              </div>
            )}
            {stats.cloudflareRequests > 0 && (
              <div
                className="chart-segment chart-cloudflare"
                style={{ width: `${cloudflarePercentage}%` }}
                title={`CDN: ${cloudflarePercentage}%`}
              >
                {cloudflarePercentage > 10 && `CDN ${cloudflarePercentage}%`}
              </div>
            )}
          </div>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-color legend-git"></span> Git ({stats.gitRequests})
            </span>
            <span className="legend-item">
              <span className="legend-color legend-cloudflare"></span> CDN ({stats.cloudflareRequests})
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsageStatsPanel;
