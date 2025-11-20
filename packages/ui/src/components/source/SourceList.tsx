/**
 * SourceList - Liste de toutes les sources de données configurées
 *
 * Affiche la liste complète des sources (connectors) configurées :
 * - Office365 (Outlook Mail/Calendar/Contacts)
 * - Gmail
 * - Google Calendar
 * - Obsidian
 * - Markdown files
 * - Custom connectors
 *
 * Pour chaque source :
 * - État (actif, pause, erreur, sync en cours)
 * - Dernière synchronisation
 * - Nombre d'items synchronisés
 * - Actions (sync now, configure, disable, delete)
 *
 * Vue en liste ou grille de cartes.
 */

import React, { useState } from 'react';
import {
  Plus,
  RefreshCw,
  Settings,
  Pause,
  Play,
  Trash,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Search,
  Grid,
  List,
} from 'lucide-react';

/**
 * Type de connector
 */
export type ConnectorType =
  | 'office365-mail'
  | 'office365-calendar'
  | 'office365-contacts'
  | 'gmail'
  | 'google-calendar'
  | 'obsidian'
  | 'markdown'
  | 'custom';

/**
 * État d'une source
 */
export type SourceStatus = 'active' | 'paused' | 'error' | 'syncing' | 'pending';

/**
 * Configuration d'une source
 */
export interface DataSource {
  /**
   * ID unique
   */
  id: string;

  /**
   * Nom de la source (editable)
   */
  name: string;

  /**
   * Type de connector
   */
  connectorType: ConnectorType;

  /**
   * État actuel
   */
  status: SourceStatus;

  /**
   * Configuration (credentials, paths, etc.)
   */
  config: Record<string, any>;

  /**
   * Field mappings (source fields → CartaeItem fields)
   */
  mappings: Record<string, string>;

  /**
   * Dernière sync réussie
   */
  lastSync?: Date;

  /**
   * Prochaine sync planifiée
   */
  nextSync?: Date;

  /**
   * Nombre total d'items synchronisés
   */
  itemsCount: number;

  /**
   * Erreur courante (si status = error)
   */
  error?: string;

  /**
   * Date de création
   */
  createdAt: Date;

  /**
   * Date de modification
   */
  updatedAt: Date;
}

/**
 * Props pour SourceList
 */
export interface SourceListProps {
  /**
   * Sources à afficher
   */
  sources: DataSource[];

  /**
   * Callback quand source cliquée (pour afficher detail)
   */
  onSourceClick?: (source: DataSource) => void;

  /**
   * Callback pour sync now
   */
  onSync?: (source: DataSource) => void;

  /**
   * Callback pour configure
   */
  onConfigure?: (source: DataSource) => void;

  /**
   * Callback pour pause/resume
   */
  onTogglePause?: (source: DataSource) => void;

  /**
   * Callback pour delete
   */
  onDelete?: (source: DataSource) => void;

  /**
   * Callback pour créer nouvelle source
   */
  onCreateNew?: () => void;

  /**
   * Vue : liste ou grille
   */
  view?: 'list' | 'grid';

  /**
   * Afficher barre de recherche
   */
  showSearch?: boolean;

