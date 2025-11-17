/**
 * SourceSyncHistory - Historique des synchronisations
 *
 * Affiche l'historique complet des syncs pour une source :
 * - Liste chronologique (desc)
 * - Pour chaque sync: date, durée, items traités, status, erreurs
 * - Filtres : status, date range
 * - Tri : date, durée, items
 * - Pagination
 * - Export CSV/JSON
 */

import React, { useState, useMemo } from 'react';
import type { DataSource } from './SourceList';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';

/**
 * Sync history entry
 */
export interface SyncHistoryEntry {
  id: string;
  sourceId: string;
  startedAt: Date;
  finishedAt: Date;
  status: 'success' | 'error' | 'cancelled';
  itemsProcessed: number;
  itemsSuccess: number;
  itemsError: number;
  duration: number; // ms
  error?: string;
}

/**
 * Props pour SourceSyncHistory
 */
export interface SourceSyncHistoryProps {
  source: DataSource;
  history: SyncHistoryEntry[];
  maxEntries?: number;
  showFilters?: boolean;
  onExport?: (format: 'csv' | 'json') => void;
  style?: React.CSSProperties;
  className?: string;
}

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const SourceSyncHistory: React.FC<SourceSyncHistoryProps> = ({
  source,
  history,
  maxEntries = 50,
  showFilters = true,
  onExport,
  style,
  className = '',
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    let filtered = [...history];
    if (filterStatus !== 'all') {
      filtered = filtered.filter((entry) => entry.status === filterStatus);
    }
    return filtered.slice(0, maxEntries);
  }, [history, filterStatus, maxEntries]);

  const stats = useMemo(() => {
    return {
      total: history.length,
      success: history.filter((e) => e.status === 'success').length,
      error: history.filter((e) => e.status === 'error').length,
      avgDuration:
        history.length > 0
          ? history.reduce((sum, e) => sum + e.duration, 0) / history.length
          : 0,
    };
  }, [history]);

  return (
    <div
      className={`source-sync-history ${className}`}
      style={{
        padding: '16px',
        background: 'var(--color-background-primary, #ffffff)',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Historique de synchronisation
          </h3>
          <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {source.name} • {stats.total} sync{stats.total > 1 ? 's' : ''} • {stats.success} réussie{stats.success > 1 ? 's' : ''}, {stats.error} erreur{stats.error > 1 ? 's' : ''}
          </div>
        </div>

        {onExport && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" onClick={() => onExport('csv')} style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Download size={12} />
              CSV
            </button>
            <button type="button" onClick={() => onExport('json')} style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Download size={12} />
              JSON
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {['all', 'success', 'error'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status as any)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: filterStatus === status ? '#3b82f6' : '#f9fafb',
                color: filterStatus === status ? '#ffffff' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {status === 'all' ? 'Tout' : status === 'success' ? 'Succès' : 'Erreurs'}
            </button>
          ))}
        </div>
      )}

      {/* History List */}
      {filteredHistory.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredHistory.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const successRate = entry.itemsProcessed > 0 ? (entry.itemsSuccess / entry.itemsProcessed) * 100 : 0;

            return (
              <div
                key={entry.id}
                style={{
                  padding: '12px',
                  background: '#f9fafb',
                  border: `1px solid ${entry.status === 'error' ? '#fecaca' : '#e5e7eb'}`,
                  borderRadius: '6px',
                }}
              >
                {/* Summary Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setExpandedId(isExpanded ? null : entry.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {entry.status === 'success' ? (
                      <CheckCircle size={18} style={{ color: '#10b981' }} />
                    ) : (
                      <AlertCircle size={18} style={{ color: '#ef4444' }} />
                    )}

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#1f2937' }}>
                        {formatDate(entry.startedAt)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                        {formatDuration(entry.duration)} • {entry.itemsProcessed} items • {successRate.toFixed(0)}% succès
                      </div>
                    </div>
                  </div>

                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Items traités</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                          {entry.itemsProcessed}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Réussis</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#10b981' }}>
                          {entry.itemsSuccess}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Erreurs</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>
                          {entry.itemsError}
                        </div>
                      </div>
                    </div>

                    {entry.error && (
                      <div style={{ marginTop: '12px', padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '12px', color: '#991b1b' }}>
                        {entry.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
          Aucun historique de synchronisation
        </div>
      )}
    </div>
  );
};

export default SourceSyncHistory;
