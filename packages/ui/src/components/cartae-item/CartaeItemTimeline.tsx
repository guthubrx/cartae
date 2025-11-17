/**
 * CartaeItemTimeline - Timeline chronologique d'un CartaeItem
 *
 * Affiche l'historique complet d'un item :
 * - Création initiale
 * - Modifications (titre, contenu, metadata)
 * - Changements de statut/priorité
 * - Synchronisations (imports depuis sources)
 * - Relations créées/supprimées
 * - Commentaires/notes
 *
 * Timeline verticale avec icônes colorées par type d'événement.
 */

import React, { useMemo } from 'react';
import type { CartaeItem } from '@cartae/core/types/CartaeItem';
import {
  Plus,
  Edit,
  Check,
  AlertCircle,
  RefreshCw,
  Link as LinkIcon,
  Unlink,
  MessageSquare,
  Archive,
  Star,
  Trash,
  User,
  Calendar,
  Tag as TagIcon,
} from 'lucide-react';

/**
 * Types d'événements possibles
 */
export type TimelineEventType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'priority_changed'
  | 'synced'
  | 'relation_added'
  | 'relation_removed'
  | 'comment_added'
  | 'archived'
  | 'favorited'
  | 'deleted'
  | 'restored';

/**
 * Événement de timeline
 */
export interface TimelineEvent {
  /**
   * ID unique de l'événement
   */
  id: string;

  /**
   * Type d'événement
   */
  type: TimelineEventType;

  /**
   * Titre court de l'événement
   */
  title: string;

  /**
   * Description détaillée
   */
  description?: string;

  /**
   * Date de l'événement
   */
  timestamp: Date;

  /**
   * Auteur de l'événement
   */
  author?: string;

  /**
   * Metadata additionnelle (changements, valeurs avant/après, etc.)
   */
  metadata?: Record<string, any>;
}

/**
 * Props pour CartaeItemTimeline
 */
export interface CartaeItemTimelineProps {
  /**
   * Item dont on affiche la timeline
   */
  item: CartaeItem;

  /**
   * Événements personnalisés (en plus de ceux générés automatiquement)
   */
  customEvents?: TimelineEvent[];

  /**
   * Filtrer par types d'événements
   */
  filterTypes?: TimelineEventType[];

  /**
   * Afficher date relative (il y a X min) vs date complète
   */
  relativeTime?: boolean;

  /**
   * Nombre max d'événements affichés
   */
  maxEvents?: number;

  /**
   * Callback quand événement cliqué
   */
  onEventClick?: (event: TimelineEvent) => void;

  /**
   * Style personnalisé
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

// Configuration visuelle par type d'événement
const EVENT_CONFIG: Record<
  TimelineEventType,
  { icon: React.FC<any>; color: string; bgColor: string }
> = {
  created: {
    icon: Plus,
    color: '#10b981',
    bgColor: '#d1fae5',
  },
  updated: {
    icon: Edit,
    color: '#3b82f6',
    bgColor: '#dbeafe',
  },
  status_changed: {
    icon: Check,
    color: '#8b5cf6',
    bgColor: '#ede9fe',
  },
  priority_changed: {
    icon: AlertCircle,
    color: '#f59e0b',
    bgColor: '#fef3c7',
  },
  synced: {
    icon: RefreshCw,
    color: '#06b6d4',
    bgColor: '#cffafe',
  },
  relation_added: {
    icon: LinkIcon,
    color: '#ec4899',
    bgColor: '#fce7f3',
  },
  relation_removed: {
    icon: Unlink,
    color: '#64748b',
    bgColor: '#f1f5f9',
  },
  comment_added: {
    icon: MessageSquare,
    color: '#6366f1',
    bgColor: '#e0e7ff',
  },
  archived: {
    icon: Archive,
    color: '#71717a',
    bgColor: '#e4e4e7',
  },
  favorited: {
    icon: Star,
    color: '#fbbf24',
    bgColor: '#fef3c7',
  },
  deleted: {
    icon: Trash,
    color: '#ef4444',
    bgColor: '#fee2e2',
  },
  restored: {
    icon: RefreshCw,
    color: '#10b981',
    bgColor: '#d1fae5',
  },
};

/**
 * Générer événements automatiques depuis CartaeItem
 */
const generateEventsFromItem = (item: CartaeItem): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  // Événement création
  events.push({
    id: `${item.id}-created`,
    type: 'created',
    title: 'Item créé',
    description: `${item.type} créé${item.metadata.author ? ` par ${item.metadata.author}` : ''}`,
    timestamp: item.createdAt,
    author: item.metadata.author,
  });

  // Événement mise à jour (si différent de createdAt)
  if (item.updatedAt.getTime() !== item.createdAt.getTime()) {
    events.push({
      id: `${item.id}-updated`,
      type: 'updated',
      title: 'Item modifié',
      description: 'Dernière modification',
      timestamp: item.updatedAt,
      author: item.metadata.author,
    });
  }

