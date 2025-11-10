/**
 * FR: Barre de statut en bas de l'application
 * EN: Application status bar at bottom
 *
 * Session 69: StatusBar restoration pour DockableLayoutV2
 */

import React from 'react';
import './StatusBar.css';
import { usePaletteTheme } from '../../hooks/usePaletteTheme';
import { themeManager } from '../../core/theme/ThemeManager';

export interface StatusBarProps {
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ className = '' }) => {
  const { paletteId, palette } = usePaletteTheme();
  const currentTheme = themeManager.getTheme();

  const [time, setTime] = React.useState(new Date());

  // Update time every minute
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`status-bar ${className}`}>
      {/* Left section - Info */}
      <div className="status-bar-section status-bar-left">
        <div className="status-bar-item">
          <span className="status-bar-icon">📁</span>
          <span className="status-bar-text">Prêt</span>
        </div>
      </div>

      {/* Center section - Stats */}
      <div className="status-bar-section status-bar-center">
        <div className="status-bar-item">
          <span className="status-bar-text status-bar-muted">
            Palette: <strong>{palette?.name || paletteId}</strong>
          </span>
        </div>
        <div className="status-bar-separator" />
        <div className="status-bar-item">
          <span className="status-bar-text status-bar-muted">
            Thème: <strong>{currentTheme.mode === 'dark' ? 'Sombre' : 'Clair'}</strong>
          </span>
        </div>
      </div>

      {/* Right section - System info */}
      <div className="status-bar-section status-bar-right">
        <div className="status-bar-item">
          <span className="status-bar-text status-bar-muted">{formattedTime}</span>
        </div>
        <div className="status-bar-separator" />
        <div className="status-bar-item">
          <span className="status-bar-icon">🌐</span>
          <span className="status-bar-text status-bar-muted">Connecté</span>
        </div>
      </div>
    </div>
  );
};