  /**
   * Style personnalisé
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

// Configuration visuelle par type de connector
const CONNECTOR_CONFIG: Record<ConnectorType, { label: string; color: string; icon: string }> = {
  'office365-mail': { label: 'Office 365 Mail', color: '#0078d4', icon: '📧' },
  'office365-calendar': { label: 'Office 365 Calendar', color: '#0078d4', icon: '📅' },
  'office365-contacts': { label: 'Office 365 Contacts', color: '#0078d4', icon: '👤' },
  gmail: { label: 'Gmail', color: '#ea4335', icon: '📬' },
  'google-calendar': { label: 'Google Calendar', color: '#4285f4', icon: '📆' },
  obsidian: { label: 'Obsidian', color: '#7c3aed', icon: '🔮' },
  markdown: { label: 'Markdown Files', color: '#64748b', icon: '📝' },
  custom: { label: 'Custom Connector', color: '#6b7280', icon: '🔌' },
};

// Configuration par status
const STATUS_CONFIG: Record<SourceStatus, { label: string; color: string; icon: React.FC<any> }> = {
  active: { label: 'Actif', color: '#10b981', icon: CheckCircle },
  paused: { label: 'En pause', color: '#f59e0b', icon: Pause },
  error: { label: 'Erreur', color: '#ef4444', icon: AlertCircle },
  syncing: { label: 'Sync...', color: '#3b82f6', icon: RefreshCw },
  pending: { label: 'En attente', color: '#6b7280', icon: Clock },
};

/**
 * Formater date relative
 */
const formatRelativeTime = (date: Date): string => {
  const now = Date.now();
  const diff = now - new Date(date).getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `il y a ${minutes}m`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;

  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
};

/**
 * SourceCard - Carte individuelle d'une source
 */
const SourceCard: React.FC<{
  source: DataSource;
  onClick?: (source: DataSource) => void;
  onSync?: (source: DataSource) => void;
  onConfigure?: (source: DataSource) => void;
  onTogglePause?: (source: DataSource) => void;
  onDelete?: (source: DataSource) => void;
}> = ({ source, onClick, onSync, onConfigure, onTogglePause, onDelete }) => {
  // Protection : si le connectorType n'existe pas dans CONNECTOR_CONFIG, utiliser 'custom' par défaut
  const connectorConfig = CONNECTOR_CONFIG[source.connectorType] || CONNECTOR_CONFIG.custom;
  const statusConfig = STATUS_CONFIG[source.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div
      onClick={() => onClick?.(source)}
      style={{
        padding: '16px',
        background: 'var(--color-background-secondary, #f9fafb)',
        border: `2px solid ${source.status === 'error' ? '#ef4444' : 'var(--color-border, #e5e7eb)'}`,
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        fontFamily: 'system-ui, sans-serif',
      }}
      onMouseEnter={e => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }
      }}
    >
      {/* Header : Icon + Name + Status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        {/* Icon */}
        <div
          style={{
            fontSize: '32px',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            background: `${connectorConfig.color}22`,
            flexShrink: 0,
          }}
        >
          {connectorConfig.icon}
        </div>

