import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { KanbanBoard as KanbanBoardType, KanbanCard, KanbanStatus } from '../types/kanban';
import { KanbanColumnComponent } from './KanbanColumn';
import { KanbanCardComponent } from './KanbanCard';
import '../styles/kanban.css';

interface KanbanBoardProps {
  board: KanbanBoardType;
  onCardMove?: (cardId: string, newStatus: KanbanStatus) => void;
  onCardClick?: (card: KanbanCard) => void;
}

/**
 * Composant principal du Kanban Board avec DndContext
 * Gère le drag & drop entre colonnes
 */
export const KanbanBoard: React.FC<KanbanBoardProps> = ({ board, onCardMove, onCardClick }) => {
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum 8px de mouvement pour activer le drag
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card as KanbanCard | undefined;
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const draggedCard = active.data.current?.card as KanbanCard | undefined;
    const overColumn = over.data.current?.column;

    if (!draggedCard || !overColumn) return;

    // Déplacer la carte vers la nouvelle colonne
    if (draggedCard.status !== overColumn.id) {
      onCardMove?.(draggedCard.id, overColumn.id as KanbanStatus);
    }
  };

  return (
    <div className="kanban-board-container">
      {/* Statistiques du board */}
      <div className="board-stats">
        <div className="stat-item">
          <span className="stat-label">Total Cards</span>
          <span className="stat-value">{board.totalCards}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Last Updated</span>
          <span className="stat-value">
            {board.lastUpdated.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Board Kanban avec drag & drop */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {board.columns.map(column => (
            <KanbanColumnComponent key={column.id} column={column} onCardClick={onCardClick} />
          ))}
        </div>

        {/* Overlay pour la carte en cours de drag */}
        <DragOverlay>
          {activeCard ? (
            <div style={{ cursor: 'grabbing' }}>
              <KanbanCardComponent card={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
