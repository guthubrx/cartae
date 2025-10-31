/**
 * Config History Panel Component
 * Affiche l'historique des changements de configuration
 */

import React, { useState, useEffect } from 'react';
import { getConfigHistory, type SourceConfig } from '../services/MarketplaceConfigService';

interface HistoryEntry {
  id: string;
  config_key: string;
  config_value: SourceConfig;
  updated_at: string;
  updated_by_email?: string;
  updated_by_name?: string;
}

export const ConfigHistoryPanel: React.FC = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const entries = await getConfigHistory();
    setHistory(entries);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getConfigBadge = (config: SourceConfig) => {
    if (config.type === 'git') return { icon: '📦', label: 'Git', class: 'badge-git' };
    if (config.type === 'cloudflare') return { icon: '☁️', label: 'Cloudflare CDN', class: 'badge-cloudflare' };
    if (config.type === 'both') return { icon: '🔄', label: 'Hybride', class: 'badge-both' };
    return { icon: '❓', label: 'Inconnu', class: 'badge-unknown' };
  };

  if (loading) {
    return <div className="loading">Chargement de l'historique...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📜</div>
        <p>Aucun historique disponible</p>
      </div>
    );
  }

  return (
    <div className="history-panel">
      <div className="history-list">
        {history.map((entry, index) => {
          const badge = getConfigBadge(entry.config_value);
          const isLatest = index === 0;

          return (
            <div key={entry.id} className={`history-entry ${isLatest ? 'entry-latest' : ''}`}>
              {isLatest && <div className="latest-badge">✨ Actuel</div>}

              <div className="entry-header">
                <div className={`config-badge ${badge.class}`}>
                  {badge.icon} {badge.label}
                </div>
                <div className="entry-date">{formatDate(entry.updated_at)}</div>
              </div>

              <div className="entry-details">
                {entry.config_value.type === 'both' && (
                  <div className="detail-item">
                    <strong>Priorité:</strong>{' '}
                    {entry.config_value.priority.map((s: string) => (s === 'git' ? '📦 Git' : '☁️ CDN')).join(' → ')}
                  </div>
                )}

                {entry.config_value.gitUrl && (
                  <div className="detail-item">
                    <strong>Git URL:</strong>{' '}
                    <code className="url-code">{entry.config_value.gitUrl}</code>
                  </div>
                )}

                {entry.config_value.cloudflareUrl && (
                  <div className="detail-item">
                    <strong>CDN URL:</strong>{' '}
                    <code className="url-code">{entry.config_value.cloudflareUrl}</code>
                  </div>
                )}

                <div className="detail-item">
                  <strong>Health Check:</strong>{' '}
                  {entry.config_value.healthCheckEnabled ? '✅ Activé' : '❌ Désactivé'}
                </div>

                <div className="detail-item">
                  <strong>Fallback:</strong>{' '}
                  {entry.config_value.fallbackOnError ? '✅ Activé' : '❌ Désactivé'}
                </div>
              </div>

              {(entry.updated_by_email || entry.updated_by_name) && (
                <div className="entry-footer">
                  <div className="updated-by">
                    👤 Modifié par:{' '}
                    <strong>
                      {entry.updated_by_name || entry.updated_by_email || 'Système'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default ConfigHistoryPanel;
