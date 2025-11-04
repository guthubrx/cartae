import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanCard } from '../types/kanban';

interface KanbanCardProps {
  card: KanbanCard;
  onCardClick?: (card: KanbanCard) => void;
}

/**
 * Composant carte Kanban avec drag & drop
 */
export const KanbanCardComponent: React.FC<KanbanCardProps> = ({ card, onCardClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#6b7280',
  };

  const priorityColor = card.priority ? priorityColors[card.priority] : '#6b7280';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kanban-card"
      onClick={() => onCardClick?.(card)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onCardClick?.(card);
        }
      }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...attributes}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...listeners}
    >
      {/* Header avec titre et priorité */}
      <div className="card-header">
        <h4 className="card-title">{card.title}</h4>
        {card.priority && (
          <span
            className="card-priority"
            style={{ backgroundColor: priorityColor }}
          >
            {card.priority}
          </span>
        )}
      </div>

      {/* Contenu (preview court) */}
      {card.content && (
        <p className="card-content">
          {card.content.length > 100
            ? `${card.content.substring(0, 100)}...`
            : card.content}
        </p>
      )}

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="card-tags">
          {card.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="card-tag">
              #{tag}
            </span>
          ))}
          {card.tags.length > 3 && (
            <span className="card-tag-more">+{card.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer avec assigné et date */}
      <div className="card-footer">
        {card.assignee && (
          <span className="card-assignee" title={card.assignee}>
            👤 {card.assignee}
          </span>
        )}
        {card.dueDate && (
          <span
            className="card-due-date"
            title={`Due: ${card.dueDate.toLocaleDateString()}`}
          >
            📅 {card.dueDate.toLocaleDateString('fr-FR', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>

      {/* Source indicator */}
      <div className="card-source">
        {card.originalItem.source.connector}
      </div>
    </div>
  );
};