        {/* Name + Type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              fontSize: '15px',
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
              color: connectorConfig.color,
              fontWeight: 500,
            }}
          >
            {connectorConfig.label}
          </div>
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: `${statusConfig.color}22`,
            border: `1px solid ${statusConfig.color}44`,
            fontSize: '11px',
            fontWeight: 600,
            color: statusConfig.color,
            flexShrink: 0,
          }}
        >
          <StatusIcon size={12} />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '12px',
          padding: '12px',
          background: 'var(--color-background-primary, #ffffff)',
          borderRadius: '6px',
        }}
      >
        {/* Items Count */}
        <div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-text-tertiary, #9ca3af)',
              marginBottom: '4px',
            }}
          >
            Items synchronisés
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #1f2937)',
            }}
          >
            <Database size={14} style={{ color: '#6b7280' }} />
            {source.itemsCount.toLocaleString()}
          </div>
        </div>

        {/* Last Sync */}
        <div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-text-tertiary, #9ca3af)',
              marginBottom: '4px',
            }}
          >
            Dernière sync
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text-secondary, #6b7280)',
            }}
          >
            <Clock size={14} />
            {source.lastSync ? formatRelativeTime(source.lastSync) : 'Jamais'}
          </div>
        </div>
      </div>

      {/* Error Message (si error) */}
      {source.status === 'error' && source.error && (
        <div
          style={{
            padding: '10px 12px',
            marginBottom: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#991b1b',
            lineHeight: 1.4,
          }}
        >
          {source.error}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-border, #e5e7eb)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sync Now */}
        <button
          onClick={() => onSync?.(source)}
          disabled={source.status === 'syncing'}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 500,
            border: 'none',
            borderRadius: '6px',
            background: source.status === 'syncing' ? '#e5e7eb' : 'var(--color-primary, #3b82f6)',
            color: source.status === 'syncing' ? '#9ca3af' : '#ffffff',
            cursor: source.status === 'syncing' ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <RefreshCw size={14} />
          Sync
        </button>

        {/* Configure */}
        <button
          onClick={() => onConfigure?.(source)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            fontSize: '12px',
            border: '1px solid var(--color-border, #d1d5db)',
            borderRadius: '6px',
            background: 'var(--color-background-primary, #ffffff)',
            color: 'var(--color-text-secondary, #6b7280)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Settings size={14} />
        </button>

        {/* Pause/Resume */}
        <button
          onClick={() => onTogglePause?.(source)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            fontSize: '12px',
            border: '1px solid var(--color-border, #d1d5db)',
            borderRadius: '6px',
            background: 'var(--color-background-primary, #ffffff)',
            color: source.status === 'paused' ? '#10b981' : '#f59e0b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {source.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete?.(source)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            fontSize: '12px',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            background: '#fef2f2',
            color: '#ef4444',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Trash size={14} />
        </button>
      </div>
    </div>
  );
};

/**
 * SourceList - Composant principal
 */
export const SourceList: React.FC<SourceListProps> = ({
  sources,
  onSourceClick,
  onSync,
  onConfigure,
  onTogglePause,
  onDelete,
  onCreateNew,
  view = 'grid',
  showSearch = true,
  style,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'list' | 'grid'>(view);

  // Filter sources by search
  const filteredSources = sources.filter(source => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      source.name.toLowerCase().includes(query) ||
      CONNECTOR_CONFIG[source.connectorType].label.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: sources.length,
    active: sources.filter(s => s.status === 'active').length,
    paused: sources.filter(s => s.status === 'paused').length,
    errors: sources.filter(s => s.status === 'error').length,
    syncing: sources.filter(s => s.status === 'syncing').length,
  };

  return (
    <div
      className={`source-list ${className}`}
      style={{
        padding: '16px',
        background: 'var(--color-background-primary, #ffffff)',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #1f2937)',
            }}
          >
            Sources de données
          </h2>
          <div
            style={{
              marginTop: '4px',
              fontSize: '13px',
              color: 'var(--color-text-secondary, #6b7280)',
            }}
          >
            {stats.total} source{stats.total > 1 ? 's' : ''} configurée
            {stats.total > 1 ? 's' : ''} • {stats.active} active{stats.active > 1 ? 's' : ''}
            {stats.errors > 0 && ` • ${stats.errors} en erreur`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              border: '1px solid var(--color-border, #d1d5db)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setCurrentView('grid')}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: currentView === 'grid' ? '#3b82f6' : 'transparent',
                color: currentView === 'grid' ? '#ffffff' : '#6b7280',
                cursor: 'pointer',
              }}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setCurrentView('list')}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: currentView === 'list' ? '#3b82f6' : 'transparent',
                color: currentView === 'list' ? '#ffffff' : '#6b7280',
                cursor: 'pointer',
              }}
            >
              <List size={16} />
            </button>
          </div>

          {/* Create New Button */}
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '6px',
                background: 'var(--color-primary, #3b82f6)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={16} />
              Nouvelle source
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-tertiary, #9ca3af)',
            }}
          >
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une source..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              fontSize: '14px',
              border: '1px solid var(--color-border, #d1d5db)',
              borderRadius: '6px',
              background: 'var(--color-input-bg, #ffffff)',
              color: 'var(--color-text-primary, #1f2937)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Sources Grid/List */}
      {filteredSources.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              currentView === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr',
            gap: '16px',
          }}
        >
          {filteredSources.map(source => (
            <SourceCard
              key={source.id}
              source={source}
              onClick={onSourceClick}
              onSync={onSync}
              onConfigure={onConfigure}
              onTogglePause={onTogglePause}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '64px 32px',
            textAlign: 'center',
            color: 'var(--color-text-secondary, #9ca3af)',
            fontSize: '14px',
          }}
        >
          {searchQuery ? `Aucune source trouvée pour "${searchQuery}"` : 'Aucune source configurée'}
        </div>
      )}
    </div>
  );
};

export default SourceList;
