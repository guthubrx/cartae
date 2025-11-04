/**
 * CanvasPanel - Panneau Canvas intelligent avec switcher Kanban/MindMap/Table
 *
 * Remplace le composant direct MindMapCanvas et permet de basculer entre
 * les différentes visualisations disponibles via les plugins
 */

import React, { useMemo, useCallback, useState } from 'react';
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

interface CanvasPanelProps {
  api?: any;
  group?: any;
}

/**
 * CanvasPanel - Intelligent canvas with visualization switcher
 * Supports: MindMap, Kanban, Table
 */
export const CanvasPanel: React.FC<CanvasPanelProps> = ({ api, group }) => {
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

  // Visualization switcher toolbar
  const renderToolbar = () => (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 12px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        alignItems: 'center',
      }}
    >
      <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--fg-secondary)' }}>
        View:
      </label>
      <button
        onClick={() => setView('mindmap')}
        style={{
          padding: '4px 12px',
          background: activeView === 'mindmap' ? 'var(--accent-color)' : 'var(--bg-tertiary)',
          color: activeView === 'mindmap' ? 'white' : 'var(--fg)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          if (activeView !== 'mindmap') {
            e.currentTarget.style.background = 'var(--state-hover)';
          }
        }}
        onMouseLeave={e => {
          if (activeView !== 'mindmap') {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
          }
        }}
      >
        🧠 MindMap
      </button>
      <button
        onClick={() => setView('kanban')}
        style={{
          padding: '4px 12px',
          background: activeView === 'kanban' ? 'var(--accent-color)' : 'var(--bg-tertiary)',
          color: activeView === 'kanban' ? 'white' : 'var(--fg)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          if (activeView !== 'kanban') {
            e.currentTarget.style.background = 'var(--state-hover)';
          }
        }}
        onMouseLeave={e => {
          if (activeView !== 'kanban') {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
          }
        }}
      >
        📋 Kanban
      </button>
      <button
        onClick={() => setView('table')}
        disabled
        style={{
          padding: '4px 12px',
          background: 'var(--bg-tertiary)',
          color: 'var(--fg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          cursor: 'not-allowed',
          fontSize: '12px',
          fontWeight: 500,
          opacity: 0.5,
          transition: 'all 0.2s ease',
        }}
        title="Table view coming in Session 40C"
      >
        📊 Table (Session 40C)
      </button>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      {renderToolbar()}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
            <p>Vue Tableau à venir (Session 40C)...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasPanel;
