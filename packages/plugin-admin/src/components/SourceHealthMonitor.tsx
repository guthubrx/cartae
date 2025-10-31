/**
 * Source Health Monitor Component
 * Affiche l'état de santé des sources en temps réel
 */

import React, { useState, useEffect } from 'react';

// Types pour le monitoring (à récupérer de l'app principale)
interface SourceHealthStatus {
  source: 'git' | 'cloudflare';
  healthy: boolean;
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}

// Mock pour le développement
const marketplaceSourceResolver = {
  getHealthStatus: (): SourceHealthStatus[] => [],
  reloadConfig: async () => {},
};

export const SourceHealthMonitor: React.FC = () => {
  const [healthStatuses, setHealthStatuses] = useState<SourceHealthStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHealth();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadHealth = async () => {
    const statuses = marketplaceSourceResolver.getHealthStatus();
    setHealthStatuses(statuses);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Force un reload de la config qui va déclencher des health checks
    await marketplaceSourceResolver.reloadConfig();
    // Attendre un peu pour que les health checks se fassent
    setTimeout(() => {
      loadHealth();
      setRefreshing(false);
    }, 1000);
  };

  return (
    <div className="health-monitor">
      <div className="monitor-header">
        <h3>État de Santé des Sources</h3>
        <button onClick={handleRefresh} disabled={refreshing} className="refresh-btn">
          {refreshing ? '🔄 Rafraîchissement...' : '🔄 Rafraîchir'}
        </button>
      </div>

      {healthStatuses.length === 0 ? (
        <div className="empty-state">
          Aucune donnée de santé disponible. Les health checks sont en cours...
        </div>
      ) : (
        <div className="health-grid">
          {healthStatuses.map(status => (
            <div key={status.source} className={`health-card health-${status.healthy ? 'healthy' : 'unhealthy'}`}>
              <div className="health-icon">
                {status.source === 'git' ? '📦' : '☁️'}
                {status.healthy ? ' ✅' : ' ❌'}
              </div>

              <div className="health-info">
                <h4>{status.source === 'git' ? 'Git' : 'Cloudflare CDN'}</h4>

                <div className="health-status">
                  {status.healthy ? 'Opérationnel' : 'Indisponible'}
                </div>

                {status.responseTime && (
                  <div className="health-metric">
                    ⏱️ Temps de réponse: <strong>{status.responseTime}ms</strong>
                  </div>
                )}

                <div className="health-metric">
                  🕐 Dernier check:{' '}
                  <strong>
                    {new Date(status.lastCheck).toLocaleTimeString('fr-FR')}
                  </strong>
                </div>

                {status.error && (
                  <div className="health-error">
                    ⚠️ {status.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default SourceHealthMonitor;
