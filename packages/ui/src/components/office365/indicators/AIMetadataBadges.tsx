/**
 * Badges et indicateurs pour métadonnées IA
 *
 * Affiche des badges visuels pour :
 * - Priorité
 * - Sentiment
 * - Action items
 * - Deadline
 * - Connexions
 * - Résumé disponible
 */

import React from 'react';
import type { EnrichedOffice365Item, PriorityLevel, SentimentType } from '../types';
import { PRIORITY_COLORS, PRIORITY_LABELS, SENTIMENT_COLORS, SENTIMENT_LABELS } from '../types';

export interface AIMetadataBadgesProps {
  /**
   * Item dont afficher les badges
   */
  item: EnrichedOffice365Item;

  /**
   * Mode compact (icônes seulement) ?
   */
  compact?: boolean;

  /**
   * Badges à afficher (si undefined, affiche tous les badges disponibles)
   */
  show?: {
    priority?: boolean;
    sentiment?: boolean;
    actionItems?: boolean;
    deadline?: boolean;
    connections?: boolean;
    summary?: boolean;
  };
}

/**
 * Badges pour métadonnées IA
 */
export const AIMetadataBadges: React.FC<AIMetadataBadgesProps> = ({
  item,
  compact = false,
  show,
}) => {
  const showAll = !show;

  const badges: JSX.Element[] = [];

  // Badge Priorité
  if ((showAll || show?.priority) && item.aiViz?.priority) {
    const { level, score } = item.aiViz.priority;
    const color = PRIORITY_COLORS[level];
    const label = PRIORITY_LABELS[level];

    badges.push(
      <div
        key="priority"
        className="ai-badge priority-badge"
        title={`Priorité ${label} (score: ${score.toFixed(2)})`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? '4px' : '6px',
          padding: compact ? '3px 6px' : '4px 8px',
          borderRadius: '12px',
          background: `${color}22`,
          border: `1px solid ${color}44`,
          fontSize: compact ? '10px' : '11px',
          fontWeight: 600,
          color,
        }}
      >
        <span style={{ fontSize: compact ? '10px' : '12px' }}>⚡</span>
        {!compact && <span>{label}</span>}
      </div>
    );
  }

  // Badge Sentiment
  if ((showAll || show?.sentiment) && item.aiViz?.sentiment) {
    const { type, score } = item.aiViz.sentiment;
    const color = SENTIMENT_COLORS[type];
    const label = SENTIMENT_LABELS[type];

    const emoji = {
      very_positive: '😄',
      positive: '🙂',
      neutral: '😐',
      negative: '😕',
      very_negative: '😠',
    }[type];

    badges.push(
      <div
        key="sentiment"
        className="ai-badge sentiment-badge"
        title={`Sentiment ${label} (score: ${score.toFixed(2)})`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? '4px' : '6px',
          padding: compact ? '3px 6px' : '4px 8px',
          borderRadius: '12px',
          background: `${color}22`,
          border: `1px solid ${color}44`,
          fontSize: compact ? '10px' : '11px',
          fontWeight: 600,
          color,
        }}
      >
        <span>{emoji}</span>
        {!compact && <span>{label}</span>}
      </div>
    );
  }

  // Badge Action Items
  if ((showAll || show?.actionItems) && item.aiViz?.hasActionItems) {
    const count = item.aiViz.actionItemCount || 0;

    badges.push(
      <div
        key="action-items"
        className="ai-badge action-items-badge"
        title={`${count} action${count > 1 ? 's' : ''} à faire`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? '4px' : '6px',
          padding: compact ? '3px 6px' : '4px 8px',
          borderRadius: '12px',
          background: '#DBEAFE',
          border: '1px solid #3B82F644',
          fontSize: compact ? '10px' : '11px',
          fontWeight: 600,
          color: '#1E40AF',
        }}
      >
        <span>✓</span>
        {!compact && (
          <span>
            {count} action{count > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  // Badge Deadline
  if ((showAll || show?.deadline) && item.aiViz?.hasDeadline) {
    const { deadlineDate } = item.aiViz;
    const isUrgent =
      deadlineDate && new Date(deadlineDate).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000; // < 2 jours

    badges.push(
      <div
        key="deadline"
        className="ai-badge deadline-badge"
        title={
          deadlineDate
            ? `Deadline: ${new Date(deadlineDate).toLocaleDateString('fr-FR')}`
            : 'Deadline détectée'
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? '4px' : '6px',
          padding: compact ? '3px 6px' : '4px 8px',
          borderRadius: '12px',
          background: isUrgent ? '#FEE2E2' : '#FEF3C7',
          border: isUrgent ? '1px solid #EF444444' : '1px solid #F59E0B44',
          fontSize: compact ? '10px' : '11px',
          fontWeight: 600,
          color: isUrgent ? '#991B1B' : '#92400E',
          animation: isUrgent ? 'pulse 2s infinite' : undefined,
        }}
      >
        <span>⏰</span>
        {!compact && deadlineDate && (
          <span>{new Date(deadlineDate).toLocaleDateString('fr-FR')}</span>
        )}
        {!compact && !deadlineDate && <span>Deadline</span>}
      </div>
    );
  }

  // Badge Connexions
  if ((showAll || show?.connections) && item.aiViz?.hasConnections) {
    const count = item.aiViz.connectionCount || 0;

    badges.push(
      <div
        key="connections"
        className="ai-badge connections-badge"
        title={`${count} connexion${count > 1 ? 's' : ''} sémantique${count > 1 ? 's' : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? '4px' : '6px',
          padding: compact ? '3px 6px' : '4px 8px',
          borderRadius: '12px',
          background: '#E0E7FF',
          border: '1px solid #6366F144',
          fontSize: compact ? '10px' : '11px',
          fontWeight: 600,
          color: '#3730A3',
        }}
      >
        <span>🔗</span>
        {!compact && (
          <span>
            {count} lien{count > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  // Badge Résumé disponible
  if ((showAll || show?.summary) && item.aiViz?.hasSummary) {
    badges.push(
      <div
        key="summary"
        className="ai-badge summary-badge"
        title="Résumé IA disponible"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? '4px' : '6px',
          padding: compact ? '3px 6px' : '4px 8px',
          borderRadius: '12px',
          background: '#F3E8FF',
          border: '1px solid #A855F744',
          fontSize: compact ? '10px' : '11px',
          fontWeight: 600,
          color: '#6B21A8',
        }}
      >
        <span>📝</span>
        {!compact && <span>Résumé</span>}
      </div>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div
      className="ai-metadata-badges"
      style={{
        display: 'flex',
        gap: compact ? '4px' : '6px',
        flexWrap: 'wrap',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {badges}
    </div>
  );
};

/**
 * Indicateur de priorité standalone (gros badge)
 */
export const PriorityIndicator: React.FC<{ level: PriorityLevel; score?: number }> = ({
  level,
  score,
}) => {
  const color = PRIORITY_COLORS[level];
  const label = PRIORITY_LABELS[level];

  return (
    <div
      className="priority-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: `${color}22`,
        border: `2px solid ${color}`,
      }}
    >
      <div
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}66`,
        }}
      />
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, color }}>{label}</div>
        {score !== undefined && (
          <div style={{ fontSize: '11px', color: '#64748B' }}>Score: {score.toFixed(2)}</div>
        )}
      </div>
    </div>
  );
};

/**
 * Indicateur de sentiment standalone (gros badge)
 */
export const SentimentIndicator: React.FC<{ type: SentimentType; score?: number }> = ({
  type,
  score,
}) => {
  const color = SENTIMENT_COLORS[type];
  const label = SENTIMENT_LABELS[type];

  const emoji = {
    very_positive: '😄',
    positive: '🙂',
    neutral: '😐',
    negative: '😕',
    very_negative: '😠',
  }[type];

  return (
    <div
      className="sentiment-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: `${color}22`,
        border: `2px solid ${color}`,
      }}
    >
      <div style={{ fontSize: '24px' }}>{emoji}</div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, color }}>{label}</div>
        {score !== undefined && (
          <div style={{ fontSize: '11px', color: '#64748B' }}>Score: {score.toFixed(2)}</div>
        )}
      </div>
    </div>
  );
};

// Styles pour animation pulse (deadline urgente)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);
}
