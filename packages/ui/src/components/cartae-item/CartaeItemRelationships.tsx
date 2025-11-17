/**
 * CartaeItemRelationships - Graphe de relations entre CartaeItems
 *
 * Affiche les connexions d'un item avec d'autres items :
 * - WikiLinks bidirectionnels ([[item-title]])
 * - Références explicites (mentions, citations)
 * - Relations par tags communs
 * - Relations par source (même thread email, même dossier)
 * - Relations temporelles (même date/période)
 *
 * Vue graphique interactive avec nodes/edges ou liste structurée.
 */

import React, { useState, useMemo } from 'react';
import type { CartaeItem } from '@cartae/core/types/CartaeItem';
import {
  Link as LinkIcon,
  ArrowRight,
  ArrowLeft,
  Tag as TagIcon,
  Calendar,
  Folder,
  ExternalLink,
  Eye,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

/**
 * Types de relations possibles
 */
export type RelationType =
  | 'wikilink' // WikiLink bidirectionnel [[...]]
  | 'reference' // Mention/citation explicite
  | 'tag' // Tags communs
  | 'source' // Même source (thread, dossier)
  | 'temporal' // Même période temporelle
  | 'parent' // Relation parent-enfant
  | 'sibling'; // Relation frère-soeur

/**
 * Direction d'une relation
 */
export type RelationDirection = 'outgoing' | 'incoming' | 'bidirectional';

/**
 * Relation entre deux items
 */
export interface ItemRelation {
  /**
   * ID unique de la relation
   */
  id: string;

  /**
   * Type de relation
   */
  type: RelationType;

  /**
   * Direction
   */
  direction: RelationDirection;

  /**
   * Item cible
   */
  targetItem: CartaeItem;

  /**
   * Force de la relation (0-1)
   */
  strength?: number;

  /**
   * Context de la relation (texte autour du lien, etc.)
   */
  context?: string;

  /**
   * Metadata additionnelle
   */
  metadata?: Record<string, any>;
}

/**
 * Props pour CartaeItemRelationships
 */
export interface CartaeItemRelationshipsProps {
  /**
   * Item source dont on affiche les relations
   */
  item: CartaeItem;

  /**
   * Relations à afficher
   */
  relations: ItemRelation[];

  /**
   * Vue : graphe interactif ou liste
   */
  view?: 'graph' | 'list';

  /**
   * Filtrer par types de relations
   */
  filterTypes?: RelationType[];

  /**
   * Filtrer par direction
   */
  filterDirection?: RelationDirection;

  /**
   * Grouper par type
   */
  groupByType?: boolean;

  /**
   * Afficher force de relation (si disponible)
   */
  showStrength?: boolean;

  /**
   * Callback quand item cliqué
   */
  onItemClick?: (item: CartaeItem) => void;

  /**
   * Style personnalisé
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

// Configuration visuelle par type de relation
const RELATION_CONFIG: Record<
  RelationType,
  { icon: React.FC<any>; color: string; label: string }
> = {
  wikilink: {
    icon: LinkIcon,
    color: '#3b82f6',
    label: 'WikiLink',
  },
  reference: {
    icon: ExternalLink,
    color: '#8b5cf6',
    label: 'Référence',
  },
  tag: {
    icon: TagIcon,
    color: '#10b981',
    label: 'Tags communs',
  },
  source: {
    icon: Folder,
    color: '#f59e0b',
    label: 'Même source',
  },
  temporal: {
    icon: Calendar,
    color: '#ec4899',
    label: 'Temporelle',
  },
  parent: {
    icon: ArrowLeft,
    color: '#6366f1',
    label: 'Parent',
  },
  sibling: {
    icon: ArrowRight,
    color: '#06b6d4',
    label: 'Frère/Soeur',
  },
};

// Direction icons
const DIRECTION_ICONS = {
  outgoing: ArrowRight,
  incoming: ArrowLeft,
  bidirectional: LinkIcon,
};

/**
 * CartaeItemRelationships - Vue Liste
 */
const RelationshipsList: React.FC<{
  relations: ItemRelation[];
  groupByType: boolean;
  showStrength: boolean;
  onItemClick?: (item: CartaeItem) => void;
}> = ({ relations, groupByType, showStrength, onItemClick }) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<RelationType>>(
    new Set(Object.keys(RELATION_CONFIG) as RelationType[])
  );

  // Grouper relations par type
  const groupedRelations = useMemo(() => {
    if (!groupByType) {
      return { all: relations };
    }

    const groups: Record<string, ItemRelation[]> = {};
    relations.forEach((rel) => {
      if (!groups[rel.type]) {
        groups[rel.type] = [];
      }
      groups[rel.type].push(rel);
    });
    return groups;
  }, [relations, groupByType]);

  const toggleGroup = (type: RelationType) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (relations.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-secondary, #9ca3af)',
          fontSize: '14px',
        }}
      >
        Aucune relation trouvée
      </div>
    );
  }

  return (
    <div>
      {Object.entries(groupedRelations).map(([groupKey, groupRelations]) => {
        const relationType = groupKey as RelationType;
        const config = RELATION_CONFIG[relationType];
        const isExpanded = expandedGroups.has(relationType);
        const GroupIcon = config?.icon || LinkIcon;

        return (
          <div key={groupKey} style={{ marginBottom: '16px' }}>
            {/* Group Header (si groupByType) */}
            {groupByType && config && (
              <button
                onClick={() => toggleGroup(relationType)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  marginBottom: '8px',
                  background: `${config.color}11`,
                  border: `1px solid ${config.color}33`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${config.color}22`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${config.color}11`;
                }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <GroupIcon size={16} style={{ color: config.color }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: config.color }}>
                  {config.label}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary, #6b7280)',
                  }}
                >
                  {groupRelations.length}
                </span>
              </button>
            )}

            {/* Relations List (si expanded) */}
            {(!groupByType || isExpanded) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {groupRelations.map((relation) => {
                  const relConfig = RELATION_CONFIG[relation.type];
                  const DirectionIcon = DIRECTION_ICONS[relation.direction];
                  const RelIcon = relConfig.icon;

                  return (
                    <div
                      key={relation.id}
                      onClick={() => onItemClick?.(relation.targetItem)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: 'var(--color-background-secondary, #f9fafb)',
                        border: '1px solid var(--color-border, #e5e7eb)',
                        borderRadius: '6px',
                        cursor: onItemClick ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (onItemClick) {
                          (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                          (e.currentTarget as HTMLElement).style.borderColor = relConfig.color;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (onItemClick) {
                          (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                          (e.currentTarget as HTMLElement).style.borderColor =
                            'var(--color-border, #e5e7eb)';
                        }
                      }}
                    >
                      {/* Icon relation type */}
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: `${relConfig.color}22`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <RelIcon size={16} style={{ color: relConfig.color }} />
                      </div>

                      {/* Target Item Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--color-text-primary, #1f2937)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {relation.targetItem.title}
                        </div>

                        {relation.context && (
                          <div
                            style={{
                              marginTop: '4px',
                              fontSize: '12px',
                              color: 'var(--color-text-secondary, #6b7280)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {relation.context}
                          </div>
                        )}
                      </div>

                      {/* Direction + Strength */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexShrink: 0,
                        }}
                      >
                        {/* Direction Icon */}
                        <DirectionIcon
                          size={14}
                          style={{ color: 'var(--color-text-tertiary, #9ca3af)' }}
                        />

                        {/* Strength Bar */}
                        {showStrength && relation.strength !== undefined && (
                          <div
                            style={{
                              width: '40px',
                              height: '4px',
                              background: 'var(--color-border, #e5e7eb)',
                              borderRadius: '2px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${relation.strength * 100}%`,
                                height: '100%',
                                background: relConfig.color,
                              }}
                            />
                          </div>
                        )}

                        {/* Type Badge */}
                        <div
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: `${relConfig.color}22`,
                            fontSize: '10px',
                            fontWeight: 600,
                            color: relConfig.color,
                            textTransform: 'uppercase',
                          }}
                        >
                          {relation.targetItem.type}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * CartaeItemRelationships - Composant principal
 */
export const CartaeItemRelationships: React.FC<CartaeItemRelationshipsProps> = ({
  item,
  relations,
  view = 'list',
  filterTypes,
  filterDirection,
  groupByType = true,
  showStrength = false,
  onItemClick,
  style,
  className = '',
}) => {
  // Filtrer relations
  const filteredRelations = useMemo(() => {
    let filtered = [...relations];

    if (filterTypes && filterTypes.length > 0) {
      filtered = filtered.filter((r) => filterTypes.includes(r.type));
    }

    if (filterDirection) {
      filtered = filtered.filter((r) => r.direction === filterDirection);
    }

    return filtered;
  }, [relations, filterTypes, filterDirection]);

  // Stats
  const stats = useMemo(() => {
    const byType: Record<RelationType, number> = {} as any;
    const byDirection: Record<RelationDirection, number> = {} as any;

    filteredRelations.forEach((rel) => {
      byType[rel.type] = (byType[rel.type] || 0) + 1;
      byDirection[rel.direction] = (byDirection[rel.direction] || 0) + 1;
    });

    return { byType, byDirection, total: filteredRelations.length };
  }, [filteredRelations]);

  return (
    <div
      className={`cartae-item-relationships ${className}`}
      style={{
        padding: '16px',
        background: 'var(--color-background-primary, #ffffff)',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Header avec stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--color-border, #e5e7eb)',
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
          Relations ({stats.total})
        </h3>

        {/* Direction stats */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
          {stats.byDirection.outgoing > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowRight size={12} style={{ color: '#3b82f6' }} />
              <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
                {stats.byDirection.outgoing} sortantes
              </span>
            </div>
          )}
          {stats.byDirection.incoming > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={12} style={{ color: '#10b981' }} />
              <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
                {stats.byDirection.incoming} entrantes
              </span>
            </div>
          )}
          {stats.byDirection.bidirectional > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <LinkIcon size={12} style={{ color: '#8b5cf6' }} />
              <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
                {stats.byDirection.bidirectional} bidirectionnelles
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Relations Content */}
      {view === 'list' && (
        <RelationshipsList
          relations={filteredRelations}
          groupByType={groupByType}
          showStrength={showStrength}
          onItemClick={onItemClick}
        />
      )}

      {view === 'graph' && (
        <div
          style={{
            padding: '64px',
            textAlign: 'center',
            color: 'var(--color-text-secondary, #9ca3af)',
            fontSize: '14px',
          }}
        >
          Vue graphique interactive à implémenter (D3.js, vis.js, cytoscape, etc.)
        </div>
      )}
    </div>
  );
};

export default CartaeItemRelationships;
