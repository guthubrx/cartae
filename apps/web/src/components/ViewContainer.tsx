import React from 'react';
import { useViewStore } from '../stores/viewStore';
import MindMapCanvas from './MindMapCanvas';
import './ViewContainer.css';

interface ViewContainerProps {
  className?: string;
  style?: React.CSSProperties;
}

function ViewContainer({ className = '', style }: ViewContainerProps) {
  const activeView = useViewStore(state => state.activeView);

  return (
    <div className={`view-container view-${activeView} ${className}`} style={style}>
      {activeView === 'mindmap' && <MindMapCanvas />}

      {activeView === 'kanban' && (
        <div className="view-placeholder">
          <div className="placeholder-icon">📋</div>
          <h2>Vue Kanban</h2>
          <p>Vue Kanban en développement...</p>
        </div>
      )}

      {activeView === 'table' && (
        <div className="view-placeholder">
          <div className="placeholder-icon">📊</div>
          <h2>Vue Tableau</h2>
          <p>Vue Tableau en développement...</p>
        </div>
      )}
    </div>
  );
}

export default ViewContainer;