  // Événement archivage
  if (item.archived) {
    events.push({
      id: `${item.id}-archived`,
      type: 'archived',
      title: 'Item archivé',
      description: 'Item déplacé vers les archives',
      timestamp: item.updatedAt, // On utilise updatedAt car on n'a pas la date d'archivage exacte
    });
  }

  // Événement favori
  if (item.favorite) {
    events.push({
      id: `${item.id}-favorited`,
      type: 'favorited',
      title: 'Ajouté aux favoris',
      description: 'Item marqué comme favori',
      timestamp: item.updatedAt,
    });
  }

  // Trier par date desc (plus récent en haut)
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

/**
 * Formater date relative
 */
const formatRelativeTime = (date: Date): string => {
  const now = Date.now();
  const diff = now - new Date(date).getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  const months = Math.floor(diff / 2592000000);
  const years = Math.floor(diff / 31536000000);

  if (seconds < 60) return `il y a ${seconds}s`;
  if (minutes < 60) return `il y a ${minutes}m`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;
  if (weeks < 4) return `il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
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
 * CartaeItemTimeline - Timeline chronologique
 */
export const CartaeItemTimeline: React.FC<CartaeItemTimelineProps> = ({
  item,
  customEvents = [],
  filterTypes,
  relativeTime = true,
  maxEvents,
  onEventClick,
  style,
  className = '',
}) => {
  // Combiner événements auto + custom
  const allEvents = useMemo(() => {
    const autoEvents = generateEventsFromItem(item);
    const combined = [...autoEvents, ...customEvents];

    // Filtrer par types si spécifié
    let filtered = filterTypes
      ? combined.filter((e) => filterTypes.includes(e.type))
      : combined;

    // Trier par date desc
    filtered = filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limiter nombre
    if (maxEvents) {
      filtered = filtered.slice(0, maxEvents);
    }

    return filtered;
  }, [item, customEvents, filterTypes, maxEvents]);

  if (allEvents.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-secondary, #9ca3af)',
          fontSize: '14px',
        }}
      >
        Aucun événement dans la timeline
      </div>
    );
  }

  return (
    <div
      className={`cartae-item-timeline ${className}`}
      style={{
        padding: '16px',
        background: 'var(--color-background-primary, #ffffff)',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Timeline verticale */}
      <div style={{ position: 'relative' }}>
        {/* Ligne verticale */}
        <div
          style={{
            position: 'absolute',
            left: '18px',
            top: '12px',
            bottom: '12px',
            width: '2px',
            background: 'var(--color-border, #e5e7eb)',
          }}
        />

        {/* Événements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {allEvents.map((event, index) => {
            const config = EVENT_CONFIG[event.type];
            const EventIcon = config.icon;
            const isClickable = Boolean(onEventClick);

            return (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                style={{
                  display: 'flex',
                  gap: '14px',
                  position: 'relative',
                  cursor: isClickable ? 'pointer' : 'default',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (isClickable) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isClickable) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                  }
                }}
              >
                {/* Icon circulaire */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: config.bgColor,
                    border: `2px solid ${config.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                >
                  <EventIcon size={16} style={{ color: config.color }} />
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, paddingTop: '2px' }}>
                  {/* Titre + Date */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '4px',
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary, #1f2937)',
                      }}
                    >
                      {event.title}
                    </h4>

                    <time
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-text-tertiary, #9ca3af)',
                        fontWeight: 500,
                        marginLeft: '12px',
                        flexShrink: 0,
                      }}
                      title={formatFullDate(event.timestamp)}
                    >
                      {relativeTime
                        ? formatRelativeTime(event.timestamp)
                        : formatFullDate(event.timestamp)}
                    </time>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: 'var(--color-text-secondary, #6b7280)',
                        lineHeight: 1.5,
                      }}
                    >
                      {event.description}
                    </p>
                  )}

                  {/* Auteur */}
                  {event.author && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '6px',
                        fontSize: '11px',
                        color: 'var(--color-text-tertiary, #9ca3af)',
                      }}
                    >
                      <User size={10} />
                      <span>{event.author}</span>
                    </div>
                  )}

                  {/* Metadata (changements avant/après) */}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 10px',
                        background: 'var(--color-background-secondary, #f9fafb)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary, #6b7280)',
                      }}
                    >
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <div key={key} style={{ marginBottom: '2px' }}>
                          <strong>{key}:</strong> {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message si tronqué */}
      {maxEvents && allEvents.length >= maxEvents && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'var(--color-background-secondary, #f9fafb)',
            border: '1px solid var(--color-border, #e5e7eb)',
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--color-text-secondary, #6b7280)',
          }}
        >
          Affichage limité à {maxEvents} événements les plus récents
        </div>
      )}
    </div>
  );
};

export default CartaeItemTimeline;
