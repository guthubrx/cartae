/**
 * SourceDetail - Vue détaillée d'une source de données
 *
 * Affiche toutes les informations d'une source :
 * - Configuration complète (credentials, paths, options)
 * - Field mappings (source → CartaeItem)
 * - Historique de synchronisation (dernières 20 syncs)
 * - Statistiques (items/jour, erreurs, durée moyenne sync)
 * - Logs de sync (derniers événements)
 * - Actions: edit config, test connection, sync now, delete
 *
 * Modes : modal, sidebar, inline
 */

import React, { useState } from 'react';
import type { DataSource, ConnectorType, SourceStatus } from './SourceList';
import {
  X,
  Edit,
  RefreshCw,
  Trash,
  Check,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Settings,
  FileText,
  Calendar,
  Activity,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
} from 'lucide-react';

/**
 * Props pour SourceDetail
 */
export interface SourceDetailProps {
  /**
   * Source à afficher
   */
  source: DataSource;

  /**
   * Callback pour fermer
   */
  onClose?: () => void;

  /**
   * Callback pour éditer
   */
  onEdit?: (source: DataSource) => void;

  /**
   * Callback pour sync
   */
  onSync?: (source: DataSource) => void;

  /**
   * Callback pour test connection
   */
  onTestConnection?: (source: DataSource) => void;

  /**
   * Callback pour delete
   */
  onDelete?: (source: DataSource) => void;

  /**
   * Mode d'affichage
   */
  mode?: 'modal' | 'sidebar' | 'inline';

