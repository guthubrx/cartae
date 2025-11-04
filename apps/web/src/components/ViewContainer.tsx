import React, { useMemo, useCallback } from 'react';
import { useViewStore } from '../stores/viewStore';
import { useCartaeItems } from '../hooks/useCartaeItems';
import { useOpenFiles } from '../hooks/useOpenFiles';
import { useSelection } from '../hooks/useSelection';
import MindMapCanvas from './MindMapCanvas';
import { KanbanBoard } from '../../../../packages/viz-plugins/kanban/src/components/KanbanBoard';
import { KanbanPlugin } from '../../../../packages/viz-plugins/kanban/src/KanbanPlugin';
import type {
  KanbanStatus,
  KanbanCard,
} from '../../../../packages/viz-plugins/kanban/src/types/kanban';
import './ViewContainer.css';

interface ViewContainerProps {
  className?: string;
  style?: React.CSSProperties;
}

function ViewContainer({ className = '', style }: ViewContainerProps) {
  const activeView = useViewStore(state => state.activeView);
  const setView = useViewStore(state => state.setView);
  const cartaeItems = useCartaeItems();
  const updateActiveFileNode = useOpenFiles(state => state.updateActiveFileNode);
  const setSelectedNodeId = useSelection(state => state.setSelectedNodeId);

  // Instance du plugin Kanban pour transformation
  const kanbanPlugin = useMemo(() => new KanbanPlugin(), []);

  // Transformation CartaeItem[] → KanbanBoard
  const kanbanBoard = useMemo(() => {
    if (cartaeItems.length === 0) return null;
    return kanbanPlugin.transform(cartaeItems);
  }, [cartaeItems, kanbanPlugin]);

  // Handler persistence drag & drop Kanban
  const handleCardMove = useCallback(
    (cardId: string, newStatus: KanbanStatus) => {
      // Find current node to preserve existing metadata
      const activeFile = useOpenFiles.getState().openFiles.find(f => f.isActive);
      const currentNode = activeFile?.content?.nodes?.[cardId];

      if (!currentNode) {
        console.warn(`Node ${cardId} not found`);
        return;
      }

      // Merge metadata (preserve existing fields)
      updateActiveFileNode(cardId, {
        metadata: {
          ...currentNode.metadata,
          kanbanStatus: newStatus,
        },
      });

      console.log(`✅ Card ${cardId} moved to ${newStatus} - persisted in XMind metadata`);
    },
    [updateActiveFileNode]
  );

  // Handler click carte Kanban → Focus node dans MindMap
  const handleCardClick = useCallback(
    (card: KanbanCard) => {
      // 1. Basculer vers vue MindMap AVANT de sélectionner (pour que MindMapCanvas soit monté)
      setView('mindmap');

      // 2. Sélectionner le node après un micro-délai (attendre que MindMapCanvas soit rendu)
      setTimeout(() => {
        setSelectedNodeId(card.id);
        console.log(`✅ Card clicked: ${card.title} - Focused on node ${card.id} in MindMap`);
      }, 100);
    },
    [setSelectedNodeId, setView]
  );

  return (
    <div className={`view-container view-${activeView} ${className}`} style={style}>
      {activeView === 'mindmap' && <MindMapCanvas />}

      {activeView === 'kanban' && kanbanBoard && (
        <KanbanBoard
          board={kanbanBoard}
          onCardMove={handleCardMove}
          onCardClick={handleCardClick}
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
