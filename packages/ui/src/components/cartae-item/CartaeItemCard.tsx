/**
 * CartaeItemCard - Carte d'affichage compact pour CartaeItem
 *
 * Utilisée dans les listes, grilles, et vues compactes.
 * Affiche les informations essentielles d'un CartaeItem avec badges, tags, et actions.
 */

import React from 'react';
import type { CartaeItem } from '@cartae/core/types/CartaeItem';
import type { PriorityLevel } from '@cartae/core/types/CartaeMetadata';
import {
  FileText,
  Mail,
  CheckSquare,
  MessageSquare,
  Calendar,
  StickyNote,
  User,
  File,
  Clock,
  Tag,
  Star,
  Archive,
  MoreVertical,
} from 'lucide-react';

/**
 * Props pour CartaeItemCard
 */
export interface CartaeItemCardProps {
  /**
   * Item à afficher
   */
  item: CartaeItem;

  /**
   * Callback quand la carte est cliquée
   */
  onClick?: (item: CartaeItem) => void;

  /**
   * Callback pour action "favoris"
   */
  onToggleFavorite?: (item: CartaeItem) => void;

  /**
   * Callback pour action "archiver"
   */
  onToggleArchive?: (item: CartaeItem) => void;

  /**
   * Mode compact (hauteur réduite) ?
   */
  compact?: boolean;

  /**
   * Afficher les actions (favoris, archiver, etc.) ?
   */
  showActions?: boolean;

  /**
   * Badges à afficher
   */
  showBadges?: {
    type?: boolean;
    priority?: boolean;
    status?: boolean;
    source?: boolean;
    tags?: boolean;
  };

  /**
   * Nombre max de tags à afficher
   */
  maxTags?: number;

  /**
   * Styles personnalisés
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

// Couleurs par type d'item
const TYPE_COLORS: Record<string, string> = {
  email: '#3B82F6', // Bleu
  task: '#10B981', // Vert
  document: '#8B5CF6', // Violet
  message: '#F59E0B', // Orange
  event: '#EF4444', // Rouge
  note: '#EC4899', // Rose
  contact: '#06B6D4', // Cyan
  file: '#64748B', // Gris
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
  low: '#64748B', // Gris
  medium: '#F59E0B', // Orange
  high: '#EF4444', // Rouge
  urgent: '#991B1B', // Rouge foncé
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

/**
 * CartaeItemCard - Carte d'affichage compact
 */
export const CartaeItemCard: React.FC<CartaeItemCardProps> = ({
  item,
  onClick,
  onToggleFavorite,
  onToggleArchive,
  compact = false,
  showActions = true,
  showBadges = { type: true, priority: true, status: true, source: false, tags: true },
  maxTags = 3,
  style,
  className = '',
}) => {
  const TypeIcon = TYPE_ICONS[item.type] || FileText;
  const typeColor = TYPE_COLORS[item.type] || '#64748B';

  const handleCardClick = (e: React.MouseEvent) => {
    // Ne pas déclencher onClick si on clique sur les boutons d'action
    if ((e.target as HTMLElement).closest('.cartae-item-actions')) {
      return;
    }
    onClick?.(item);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(item);
  };

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleArchive?.(item);
  };

  // Limiter les tags affichés
  const displayedTags = item.tags.slice(0, maxTags);
  const hiddenTagsCount = Math.max(0, item.tags.length - maxTags);

  // Formater les dates
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

  return (
    <div
      className={`cartae-item-card ${className}`}
      onClick={handleCardClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '8px' : '12px',
        padding: compact ? '12px' : '16px',
        background: 'var(--color-background-primary, #ffffff)',
        border: '1px solid var(--color-border, #e5e7eb)',
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        fontFamily: 'system-ui, sans-serif',
        opacity: item.archived ? 0.6 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.borderColor = typeColor;
          (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 8px ${typeColor}22`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border, #e5e7eb)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }
      }}
    >
      {/* Header : Type + Title + Actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Type Icon */}
        {showBadges.type && (
          <div
            style={{
              width: compact ? '32px' : '36px',
              height: compact ? '32px' : '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: `${typeColor}22`,
              flexShrink: 0,
            }}
          >
            <TypeIcon size={compact ? 16 : 18} style={{ color: typeColor }} />
          </div>
        )}

        {/* Title + Badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: compact ? '14px' : '16px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #1f2937)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: compact ? 1 : 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.4,
            }}
          >
            {item.title}
          </h3>

          {/* Badges row */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            {/* Badge Priority */}
            {showBadges.priority && item.metadata.priority && (
              <div
                title={`Priorité ${PRIORITY_LABELS[item.metadata.priority]}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: `${PRIORITY_COLORS[item.metadata.priority]}22`,
                  border: `1px solid ${PRIORITY_COLORS[item.metadata.priority]}44`,
                  fontSize: '10px',
                  fontWeight: 600,
                  color: PRIORITY_COLORS[item.metadata.priority],
                }}
              >
                <span>⚡</span>
                {!compact && <span>{PRIORITY_LABELS[item.metadata.priority]}</span>}
              </div>
            )}

            {/* Badge Status */}
            {showBadges.status && item.metadata.status && (
              <div
                title={`Status: ${item.metadata.status}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#6B7280',
                  textTransform: 'capitalize',
                }}
              >
                {item.metadata.status.replace('_', ' ')}
              </div>
            )}

            {/* Badge Source */}
            {showBadges.source && (
              <div
                title={`Source: ${item.source.connector}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#1E40AF',
                  textTransform: 'capitalize',
                }}
              >
                {item.source.connector}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div
            className="cartae-item-actions"
            style={{ display: 'flex', gap: '4px', flexShrink: 0 }}
          >
            {/* Bouton Favoris */}
            {onToggleFavorite && (
              <button
                onClick={handleToggleFavorite}
                title={item.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <Star
                  size={16}
                  style={{
                    color: item.favorite ? '#F59E0B' : '#9CA3AF',
                    fill: item.favorite ? '#F59E0B' : 'none',
                  }}
                />
              </button>
            )}

            {/* Bouton Archiver */}
            {onToggleArchive && (
              <button
                onClick={handleToggleArchive}
                title={item.archived ? 'Désarchiver' : 'Archiver'}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <Archive size={16} style={{ color: item.archived ? '#EF4444' : '#9CA3AF' }} />
              </button>
            )}

            {/* Bouton More Options */}
            <button
              title="Plus d'options"
              style={{
                padding: '4px',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <MoreVertical size={16} style={{ color: '#9CA3AF' }} />
            </button>
          </div>
        )}
      </div>

      {/* Content preview (si pas compact) */}
      {!compact && item.content && (
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--color-text-secondary, #6b7280)',
            lineHeight: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {item.content}
        </p>
      )}

      {/* Tags */}
      {showBadges.tags && item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {displayedTags.map((tag) => (
            <div
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#F3F4F6',
                fontSize: '11px',
                color: '#4B5563',
              }}
            >
              <Tag size={10} />
              <span>{tag}</span>
            </div>
          ))}
          {hiddenTagsCount > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#E5E7EB',
                fontSize: '11px',
                color: '#6B7280',
                fontWeight: 600,
              }}
            >
              +{hiddenTagsCount}
            </div>
          )}
        </div>
      )}

      {/* Footer : Author + Date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--color-text-tertiary, #9ca3af)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {item.metadata.author && (
            <>
              <User size={12} />
              <span>{item.metadata.author}</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          <span>{formatRelativeTime(item.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default CartaeItemCard;
