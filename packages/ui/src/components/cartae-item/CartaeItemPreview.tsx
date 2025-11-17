/**
 * CartaeItemPreview - Aperçu rapide d'un CartaeItem
 *
 * Popover/Tooltip léger affichant un résumé d'un item au survol :
 * - Thumbnail/Icon + titre + type
 * - Priorité + status
 * - Preview contenu (first 200 chars)
 * - Tags inline
 * - Author + date
 *
 * Composant optimisé pour affichage rapide sans ralentir l'UI.
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
  ExternalLink,
} from 'lucide-react';

/**
 * Props pour CartaeItemPreview
 */
export interface CartaeItemPreviewProps {
  /**
   * Item à prévisualiser
   */
  item: CartaeItem;

  /**
   * Position du preview (auto-detecté si non spécifié)
   */
  position?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Délai avant affichage (ms)
   */
  delay?: number;

  /**
   * Nombre max de caractères du contenu
   */
  contentPreviewLength?: number;

  /**
   * Nombre max de tags affichés
   */
  maxTags?: number;

  /**
   * Callback quand preview est cliqué
   */
  onClick?: (item: CartaeItem) => void;

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
 * CartaeItemPreview - Aperçu rapide
 */
export const CartaeItemPreview: React.FC<CartaeItemPreviewProps> = ({
  item,
  position = 'top',
  delay = 300,
  contentPreviewLength = 200,
  maxTags = 3,
  onClick,
  style,
  className = '',
}) => {
  const TypeIcon = TYPE_ICONS[item.type] || FileText;
  const typeColor = TYPE_COLORS[item.type] || '#64748B';

  // Formater dates
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

  // Tronquer contenu
  const truncateContent = (content: string, maxLength: number): string => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + '...';
  };

  // Tags limités
  const displayedTags = item.tags.slice(0, maxTags);
  const hiddenTagsCount = Math.max(0, item.tags.length - maxTags);

  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  return (
    <div
      className={`cartae-item-preview ${className}`}
      onClick={handleClick}
      style={{
        width: '320px',
        maxWidth: '90vw',
        padding: '12px',
        background: 'var(--color-background-primary, #ffffff)',
        border: `1px solid ${typeColor}44`,
        borderRadius: '8px',
        boxShadow: `0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px ${typeColor}22`,
        fontFamily: 'system-ui, sans-serif',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 2px ${typeColor}44`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px ${typeColor}22`;
        }
      }}
    >
      {/* Header : Icon + Title + Type */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        {/* Icon */}
        <div
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            background: `${typeColor}22`,
            flexShrink: 0,
          }}
        >
          <TypeIcon size={18} style={{ color: typeColor }} />
        </div>

        {/* Title + Type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #1f2937)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.3,
            }}
          >
            {item.title}
          </h4>
          <div
            style={{
              marginTop: '4px',
              fontSize: '11px',
              color: typeColor,
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {item.type}
          </div>
        </div>
      </div>

      {/* Badges row : Priority + Status */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {/* Priority Badge */}
        {item.metadata.priority && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: `${PRIORITY_COLORS[item.metadata.priority]}22`,
              border: `1px solid ${PRIORITY_COLORS[item.metadata.priority]}44`,
              fontSize: '10px',
              fontWeight: 600,
              color: PRIORITY_COLORS[item.metadata.priority],
            }}
          >
            <span>⚡</span>
            <span>{PRIORITY_LABELS[item.metadata.priority]}</span>
          </div>
        )}

        {/* Status Badge */}
        {item.metadata.status && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 8px',
              borderRadius: '6px',
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
      </div>

      {/* Content Preview */}
      {item.content && (
        <p
          style={{
            margin: 0,
            marginBottom: '10px',
            fontSize: '12px',
            color: 'var(--color-text-secondary, #6b7280)',
            lineHeight: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {truncateContent(item.content, contentPreviewLength)}
        </p>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {displayedTags.map((tag) => (
            <div
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: '#F3F4F6',
                fontSize: '10px',
                color: '#4B5563',
              }}
            >
              <Tag size={8} />
              <span>{tag}</span>
            </div>
          ))}
          {hiddenTagsCount > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 6px',
                borderRadius: '4px',
                background: '#E5E7EB',
                fontSize: '10px',
                color: '#6B7280',
                fontWeight: 600,
              }}
            >
              +{hiddenTagsCount}
            </div>
          )}
        </div>
      )}

      {/* Footer : Author + Source + Date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid var(--color-border, #e5e7eb)',
          fontSize: '10px',
          color: 'var(--color-text-tertiary, #9ca3af)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Author */}
          {item.metadata.author && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={10} />
              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.metadata.author}
              </span>
            </div>
          )}

          {/* Source */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ExternalLink size={10} />
            <span style={{ textTransform: 'capitalize' }}>{item.source.connector}</span>
          </div>
        </div>

        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={10} />
          <span>{formatRelativeTime(item.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook personnalisé pour gérer le preview avec délai
 */
export const useCartaeItemPreview = (delay: number = 300) => {
  const [showPreview, setShowPreview] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setShowPreview(true);
    }, delay);
  }, [delay]);

  const handleMouseLeave = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowPreview(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    showPreview,
    handleMouseEnter,
    handleMouseLeave,
  };
};

export default CartaeItemPreview;
