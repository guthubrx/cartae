import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { KanbanColumn } from '../types/kanban';
import { KanbanCardComponent } from './KanbanCard';
import type { KanbanCard } from '../types/kanban';

interface KanbanColumnProps {
  column: KanbanColumn;
  onCardClick?: (card: KanbanCard) => void;
}

/**
 * Composant colonne Kanban avec Droppable zone
 */
export const KanbanColumnComponent: React.FC<KanbanColumnProps> = ({
  column,
  onCardClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  return (
    <div className="kanban-column">
      {/* Header de la colonne */}
      <div
        className="column-header"
        style={{ borderTopColor: column.color }}
      >
        <h3 className="column-title">{column.title}</h3>
        <span className="column-count">{column.cards.length}</span>
      </div>

      {/* Zone droppable avec les cartes */}
      <div
        ref={setNodeRef}
        className={`column-content ${isOver ? 'is-over' : ''}`}
      >
        <SortableContext
          items={column.cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.length === 0 ? (
            <div className="column-empty">
              <p>No cards</p>
            </div>
          ) : (
            column.cards.map((card) => (
              <KanbanCardComponent
                key={card.id}
                card={card}
                onCardClick={onCardClick}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};
