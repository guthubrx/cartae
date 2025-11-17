/**
 * SourceSyncStatus - Widget de statut de synchronisation en temps réel
 *
 * Affiche le statut actuel d'une synchronisation :
 * - État global (idle, syncing, success, error)
 * - Progress bar (% items traités)
 * - Items traités / total
 * - Vitesse (items/sec)
 * - Durée écoulée / ETA
 * - Erreurs rencontrées
 * - Actions : cancel, retry
 *
 * Real-time updates via polling ou WebSocket
 */

import React, { useState, useEffect } from 'react';
import type { DataSource } from './SourceList';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  X,
  Play,
  Pause,
} from 'lucide-react';

/**
 * Sync status data
 */
export interface SyncStatus {
  /**
   * ID de la source
   */
  sourceId: string;

  /**
   * État actuel
   */
  status: 'idle' | 'pending' | 'syncing' | 'paused' | 'success' | 'error' | 'cancelled';

  /**
   * Progression (0-100)
   */
  progress: number;

  /**
   * Items traités
   */
  itemsProcessed: number;

  /**
   * Items total (estimé ou exact)
   */
  itemsTotal?: number;

  /**
   * Items réussis
   */
  itemsSuccess: number;

  /**
   * Items en erreur
   */
  itemsError: number;

  /**
   * Vitesse actuelle (items/sec)
   */
  speed?: number;

  /**
   * Temps écoulé (ms)
   */
  elapsed?: number;

  /**
   * ETA (ms restants estimés)
   */
  eta?: number;

  /**
   * Date de début
   */
  startedAt?: Date;

  /**
   * Date de fin
   */
  finishedAt?: Date;

  /**
   * Erreur courante (si status = error)
   */
  error?: string;

  /**
   * Logs récents
   */
  logs?: Array<{
    timestamp: Date;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>;
}

/**
 * Props pour SourceSyncStatus
 */
export interface SourceSyncStatusProps {
  /**
   * Source concernée
   */
  source: DataSource;

  /**
   * Statut de sync
   */
  syncStatus: SyncStatus;

  /**
   * Callback pour cancel sync
   */
  onCancel?: () => void;

  /**
   * Callback pour retry (si error)
   */
  onRetry?: () => void;

  /**
   * Callback pour pause/resume
   */
  onTogglePause?: () => void;

  /**
   * Afficher logs
   */
  showLogs?: boolean;

  /**
   * Compact mode (moins de détails)
   */
  compact?: boolean;

  /**
   * Style personnalisé
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

/**
 * Formater durée (ms → readable)
 */
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Configuration visuelle par status
 */
const STATUS_CONFIG = {
  idle: { label: 'Inactif', color: '#9ca3af', icon: Clock },
  pending: { label: 'En attente', color: '#f59e0b', icon: Clock },
  syncing: { label: 'Synchronisation...', color: '#3b82f6', icon: RefreshCw },
  paused: { label: 'En pause', color: '#f59e0b', icon: Pause },
  success: { label: 'Terminé', color: '#10b981', icon: CheckCircle },
  error: { label: 'Erreur', color: '#ef4444', icon: AlertCircle },
  cancelled: { label: 'Annulé', color: '#6b7280', icon: X },
};

/**
 * SourceSyncStatus - Composant principal
 */
export const SourceSyncStatus: React.FC<SourceSyncStatusProps> = ({
  source,
  syncStatus,
  onCancel,
  onRetry,
  onTogglePause,
  showLogs = false,
  compact = false,
  style,
  className = '',
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update elapsed time every second (si syncing)
  useEffect(() => {
    if (syncStatus.status === 'syncing' && syncStatus.startedAt) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [syncStatus.status, syncStatus.startedAt]);

  const config = STATUS_CONFIG[syncStatus.status];
  const StatusIcon = config.icon;

  // Calculer elapsed time live
  const elapsedMs = syncStatus.startedAt
    ? currentTime - new Date(syncStatus.startedAt).getTime()
    : syncStatus.elapsed || 0;

  return (
    <div
      className={`source-sync-status ${className}`}
      style={{
        padding: compact ? '12px' : '16px',
        background: 'var(--color-background-primary, #ffffff)',
        border: `2px solid ${config.color}44`,
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Header: Source + Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: compact ? '10px' : '14px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              fontSize: compact ? '14px' : '15px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #1f2937)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {source.name}
          </h4>
          <div
            style={{
              marginTop: '2px',
              fontSize: '12px',
              color: 'var(--color-text-secondary, #6b7280)',
              textTransform: 'capitalize',
            }}
          >
            {source.connectorType}
          </div>
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: `${config.color}22`,
            border: `1px solid ${config.color}44`,
            fontSize: '12px',
            fontWeight: 600,
            color: config.color,
            flexShrink: 0,
          }}
        >
          <StatusIcon
            size={14}
            className={syncStatus.status === 'syncing' ? 'spin' : ''}
          />
          {config.label}
        </div>
      </div>

      {/* Progress Bar (si syncing ou success/error) */}
      {['syncing', 'success', 'error', 'paused'].includes(syncStatus.status) && (
        <div style={{ marginBottom: compact ? '10px' : '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
              fontSize: '12px',
              color: 'var(--color-text-secondary, #6b7280)',
            }}
          >
            <span>
              {syncStatus.itemsProcessed}{syncStatus.itemsTotal ? ` / ${syncStatus.itemsTotal}` : ''} items
            </span>
            <span style={{ fontWeight: 600, color: config.color }}>
              {Math.round(syncStatus.progress)}%
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: '8px',
              background: 'var(--color-background-secondary, #f3f4f6)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${syncStatus.progress}%`,
                background: config.color,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid (si pas compact et syncing/success) */}
      {!compact && ['syncing', 'success', 'error'].includes(syncStatus.status) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '12px',
            marginBottom: '14px',
            padding: '12px',
            background: 'var(--color-background-secondary, #f9fafb)',
            borderRadius: '6px',
          }}
        >
          {/* Success */}
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-text-tertiary, #9ca3af)',
                marginBottom: '4px',
              }}
            >
              Réussis
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#10b981',
              }}
            >
              {syncStatus.itemsSuccess}
            </div>
          </div>

