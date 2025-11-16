/**
 * Panneau de filtres pour métadonnées IA
 *
 * Permet de filtrer les items par :
 * - Priorité (critique, haute, moyenne, basse)
 * - Sentiment (très positif, positif, neutre, négatif, très négatif)
 * - Action items (avec/sans)
 * - Deadline (avec/sans)
 * - Connexions sémantiques (avec/sans)
 * - Plage de dates
 */

import React, { useState } from 'react';
import type { AIMetadataFilters, PriorityLevel, SentimentType } from '../types';
import { PRIORITY_COLORS, PRIORITY_LABELS, SENTIMENT_COLORS, SENTIMENT_LABELS } from '../types';

export interface AIMetadataFiltersPanelProps {
  /**
   * Filtres actuels
   */
  filters: AIMetadataFilters;

  /**
   * Callback quand les filtres changent
   */
  onFiltersChange: (filters: AIMetadataFilters) => void;

  /**
   * Mode compact (pour sidebar) ?
   */
  compact?: boolean;

  /**
   * Afficher le nombre d'items matchant ?
   */
  showCount?: boolean;

  /**
   * Nombre d'items matchant les filtres
   */
  matchingCount?: number;
}

/**
 * Panneau de filtres IA
 */
export const AIMetadataFiltersPanel: React.FC<AIMetadataFiltersPanelProps> = ({
  filters,
  onFiltersChange,
  compact = false,
  showCount = false,
  matchingCount,
}) => {
  const [expanded, setExpanded] = useState({
    priority: true,
    sentiment: true,
    flags: true,
    dates: false,
  });

  // Toggle une priorité dans les filtres
  const togglePriority = (level: PriorityLevel) => {
    const newPriorities = filters.priorities.includes(level)
      ? filters.priorities.filter(p => p !== level)
      : [...filters.priorities, level];

    onFiltersChange({ ...filters, priorities: newPriorities });
  };

  // Toggle un sentiment dans les filtres
  const toggleSentiment = (type: SentimentType) => {
    const newSentiments = filters.sentiments.includes(type)
      ? filters.sentiments.filter(s => s !== type)
      : [...filters.sentiments, type];

    onFiltersChange({ ...filters, sentiments: newSentiments });
  };

  // Toggle flag (action items, deadline, connexions)
  const toggleFlag = (flag: 'hasActionItems' | 'hasDeadline' | 'hasConnections') => {
    onFiltersChange({
      ...filters,
      [flag]: filters[flag] === true ? undefined : true,
    });
  };

  // Reset tous les filtres
  const resetFilters = () => {
    onFiltersChange({
      priorities: [],
      sentiments: [],
      hasActionItems: undefined,
      hasDeadline: undefined,
      hasConnections: undefined,
      dateRange: undefined,
    });
  };

  // Compter les filtres actifs
  const activeFiltersCount =
    filters.priorities.length +
    filters.sentiments.length +
    (filters.hasActionItems ? 1 : 0) +
    (filters.hasDeadline ? 1 : 0) +
    (filters.hasConnections ? 1 : 0) +
    (filters.dateRange ? 1 : 0);

  const SectionHeader: React.FC<{ title: string; section: keyof typeof expanded }> = ({
    title,
    section,
  }) => (
    <div
      onClick={() => setExpanded({ ...expanded, [section]: !expanded[section] })}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: compact ? '8px 0' : '12px 0',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: compact ? '13px' : '14px',
        color: '#334155',
        userSelect: 'none',
      }}
    >
      <span>{title}</span>
      <span
        style={{
          transform: expanded[section] ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
        }}
      >
        ▼
      </span>
    </div>
  );

  return (
    <div
      className="ai-filters-panel"
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: compact ? '12px' : '16px',
        background: '#F8FAFC',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
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
          <h3
            style={{
              margin: 0,
              fontSize: compact ? '14px' : '16px',
              fontWeight: 700,
              color: '#1E293B',
            }}
          >
            Filtres IA
          </h3>
          {showCount && matchingCount !== undefined && (
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              {matchingCount} résultat{matchingCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              background: 'white',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#475569',
              fontWeight: 500,
            }}
          >
            Réinitialiser ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Filtres Priorité */}
      <div className="filter-section" style={{ marginBottom: '20px' }}>
        <SectionHeader title="Priorité" section="priority" />
        {expanded.priority && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {(Object.entries(PRIORITY_LABELS) as [PriorityLevel, string][])
              .filter(([level]) => level !== 'none')
              .map(([level, label]) => {
                const isActive = filters.priorities.includes(level);
                return (
                  <label
                    key={level}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: isActive ? `${PRIORITY_COLORS[level]}11` : 'transparent',
                      border: `1px solid ${isActive ? PRIORITY_COLORS[level] : 'transparent'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => togglePriority(level)}
                      style={{ accentColor: PRIORITY_COLORS[level] }}
                    />
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: PRIORITY_COLORS[level],
                      }}
                    />
                    <span
                      style={{ fontSize: compact ? '12px' : '13px', color: '#475569', flex: 1 }}
                    >
                      {label}
                    </span>
                  </label>
                );
              })}
          </div>
        )}
      </div>

      {/* Filtres Sentiment */}
      <div className="filter-section" style={{ marginBottom: '20px' }}>
        <SectionHeader title="Sentiment" section="sentiment" />
        {expanded.sentiment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {(Object.entries(SENTIMENT_LABELS) as [SentimentType, string][]).map(
              ([type, label]) => {
                const isActive = filters.sentiments.includes(type);
                return (
                  <label
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: isActive ? `${SENTIMENT_COLORS[type]}11` : 'transparent',
                      border: `1px solid ${isActive ? SENTIMENT_COLORS[type] : 'transparent'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggleSentiment(type)}
                      style={{ accentColor: SENTIMENT_COLORS[type] }}
                    />
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: SENTIMENT_COLORS[type],
                      }}
                    />
                    <span
                      style={{ fontSize: compact ? '12px' : '13px', color: '#475569', flex: 1 }}
                    >
                      {label}
                    </span>
                  </label>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* Filtres Flags (action items, deadline, connexions) */}
      <div className="filter-section" style={{ marginBottom: '20px' }}>
        <SectionHeader title="Métadonnées" section="flags" />
        {expanded.flags && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '4px',
                background: filters.hasActionItems ? '#DBEAFE' : 'transparent',
                border: `1px solid ${filters.hasActionItems ? '#3B82F6' : 'transparent'}`,
              }}
            >
              <input
                type="checkbox"
                checked={filters.hasActionItems === true}
                onChange={() => toggleFlag('hasActionItems')}
                style={{ accentColor: '#3B82F6' }}
              />
              <span style={{ fontSize: compact ? '12px' : '13px', color: '#475569' }}>
                ✓ Avec actions à faire
              </span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '4px',
                background: filters.hasDeadline ? '#FEE2E2' : 'transparent',
                border: `1px solid ${filters.hasDeadline ? '#EF4444' : 'transparent'}`,
              }}
            >
              <input
                type="checkbox"
                checked={filters.hasDeadline === true}
                onChange={() => toggleFlag('hasDeadline')}
                style={{ accentColor: '#EF4444' }}
              />
              <span style={{ fontSize: compact ? '12px' : '13px', color: '#475569' }}>
                ⏰ Avec deadline
              </span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '4px',
                background: filters.hasConnections ? '#E0E7FF' : 'transparent',
                border: `1px solid ${filters.hasConnections ? '#6366F1' : 'transparent'}`,
              }}
            >
              <input
                type="checkbox"
                checked={filters.hasConnections === true}
                onChange={() => toggleFlag('hasConnections')}
                style={{ accentColor: '#6366F1' }}
              />
              <span style={{ fontSize: compact ? '12px' : '13px', color: '#475569' }}>
                🔗 Avec connexions
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Filtres Dates */}
      <div className="filter-section">
        <SectionHeader title="Plage de dates" section="dates" />
        {expanded.dates && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: compact ? '11px' : '12px', color: '#64748B' }}>
              Début
              <input
                type="date"
                value={
                  filters.dateRange?.start
                    ? filters.dateRange.start.toISOString().split('T')[0]
                    : ''
                }
                onChange={e => {
                  const start = e.target.value ? new Date(e.target.value) : undefined;
                  onFiltersChange({
                    ...filters,
                    dateRange: start
                      ? { start, end: filters.dateRange?.end || new Date() }
                      : undefined,
                  });
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  marginTop: '4px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              />
            </label>
            <label style={{ fontSize: compact ? '11px' : '12px', color: '#64748B' }}>
              Fin
              <input
                type="date"
                value={
                  filters.dateRange?.end ? filters.dateRange.end.toISOString().split('T')[0] : ''
                }
                onChange={e => {
                  const end = e.target.value ? new Date(e.target.value) : undefined;
                  onFiltersChange({
                    ...filters,
                    dateRange: end
                      ? { start: filters.dateRange?.start || new Date(), end }
                      : undefined,
                  });
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  marginTop: '4px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
