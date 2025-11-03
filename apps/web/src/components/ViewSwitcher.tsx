import React from 'react';
import { useViewStore, type ViewType } from '../stores/viewStore';
import './ViewSwitcher.css';

interface ViewSwitcherProps {
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
  onViewChange?: (newView: ViewType) => void;
}

function ViewSwitcher({ className = '', style, compact = false, onViewChange }: ViewSwitcherProps) {
  const activeView = useViewStore(state => state.activeView);
  const setView = useViewStore(state => state.setView);
  const availableViews = useViewStore(state => state.getAvailableViews());

  const handleViewChange = (newView: ViewType) => {
    setView(newView);
    onViewChange?.(newView);
  };

  return (
    <div className={`view-switcher ${compact ? 'compact' : ''} ${className}`} style={style}>
      {availableViews.map(viewConfig => (
        <button
          key={viewConfig.id}
          type="button"
          className={`view-switcher-button ${activeView === viewConfig.id ? 'active' : ''}`}
          onClick={() => handleViewChange(viewConfig.id)}
          title={viewConfig.description}
        >
          <span className="view-icon">{viewConfig.icon}</span>
          {!compact && <span className="view-label">{viewConfig.label}</span>}
        </button>
      ))}
    </div>
  );
}

export default ViewSwitcher;
