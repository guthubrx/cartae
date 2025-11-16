/**
 * Timeline colorée par priorité IA
 *
 * Affiche une timeline d'items Office365 avec des couleurs
 * en fonction de leur priorité détectée par IA.
 */

import React, { useMemo } from 'react';
import type { EnrichedOffice365Item, PriorityLevel } from '../types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../types';

export interface PriorityTimelineProps {
  /**
   * Items à afficher dans la timeline
   */
  items: EnrichedOffice365Item[];

  /**
   * Callback quand un item est cliqué
   */
  onItemClick?: (item: EnrichedOffice365Item) => void;

  /**
   * Afficher les labels de date ?
   */
  showDateLabels?: boolean;

  /**
   * Afficher la légende des priorités ?
   */
  showLegend?: boolean;

  /**
   * Hauteur d'un item (px)
   */
  itemHeight?: number;

  /**
   * Espacement entre items (px)
   */
  itemSpacing?: number;
}

/**
 * Timeline colorée par priorité
 */
export const PriorityTimeline: React.FC<PriorityTimelineProps> = ({
  items,
  onItemClick,
  showDateLabels = true,
  showLegend = true,
  itemHeight = 60,
  itemSpacing = 8,
}) => {
  // Trier items par date (chronologique inversé, plus récent en haut)
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items]
  );

  // Grouper par jour
  const itemsByDay = useMemo(() => {
    const groups = new Map<string, EnrichedOffice365Item[]>();

    sortedItems.forEach(item => {
      const dayKey = new Date(item.createdAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey)!.push(item);
    });

    return groups;
  }, [sortedItems]);

  const getPriorityLevel = (item: EnrichedOffice365Item): PriorityLevel =>
    item.aiViz?.priority?.level || 'none';

  const getPriorityColor = (item: EnrichedOffice365Item): string =>
    item.aiViz?.priority?.color || PRIORITY_COLORS.none;

  const formatTime = (date: Date): string =>
    new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="priority-timeline" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Légende */}
      {showLegend && (
        <div
          className="timeline-legend"
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            padding: '12px',
            background: '#F8FAFC',
            borderRadius: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 600, color: '#475569' }}>Priorité :</span>
          {(Object.entries(PRIORITY_LABELS) as [PriorityLevel, string][]).map(([level, label]) => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: PRIORITY_COLORS[level],
                }}
              />
              <span style={{ fontSize: '14px', color: '#64748B' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline items groupés par jour */}
      <div className="timeline-days">
        {Array.from(itemsByDay.entries()).map(([dayLabel, dayItems]) => (
          <div key={dayLabel} className="timeline-day" style={{ marginBottom: '32px' }}>
            {/* Label du jour */}
            {showDateLabels && (
              <div
                className="day-label"
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'sticky',
                  top: 0,
                  background: 'white',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  zIndex: 10,
                }}
              >
                {dayLabel}
              </div>
            )}

            {/* Items du jour */}
            <div className="day-items" style={{ position: 'relative' }}>
              {/* Ligne verticale */}
              <div
                className="timeline-line"
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: '#E2E8F0',
                }}
              />

              {/* Items */}
              {dayItems.map(item => {
                const priorityColor = getPriorityColor(item);
                const priorityLevel = getPriorityLevel(item);

                return (
                  <div
                    key={item.id}
                    className="timeline-item"
                    onClick={() => onItemClick?.(item)}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      marginBottom: `${itemSpacing}px`,
                      paddingLeft: '24px',
                      minHeight: `${itemHeight}px`,
                      cursor: onItemClick ? 'pointer' : 'default',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (onItemClick) {
                        (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                    }}
                  >
                    {/* Dot coloré selon priorité */}
                    <div
                      className="timeline-dot"
                      style={{
                        position: 'relative',
                        left: '-16px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: priorityColor,
                        border: '3px solid white',
                        boxShadow: `0 0 0 2px ${priorityColor}33`,
                        flexShrink: 0,
                        marginTop: '4px',
                      }}
                    />

                    {/* Contenu de l'item */}
                    <div
                      className="item-content"
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: 'white',
                        border: `1px solid ${priorityColor}33`,
                        borderLeft: `4px solid ${priorityColor}`,
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      {/* Header : temps + priorité */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#64748B',
                            fontWeight: 500,
                          }}
                        >
                          {formatTime(new Date(item.createdAt))}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: `${priorityColor}22`,
                            color: priorityColor,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {PRIORITY_LABELS[priorityLevel]}
                        </span>
                      </div>

                      {/* Titre */}
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#1E293B',
                          marginBottom: '4px',
                          lineHeight: 1.4,
                        }}
                      >
                        {item.title}
                      </div>

                      {/* Metadata */}
                      {item.metadata?.from && (
                        <div style={{ fontSize: '13px', color: '#64748B' }}>
                          De : {item.metadata.from}
                        </div>
                      )}

                      {/* Indicators complémentaires */}
                      <div
                        style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}
                      >
                        {item.aiViz?.hasActionItems && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#DBEAFE',
                              color: '#1E40AF',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ✓ {item.aiViz.actionItemCount || 0} actions
                          </span>
                        )}
                        {item.aiViz?.hasDeadline && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#FEE2E2',
                              color: '#991B1B',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ⏰ Deadline
                          </span>
                        )}
                        {item.aiViz?.hasConnections && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#E0E7FF',
                              color: '#3730A3',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            🔗 {item.aiViz.connectionCount || 0} liens
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Message si aucun item */}
        {sortedItems.length === 0 && (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: '#94A3B8',
              fontSize: '14px',
            }}
          >
            Aucun email à afficher
          </div>
        )}
      </div>
    </div>
  );
};
