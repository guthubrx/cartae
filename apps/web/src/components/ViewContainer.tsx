import React, { useMemo } from 'react';
import { useViewStore } from '../stores/viewStore';
import { useCartaeItems } from '../hooks/useCartaeItems';
import MindMapCanvas from './MindMapCanvas';
import { KanbanBoardView } from '@cartae/kanban-plugin';
import { KanbanPlugin } from '@cartae/kanban-plugin';
import './ViewContainer.css';

interface ViewContainerProps {
  className?: string;
  style?: React.CSSProperties;
}

function ViewContainer({ className = '', style }: ViewContainerProps) {
  const activeView = useViewStore(state => state.activeView);
  const cartaeItems = useCartaeItems();

  // Instance du plugin Kanban pour transformation
  const kanbanPlugin = useMemo(() => new KanbanPlugin(), []);

  // Transformation CartaeItem[] → KanbanBoard
  const kanbanBoard = useMemo(() => {
    if (cartaeItems.length === 0) return null;
    return kanbanPlugin.transform(cartaeItems);
  }, [cartaeItems, kanbanPlugin]);

  return (
    <div className={`view-container view-${activeView} ${className}`} style={style}>
      {activeView === 'mindmap' && <MindMapCanvas />}

      {activeView === 'kanban' && kanbanBoard && (
        <KanbanBoardView
          board={kanbanBoard}
          onCardMove={(cardId, newStatus) => {
            // TODO: Gérer le déplacement de carte (update mindmap node status)
            console.log('Card moved:', cardId, '→', newStatus);
          }}
          onCardClick={card => {
            // TODO: Ouvrir modal détails carte
            console.log('Card clicked:', card);
          }}
        />
      )}

      {activeView === 'kanban' && !kanbanBoard && (
        <div className="view-placeholder">
          <div className="placeholder-icon">📋</div>
          <h2>Vue Kanban</h2>
          <p>Aucune donnée disponible...</p>
        </div>
      )}

      {activeView === 'table' && (
        <div className="view-placeholder">
          <div className="placeholder-icon">📊</div>
          <h2>Vue Tableau</h2>
          <p>Vue Tableau à venir (Session 40B)...</p>
        </div>
      )}
    </div>
  );
}

export default ViewContainer;
