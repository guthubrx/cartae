/**
 * CartaeItemDetail - Vue détaillée complète d'un CartaeItem
 *
 * Modal ou sidebar affichant toutes les informations d'un item :
 * - Header (titre, type, source, dates)
 * - Metadata section (auteur, participants, priorité, status, progress, dates)
 * - Content section (markdown preview)
 * - Relationships section (graphe + liste)
 * - Actions (edit, delete, archive, share)
 */

import React, { useState } from 'react';
import type { CartaeItem } from '@cartae/core/types/CartaeItem';
import type { PriorityLevel } from '@cartae/core/types/CartaeMetadata';
import sanitizeHtml from 'sanitize-html';
import { TeamsMessagesThread } from '../teams/TeamsMessagesThread';
import {
  X,
  Edit,
  Trash2,
  Archive,
  Share2,
  Clock,
  User,
  Users,
  Calendar,
  MapPin,
  Tag,
  Link2,
  Star,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Mail,
  CheckSquare,
  MessageSquare,
  StickyNote,
  File,
  AlertCircle,
  TrendingUp,
  Code,
  Eye,
  ChevronDown,
} from 'lucide-react';

/**
 * Props pour CartaeItemDetail
 */
export interface CartaeItemDetailProps {
  /**
   * Item à afficher
   */
  item: CartaeItem;

  /**
   * Callback pour fermer le détail
   */
  onClose?: () => void;

  /**
   * Callback pour éditer l'item
   */
  onEdit?: (item: CartaeItem) => void;

  /**
   * Callback pour supprimer l'item
   */
  onDelete?: (item: CartaeItem) => void;

  /**
   * Callback pour archiver/désarchiver
   */
  onToggleArchive?: (item: CartaeItem) => void;

  /**
   * Callback pour partager
   */
  onShare?: (item: CartaeItem) => void;

  /**
   * Callback pour toggle favoris
   */
  onToggleFavorite?: (item: CartaeItem) => void;

  /**
   * Mode d'affichage
   */
  mode?: 'modal' | 'sidebar' | 'inline';

  /**
   * Afficher les relations ?
   */
  showRelationships?: boolean;

  /**
   * Afficher les AI insights ?
   */
  showAIInsights?: boolean;