          {/* Errors */}
          {syncStatus.itemsError > 0 && (
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-tertiary, #9ca3af)',
                  marginBottom: '4px',
                }}
              >
                Erreurs
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#ef4444',
                }}
              >
                {syncStatus.itemsError}
              </div>
            </div>
          )}

          {/* Speed */}
          {syncStatus.speed !== undefined && syncStatus.status === 'syncing' && (
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-tertiary, #9ca3af)',
                  marginBottom: '4px',
                }}
              >
                Vitesse
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary, #1f2937)',
                }}
              >
                <Zap size={14} style={{ color: '#f59e0b' }} />
                {syncStatus.speed.toFixed(1)}/s
              </div>
            </div>
          )}

          {/* Elapsed Time */}
          {elapsedMs > 0 && (
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-tertiary, #9ca3af)',
                  marginBottom: '4px',
                }}
              >
                Durée
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary, #1f2937)',
                }}
              >
                <Clock size={14} />
                {formatDuration(elapsedMs)}
              </div>
            </div>
          )}

          {/* ETA */}
          {syncStatus.eta !== undefined && syncStatus.status === 'syncing' && (
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-tertiary, #9ca3af)',
                  marginBottom: '4px',
                }}
              >
                Reste
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary, #6b7280)',
                }}
              >
                {formatDuration(syncStatus.eta)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message (si error) */}
      {syncStatus.status === 'error' && syncStatus.error && (
        <div
          style={{
            padding: '10px 12px',
            marginBottom: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#991b1b',
            lineHeight: 1.4,
          }}
        >
          {syncStatus.error}
        </div>
      )}

      {/* Logs (si showLogs et logs présents) */}
      {showLogs && syncStatus.logs && syncStatus.logs.length > 0 && (
        <div
          style={{
            marginBottom: '12px',
            padding: '10px',
            background: 'var(--color-background-secondary, #f9fafb)',
            borderRadius: '6px',
            maxHeight: '150px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-tertiary, #9ca3af)',
              marginBottom: '8px',
            }}
          >
            LOGS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {syncStatus.logs.map((log) => (
              <div
                key={log.timestamp.getTime()}
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color:
                    log.level === 'error'
                      ? '#ef4444'
                      : log.level === 'warning'
                      ? '#f59e0b'
                      : '#6b7280',
                }}
              >
                [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(onCancel || onRetry || onTogglePause) && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Pause/Resume (si syncing) */}
          {syncStatus.status === 'syncing' && onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid var(--color-border, #d1d5db)',
                borderRadius: '6px',
                background: 'var(--color-background-secondary, #f9fafb)',
                color: 'var(--color-text-primary, #1f2937)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {syncStatus.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
              {syncStatus.status === 'paused' ? 'Reprendre' : 'Pause'}
            </button>
          )}

          {/* Cancel (si syncing) */}
          {syncStatus.status === 'syncing' && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid #fecaca',
                borderRadius: '6px',
                background: '#fef2f2',
                color: '#ef4444',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={14} />
              Annuler
            </button>
          )}

          {/* Retry (si error) */}
          {syncStatus.status === 'error' && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '6px',
                background: 'var(--color-primary, #3b82f6)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={14} />
              Réessayer
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SourceSyncStatus;