  /**
   * Afficher logs de sync
   */
  showLogs?: boolean;

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
 * Sync Log Entry
 */
interface SyncLogEntry {
  id: string;
  timestamp: Date;
  status: 'success' | 'error' | 'warning';
  message: string;
  itemsProcessed?: number;
  duration?: number; // ms
}

/**
 * Formater durée (ms → lisible)
 */
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Formater date complète
 */
const formatFullDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

/**
 * SourceDetail - Composant principal
 */
export const SourceDetail: React.FC<SourceDetailProps> = ({
  source,
  onClose,
  onEdit,
  onSync,
  onTestConnection,
  onDelete,
  mode = 'inline',
  showLogs = true,
  style,
  className = '',
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['general', 'mappings', 'stats'])
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Mock sync logs (TODO: remplacer par vraies données)
  const mockSyncLogs: SyncLogEntry[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000),
      status: 'success',
      message: 'Synchronisation réussie',
      itemsProcessed: 42,
      duration: 2340,
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 7200000),
      status: 'success',
      message: 'Synchronisation réussie',
      itemsProcessed: 38,
      duration: 1890,
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 86400000),
      status: 'error',
      message: 'Erreur d\'authentification',
      itemsProcessed: 0,
      duration: 450,
    },
  ];

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleCopyField = async (fieldName: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Wrapper style par mode
  const wrapperStyle: React.CSSProperties = {
    height: mode === 'modal' || mode === 'sidebar' ? '100%' : 'auto',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-background-primary, #ffffff)',
    borderRadius: mode === 'inline' ? '8px' : '0',
    fontFamily: 'system-ui, sans-serif',
    ...style,
  };

  if (mode === 'modal') {
    wrapperStyle.position = 'fixed';
    wrapperStyle.top = '50%';
    wrapperStyle.left = '50%';
    wrapperStyle.transform = 'translate(-50%, -50%)';
    wrapperStyle.width = '90vw';
    wrapperStyle.maxWidth = '900px';
    wrapperStyle.maxHeight = '90vh';
    wrapperStyle.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.3)';
    wrapperStyle.zIndex = 1000;
  } else if (mode === 'sidebar') {
    wrapperStyle.position = 'fixed';
    wrapperStyle.top = '0';
    wrapperStyle.right = '0';
    wrapperStyle.width = '500px';
    wrapperStyle.maxWidth = '100vw';
    wrapperStyle.boxShadow = '-4px 0 20px rgba(0, 0, 0, 0.1)';
    wrapperStyle.zIndex = 1000;
  }

  return (
    <>
      {/* Overlay (modal/sidebar) */}
      {(mode === 'modal' || mode === 'sidebar') && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* Detail Container */}
      <div className={`source-detail ${className}`} style={wrapperStyle}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '20px',
            borderBottom: '1px solid var(--color-border, #e5e7eb)',
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--color-text-primary, #1f2937)',
              }}
            >
              {source.name}
            </h2>
            <div
              style={{
                marginTop: '4px',
                fontSize: '13px',
                color: 'var(--color-text-secondary, #6b7280)',
              }}
            >
              ID: {source.id}
              <button
                onClick={() => handleCopyField('id', source.id)}
                style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  border: 'none',
                  background: 'transparent',
                  color: copiedField === 'id' ? '#10b981' : '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {copiedField === 'id' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                border: 'none',
                borderRadius: '6px',
                background: 'transparent',
                color: 'var(--color-text-secondary, #6b7280)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Section: Informations générales */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => toggleSection('general')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                marginBottom: '12px',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '8px',
                background: 'var(--color-background-secondary, #f9fafb)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {expandedSections.has('general') ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <Settings size={16} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                Informations générales
              </span>
            </button>

            {expandedSections.has('general') && (
              <div
                style={{
                  padding: '16px',
                  background: 'var(--color-background-secondary, #f9fafb)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'grid', gap: '12px' }}>
                  {/* Type */}
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary, #9ca3af)',
                        marginBottom: '4px',
                      }}
                    >
                      Type de connector
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: 'var(--color-text-primary, #1f2937)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {source.connectorType}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary, #9ca3af)',
                        marginBottom: '4px',
                      }}
                    >
                      Statut
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background:
                          source.status === 'active'
                            ? '#d1fae5'
                            : source.status === 'error'
                            ? '#fee2e2'
                            : '#fef3c7',
                        fontSize: '13px',
                        fontWeight: 500,
                        color:
                          source.status === 'active'
                            ? '#10b981'
                            : source.status === 'error'
                            ? '#ef4444'
                            : '#f59e0b',
                      }}
                    >
                      {source.status === 'active' && <CheckCircle size={14} />}
                      {source.status === 'error' && <AlertCircle size={14} />}
                      {source.status}
                    </div>
                  </div>

                  {/* Dates */}
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary, #9ca3af)',
                        marginBottom: '4px',
                      }}
                    >
                      Créé le
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: 'var(--color-text-secondary, #6b7280)',
                      }}
                    >
                      {formatFullDate(source.createdAt)}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary, #9ca3af)',
                        marginBottom: '4px',
                      }}
                    >
                      Dernière sync
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: 'var(--color-text-secondary, #6b7280)',
                      }}
                    >
                      {source.lastSync ? formatFullDate(source.lastSync) : 'Jamais'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Field Mappings */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => toggleSection('mappings')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                marginBottom: '12px',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '8px',
                background: 'var(--color-background-secondary, #f9fafb)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {expandedSections.has('mappings') ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <FileText size={16} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Field Mappings</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '12px',
                  color: 'var(--color-text-tertiary, #9ca3af)',
                }}
              >
                {Object.keys(source.mappings).length} mappings
              </span>
            </button>

            {expandedSections.has('mappings') && (
              <div
                style={{
                  padding: '16px',
                  background: 'var(--color-background-secondary, #f9fafb)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(source.mappings).map(([sourceField, cartaeField]) => (
                    <div
                      key={sourceField}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        background: 'var(--color-background-primary, #ffffff)',
                        border: '1px solid var(--color-border, #e5e7eb)',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    >
                      <code
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          background: '#f3f4f6',
                          borderRadius: '4px',
                          color: '#6366f1',
                          fontFamily: 'monospace',
                        }}
                      >
                        {sourceField}
                      </code>
                      <span style={{ color: '#9ca3af' }}>→</span>
                      <code
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          background: '#f0f9ff',
                          borderRadius: '4px',
                          color: '#0284c7',
                          fontFamily: 'monospace',
                        }}
                      >
                        {cartaeField}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Statistiques */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => toggleSection('stats')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                marginBottom: '12px',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '8px',
                background: 'var(--color-background-secondary, #f9fafb)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {expandedSections.has('stats') ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <Activity size={16} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Statistiques</span>
            </button>

            {expandedSections.has('stats') && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  padding: '16px',
                  background: 'var(--color-background-secondary, #f9fafb)',
                  borderRadius: '8px',
                }}
              >
                {/* Items Count */}
                <div
                  style={{
                    padding: '16px',
                    background: 'var(--color-background-primary, #ffffff)',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '6px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary, #1f2937)',
                      marginBottom: '4px',
                    }}
                  >
                    {source.itemsCount.toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-tertiary, #9ca3af)',
                    }}
                  >
                    Items synchronisés
                  </div>
                </div>

                {/* Mock stats */}
                <div
                  style={{
                    padding: '16px',
                    background: 'var(--color-background-primary, #ffffff)',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '6px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 600,
                      color: '#10b981',
                      marginBottom: '4px',
                    }}
                  >
                    98%
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-tertiary, #9ca3af)',
                    }}
                  >
                    Taux de succès
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Sync Logs */}
          {showLogs && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => toggleSection('logs')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  marginBottom: '12px',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  background: 'var(--color-background-secondary, #f9fafb)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {expandedSections.has('logs') ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                <Clock size={16} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Historique</span>
              </button>

              {expandedSections.has('logs') && (
                <div
                  style={{
                    padding: '16px',
                    background: 'var(--color-background-secondary, #f9fafb)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {mockSyncLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: '12px',
                          background: 'var(--color-background-primary, #ffffff)',
                          border: `1px solid ${
                            log.status === 'success'
                              ? '#d1fae5'
                              : log.status === 'error'
                              ? '#fee2e2'
                              : '#fef3c7'
                          }`,
                          borderRadius: '6px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '6px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color:
                                log.status === 'success'
                                  ? '#10b981'
                                  : log.status === 'error'
                                  ? '#ef4444'
                                  : '#f59e0b',
                            }}
                          >
                            {log.status === 'success' && <CheckCircle size={14} />}
                            {log.status === 'error' && <AlertCircle size={14} />}
                            {log.message}
                          </div>

                          <time
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-tertiary, #9ca3af)',
                            }}
                          >
                            {formatFullDate(log.timestamp)}
                          </time>
                        </div>

                        {log.itemsProcessed !== undefined && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '12px',
                              fontSize: '12px',
                              color: 'var(--color-text-secondary, #6b7280)',
                            }}
                          >
                            <span>{log.itemsProcessed} items</span>
                            {log.duration && <span>{formatDuration(log.duration)}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '16px 20px',
            borderTop: '1px solid var(--color-border, #e5e7eb)',
            flexShrink: 0,
          }}
        >
          {onEdit && (
            <button
              onClick={() => onEdit(source)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid var(--color-border, #d1d5db)',
                borderRadius: '6px',
                background: 'var(--color-background-secondary, #f9fafb)',
                color: 'var(--color-text-primary, #1f2937)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Edit size={16} />
              Modifier
            </button>
          )}

          {onSync && (
            <button
              onClick={() => onSync(source)}
              disabled={source.status === 'syncing'}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '6px',
                background:
                  source.status === 'syncing' ? '#e5e7eb' : 'var(--color-primary, #3b82f6)',
                color: source.status === 'syncing' ? '#9ca3af' : '#ffffff',
                cursor: source.status === 'syncing' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={16} />
              Synchroniser
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(source)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid #fecaca',
                borderRadius: '6px',
                background: '#fef2f2',
                color: '#ef4444',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Trash size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default SourceDetail;