  /**
   * Styles personnalisés
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

// Couleurs par type
const TYPE_COLORS: Record<string, string> = {
  email: '#3B82F6',
  task: '#10B981',
  document: '#8B5CF6',
  message: '#F59E0B',
  event: '#EF4444',
  note: '#EC4899',
  contact: '#06B6D4',
  file: '#64748B',
};

// Icônes par type
const TYPE_ICONS = {
  email: Mail,
  task: CheckSquare,
  document: FileText,
  message: MessageSquare,
  event: Calendar,
  note: StickyNote,
  contact: User,
  file: File,
};

// Couleurs par priorité
const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: '#64748B',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#991B1B',
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

/**
 * CartaeItemDetail - Vue détaillée complète
 */
export const CartaeItemDetail: React.FC<CartaeItemDetailProps> = ({
  item,
  onClose,
  onEdit,
  onDelete,
  onToggleArchive,
  onShare,
  onToggleFavorite,
  mode = 'modal',
  showRelationships = true,
  showAIInsights = true,
  style,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [office365Expanded, setOffice365Expanded] = useState(false);
  const TypeIcon = TYPE_ICONS[item.type] || FileText;
  const typeColor = TYPE_COLORS[item.type] || '#64748B';

  // Formatage dates
  const formatDate = (date: Date): string =>
    new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatRelativeTime = (date: Date): string => {
    const now = Date.now();
    const diff = now - new Date(date).getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    if (days < 7) return `il y a ${days} jour${days > 1 ? 's' : ''}`;

    return formatDate(date);
  };

  // Copy ID
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(item.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy ID:', error);
    }
  };

  // Actions handlers
  const handleEdit = () => onEdit?.(item);
  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet item ?')) {
      onDelete?.(item);
    }
  };
  const handleArchive = () => onToggleArchive?.(item);
  const handleShare = () => onShare?.(item);
  const handleFavorite = () => onToggleFavorite?.(item);

  // Nettoyer le HTML d'Outlook (retirer styles, simplifier)
  const cleanHtml = (html: string): string =>
    sanitizeHtml(html, {
      allowedTags: [
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        'a',
        'ul',
        'ol',
        'li',
        'blockquote',
        'div',
        'span',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th',
      ],
      allowedAttributes: {
        a: ['href'],
        '*': ['style'], // Garder quelques styles basiques
      },
      allowedStyles: {
        '*': {
          // Autoriser seulement les styles de texte basiques
          color: [/^#[0-9a-fA-F]{3,6}$/],
          'background-color': [/^#[0-9a-fA-F]{3,6}$/],
          'font-weight': [/^bold$/, /^normal$/],
          'text-align': [/^left$/, /^right$/, /^center$/],
        },
      },
      // Simplifier les tableaux Outlook
      transformTags: {
        table(tagName, attribs) {
          return {
            tagName: 'table',
            attribs: { style: 'max-width: 100%; border-collapse: collapse;' },
          };
        },
      },
    });

  // Extraire texte brut du HTML
  const getPlainText = (htmlOrText: string): string => {
    if (htmlOrText.trim().startsWith('<')) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanHtml(htmlOrText);
      const text = tempDiv.textContent || tempDiv.innerText || '';
      // Nettoyer : enlever espaces multiples
      return text.replace(/\s+/g, ' ').trim();
    }
    return htmlOrText;
  };

  // Détecter si HTML
  const isHtmlContent = (content: string): boolean => content.trim().startsWith('<');

  // Container styles selon mode
  const containerStyles: React.CSSProperties =
    mode === 'modal'
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
        }
      : mode === 'sidebar'
        ? {
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '600px',
            maxWidth: '100vw',
            background: 'var(--color-background-primary, #ffffff)',
            boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            overflowY: 'auto',
          }
        : {
            width: '100%',
            background: 'var(--color-background-primary, #ffffff)',
          };

  const contentStyles: React.CSSProperties =
    mode === 'modal'
      ? {
          background: 'var(--color-background-primary, #ffffff)',
          borderRadius: '12px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
          overflowX: 'hidden',
        }
      : {};

  return (
    <div
      className={`cartae-item-detail cartae-item-detail--${mode} ${className}`}
      style={{ ...containerStyles, ...style }}
      onClick={mode === 'modal' ? onClose : undefined}
    >
      <div
        style={contentStyles}
        onClick={e => {
          if (mode === 'modal') e.stopPropagation();
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            padding: '24px',
            borderBottom: '1px solid var(--color-border, #e5e7eb)',
            background: `linear-gradient(135deg, ${typeColor}11 0%, transparent 100%)`,
          }}
        >
          {/* Type Icon */}
          <div
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              background: `${typeColor}22`,
              flexShrink: 0,
            }}
          >
            <TypeIcon size={24} style={{ color: typeColor }} />
          </div>

          {/* Title + Meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-text-primary, #1f2937)',
                lineHeight: 1.3,
                marginBottom: '8px',
              }}
            >
              {item.title}
            </h2>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
              {/* Type */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: typeColor,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {item.type}
              </div>

              {/* Source */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-text-tertiary, #9ca3af)',
                }}
              >
                <ExternalLink size={14} />
                <span style={{ textTransform: 'capitalize' }}>{item.source.connector}</span>
              </div>

              {/* Updated */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-text-tertiary, #9ca3af)',
                }}
              >
                <Clock size={14} />
                <span>{formatRelativeTime(item.updatedAt)}</span>
              </div>

              {/* ID (copiable) */}
              <button
                onClick={handleCopyId}
                title="Copier l'ID"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  background: copied ? '#D1FAE5' : 'transparent',
                  border: copied ? '1px solid #10B981' : '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: copied ? '#065F46' : 'var(--color-text-tertiary, #9ca3af)',
                  fontFamily: 'monospace',
                  transition: 'all 0.2s ease',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{item.id.slice(0, 8)}...</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {onToggleFavorite && (
              <button
                onClick={handleFavorite}
                title={item.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                style={{
                  padding: '8px',
                  background: item.favorite ? '#FEF3C7' : 'transparent',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Star
                  size={18}
                  style={{
                    color: item.favorite ? '#F59E0B' : '#9CA3AF',
                    fill: item.favorite ? '#F59E0B' : 'none',
                  }}
                />
              </button>
            )}

            {onEdit && (
              <button
                onClick={handleEdit}
                title="Éditer"
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Edit size={18} style={{ color: '#6B7280' }} />
              </button>
            )}

            {onToggleArchive && (
              <button
                onClick={handleArchive}
                title={item.archived ? 'Désarchiver' : 'Archiver'}
                style={{
                  padding: '8px',
                  background: item.archived ? '#FEE2E2' : 'transparent',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Archive size={18} style={{ color: item.archived ? '#EF4444' : '#9CA3AF' }} />
              </button>
            )}

            {onShare && (
              <button
                onClick={handleShare}
                title="Partager"
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Share2 size={18} style={{ color: '#6B7280' }} />
              </button>
            )}

            {onDelete && (
              <button
                onClick={handleDelete}
                title="Supprimer"
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={18} style={{ color: '#EF4444' }} />
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                title="Fermer"
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} style={{ color: '#6B7280' }} />
              </button>
            )}
          </div>
        </div>

        {/* Body - Scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Metadata Section */}
          <div>
            <h3
              style={{
                margin: 0,
                marginBottom: '16px',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-text-primary, #1f2937)',
              }}
            >
              Informations
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Auteur */}
              {item.metadata.author && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <User size={16} style={{ color: '#6B7280', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                      Auteur
                    </div>
                    <div style={{ fontSize: '14px', color: '#1F2937' }}>{item.metadata.author}</div>
                  </div>
                </div>
              )}

              {/* Participants */}
              {item.metadata.participants && item.metadata.participants.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Users size={16} style={{ color: '#6B7280', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                      Participants
                    </div>
                    <div style={{ fontSize: '14px', color: '#1F2937' }}>
                      {item.metadata.participants.slice(0, 3).join(', ')}
                      {item.metadata.participants.length > 3 &&
                        ` +${item.metadata.participants.length - 3}`}
                    </div>
                  </div>
                </div>
              )}

              {/* Priorité */}
              {item.metadata.priority && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <AlertCircle
                    size={16}
                    style={{
                      color: PRIORITY_COLORS[item.metadata.priority],
                      marginTop: '2px',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                      Priorité
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: PRIORITY_COLORS[item.metadata.priority],
                        fontWeight: 600,
                      }}
                    >
                      {PRIORITY_LABELS[item.metadata.priority]}
                    </div>
                  </div>
                </div>
              )}

              {/* Status */}
              {item.metadata.status && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <TrendingUp
                    size={16}
                    style={{ color: '#6B7280', marginTop: '2px', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                      Status
                    </div>
                    <div
                      style={{ fontSize: '14px', color: '#1F2937', textTransform: 'capitalize' }}
                    >
                      {item.metadata.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Due Date */}
              {item.metadata.dueDate && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Calendar
                    size={16}
                    style={{ color: '#6B7280', marginTop: '2px', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                      Échéance
                    </div>
                    <div style={{ fontSize: '14px', color: '#1F2937' }}>
                      {formatDate(item.metadata.dueDate)}
                    </div>
                  </div>
                </div>
              )}

              {/* Location */}
              {item.metadata.location && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <MapPin size={16} style={{ color: '#6B7280', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                      Lieu
                    </div>
                    <div style={{ fontSize: '14px', color: '#1F2937' }}>
                      {item.metadata.location}
                    </div>
                  </div>
                </div>
              )}

              {/* Progress */}
              {item.metadata.progress !== undefined && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <TrendingUp
                    size={16}
                    style={{ color: '#6B7280', marginTop: '2px', flexShrink: 0 }}
                  />
                  <div style={{ width: '100%' }}>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                      Progression
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '8px',
                          background: '#E5E7EB',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${item.metadata.progress}%`,
                            height: '100%',
                            background: '#10B981',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937' }}>
                        {item.metadata.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Office365 Enriched Data */}
          {(item.metadata as any).office365 && (
            <details
              onToggle={e => setOffice365Expanded((e.target as HTMLDetailsElement).open)}
              style={{
                background: '#F0F9FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <summary
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1E40AF',
                  cursor: 'pointer',
                  marginBottom: office365Expanded ? '12px' : '0',
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'margin-bottom 0.2s ease',
                }}
              >
                <ChevronDown
                  size={20}
                  style={{
                    transform: office365Expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
                <span>📧 Données Office365 enrichies</span>
              </summary>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '12px',
                  marginTop: '12px',
                }}
              >
                {/* Render all Office365 fields */}
                {Object.entries((item.metadata as any).office365).map(
                  ([key, value]: [string, any]) => {
                    // Skip empty, null, undefined, or empty arrays
                    if (
                      value === null ||
                      value === undefined ||
                      value === '' ||
                      (Array.isArray(value) && value.length === 0)
                    ) {
                      return null;
                    }

                    // Format value based on type
                    let displayValue: React.ReactNode = null;

                    if (typeof value === 'string') {
                      // Truncate long strings
                      displayValue = value.length > 100 ? `${value.substring(0, 100)}...` : value;
                    } else if (typeof value === 'number') {
                      // Format numbers (especially sizes in bytes)
                      if (key.includes('Size') || key.includes('size')) {
                        const kb = value / 1024;
                        const mb = kb / 1024;
                        displayValue = mb > 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
                      } else {
                        displayValue = value.toString();
                      }
                    } else if (typeof value === 'boolean') {
                      displayValue = value ? '✅ Oui' : '❌ Non';
                    } else if (Array.isArray(value)) {
                      // Display arrays
                      if (key === 'attachments') {
                        displayValue = (
                          <div style={{ fontSize: '12px' }}>
                            {value.map((att: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '4px 0',
                                  borderBottom:
                                    idx < value.length - 1 ? '1px solid #DBEAFE' : 'none',
                                }}
                              >
                                📎 {att.name} ({(att.size / 1024).toFixed(1)} KB)
                              </div>
                            ))}
                          </div>
                        );
                      } else if (key === 'messages') {
                        displayValue = `${value.length} messages (cliquer pour voir)`;
                      } else if (key === 'members') {
                        displayValue = (
                          <div style={{ fontSize: '12px' }}>
                            {value.slice(0, 5).map((member: any, idx: number) => (
                              <div key={idx}>{member.displayName || member.email}</div>
                            ))}
                            {value.length > 5 && <div>+ {value.length - 5} autres</div>}
                          </div>
                        );
                      } else {
                        displayValue = `${value.length} élément(s)`;
                      }
                    } else if (typeof value === 'object') {
                      // Display objects
                      if (key === 'lastMessagePreview') {
                        displayValue = `${value.content?.substring(0, 50)}...`;
                      } else {
                        displayValue = `${JSON.stringify(value, null, 2).substring(0, 100)}...`;
                      }
                    }

                    // Convert camelCase to readable label
                    const label = key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())
                      .trim();

                    return displayValue ? (
                      <div
                        key={key}
                        style={{
                          padding: '8px',
                          background: '#FFFFFF',
                          borderRadius: '6px',
                          border: '1px solid #DBEAFE',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#6B7280',
                            marginBottom: '4px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#1F2937',
                            wordBreak: 'break-word',
                          }}
                        >
                          {displayValue}
                        </div>
                      </div>
                    ) : null;
                  }
                )}
              </div>
            </details>
          )}

          {/* Checklist Planner - affichage si type=task et checklist existe */}
          {item.type === 'task' && (item.metadata as any)?.taskDetails?.checklist && (
            <div
              style={{
                padding: '16px',
                background: '#F9FAFB',
                borderRadius: '8px',
                marginTop: '16px',
                border: '1px solid #E5E7EB',
              }}
            >
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>✅</span>
                <span>
                  Checklist ({(item.metadata as any).taskDetails.checklistCompletedCount || 0}/
                  {(item.metadata as any).taskDetails.checklistCount || 0})
                </span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(item.metadata as any).taskDetails.checklist.map((checklistItem: any) => (
                  <div
                    key={checklistItem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: 'white',
                      borderRadius: '4px',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checklistItem.isChecked}
                      disabled
                      style={{
                        cursor: 'not-allowed',
                        width: '16px',
                        height: '16px',
                        accentColor: '#10B981',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '14px',
                        textDecoration: checklistItem.isChecked ? 'line-through' : 'none',
                        color: checklistItem.isChecked ? '#9CA3AF' : '#374151',
                        flex: 1,
                      }}
                    >
                      {checklistItem.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages Teams - affichage si messages existent */}
          {(item.metadata as any)?.office365?.messages &&
            (item.metadata as any).office365.messages.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>💬</span>
                  <span>
                    Conversation Teams ({(item.metadata as any).office365.messages.length}{' '}
                    {(item.metadata as any).office365.messages.length > 1 ? 'messages' : 'message'})
                  </span>
                </h3>
                <TeamsMessagesThread messages={(item.metadata as any).office365.messages} />
              </div>
            )}

          {/* Catégories Outlook - affichage si catégories existent */}
          {(item.metadata as any)?.office365?.categories &&
            (item.metadata as any).office365.categories.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>🏷️</span>
                  <span>Catégories Outlook</span>
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    padding: '12px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  {(item.metadata as any).office365.categories.map(
                    (category: string, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          background: '#DBEAFE',
                          border: '1px solid #3B82F6',
                          fontSize: '13px',
                          color: '#1E40AF',
                          fontWeight: 500,
                        }}
                      >
                        {category}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary, #1f2937)',
                }}
              >
                Tags
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {item.tags.map(tag => (
                  <div
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: '#F3F4F6',
                      fontSize: '13px',
                      color: '#4B5563',
                    }}
                  >
                    <Tag size={12} />
                    <span>{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          {item.content && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary, #1f2937)',
                  }}
                >
                  Contenu
                </h3>

                {/* Toggle seulement si HTML */}
                {isHtmlContent(item.content) && (
                  <button
                    onClick={() => setShowHtmlSource(!showHtmlSource)}
                    title={showHtmlSource ? 'Afficher le texte brut' : 'Afficher le code source'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'transparent',
                      border: '1px solid var(--color-border, #e5e7eb)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--color-text-secondary, #6b7280)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background =
                        'var(--color-background-secondary, #f9fafb)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {showHtmlSource ? (
                      <>
                        <Eye size={14} />
                        <span>Texte</span>
                      </>
                    ) : (
                      <>
                        <Code size={14} />
                        <span>Source</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'var(--color-background-secondary, #f9fafb)',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: 'var(--color-text-secondary, #6b7280)',
                  overflowX: 'hidden',
                  width: '100%',
                  boxSizing: 'border-box',
                  whiteSpace: showHtmlSource ? 'pre-wrap' : 'normal',
                }}
              >
                {showHtmlSource ? (
                  // Code source HTML
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    {item.content}
                  </pre>
                ) : (
                  // HTML nettoyé par défaut (mieux que texte brut)
                  <div
                    dangerouslySetInnerHTML={{
                      __html: isHtmlContent(item.content) ? cleanHtml(item.content) : item.content,
                    }}
                    className="cartae-email-clean"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      lineHeight: 1.6,
                    }}
                  />
                )}
                <style>
                  {`
                    .cartae-email-clean {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                      font-size: 14px;
                    }
                    .cartae-email-clean table {
                      max-width: 100% !important;
                      border-collapse: collapse;
                    }
                    .cartae-email-clean td,
                    .cartae-email-clean th {
                      padding: 8px;
                      border: 1px solid #e5e7eb;
                    }
                    .cartae-email-clean img {
                      max-width: 100% !important;
                      height: auto !important;
                    }
                    .cartae-email-clean a {
                      color: #3B82F6;
                      text-decoration: underline;
                    }
                  `}
                </style>
              </div>
            </div>
          )}

          {/* Relationships */}
          {showRelationships && item.relationships && item.relationships.length > 0 && (
            <div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary, #1f2937)',
                }}
              >
                Relations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {item.relationships.map((rel, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: 'var(--color-background-secondary, #f9fafb)',
                      border: '1px solid var(--color-border, #e5e7eb)',
                      borderRadius: '8px',
                    }}
                  >
                    <Link2 size={16} style={{ color: '#6B7280', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#9CA3AF',
                          textTransform: 'capitalize',
                        }}
                      >
                        {rel.type}
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          color: '#1F2937',
                          fontFamily: 'monospace',
                        }}
                      >
                        {rel.targetId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {showAIInsights && item.metadata.aiInsights && (
            <div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary, #1f2937)',
                }}
              >
                Insights IA
              </h3>
              <div
                style={{
                  padding: '16px',
                  background: '#F3E8FF',
                  border: '1px solid #A855F7',
                  borderRadius: '8px',
                }}
              >
                {/* Summary */}
                {item.metadata.aiInsights.summary && (
                  <div style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6B21A8',
                        fontWeight: 600,
                        marginBottom: '6px',
                      }}
                    >
                      Résumé
                    </div>
                    <div style={{ fontSize: '14px', color: '#581C87', lineHeight: 1.5 }}>
                      {item.metadata.aiInsights.summary}
                    </div>
                  </div>
                )}

                {/* Topics */}
                {item.metadata.aiInsights.topics && item.metadata.aiInsights.topics.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6B21A8',
                        fontWeight: 600,
                        marginBottom: '6px',
                      }}
                    >
                      Thèmes détectés
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {item.metadata.aiInsights.topics.map(topic => (
                        <span
                          key={topic}
                          style={{
                            padding: '4px 8px',
                            background: '#E9D5FF',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#581C87',
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Source Info */}
          <div>
            <h3
              style={{
                margin: 0,
                marginBottom: '12px',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-text-primary, #1f2937)',
              }}
            >
              Source
            </h3>
            <div
              style={{
                padding: '12px',
                background: 'var(--color-background-secondary, #f9fafb)',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9CA3AF' }}>Connector: </span>
                <span style={{ color: '#1F2937', fontWeight: 600, textTransform: 'capitalize' }}>
                  {item.source.connector}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9CA3AF' }}>ID Original: </span>
                <span style={{ color: '#1F2937', fontFamily: 'monospace', fontSize: '11px' }}>
                  {item.source.originalId}
                </span>
              </div>
              <div>
                <span style={{ color: '#9CA3AF' }}>Dernière sync: </span>
                <span style={{ color: '#1F2937' }}>{formatDate(item.source.lastSync)}</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3
              style={{
                margin: 0,
                marginBottom: '12px',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-text-primary, #1f2937)',
              }}
            >
              Dates
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#9CA3AF' }}>Créé: </span>
                <span style={{ color: '#1F2937' }}>{formatDate(item.createdAt)}</span>
              </div>
              <div>
                <span style={{ color: '#9CA3AF' }}>Modifié: </span>
                <span style={{ color: '#1F2937' }}>{formatDate(item.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartaeItemDetail;
