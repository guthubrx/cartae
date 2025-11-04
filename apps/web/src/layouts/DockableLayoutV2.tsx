/**
 * FR: Layout principal avec dockable panels + MenuBar + StatusBar
 * EN: Main layout with dockable panels + MenuBar + StatusBar
 *
 * Session 69: DockableLayoutV2 with MenuBar/StatusBar restoration
 */

import React from 'react';
import { MenuBar } from '../components/MenuBar/MenuBar';
import { StatusBar } from '../components/StatusBar/StatusBar';
import './DockableLayoutV2.css';

export interface DockableLayoutV2Props {
  className?: string;
}

const DockableLayoutV2: React.FC<DockableLayoutV2Props> = ({ className = '' }) => {
  return (
    <div className={`dockable-layout ${className}`}>
      {/* MenuBar en haut */}
      <MenuBar className="dockable-layout-menubar" />

      {/* Contenu principal (Dockview panels) */}
      <div className="dockable-layout-content">
        {/* TODO: Intégrer Dockview panels ici (Canvas, Properties, Explorer, etc.) */}
        <div className="dockable-layout-placeholder">
          <h2>Dockable Layout V2</h2>
          <p>MenuBar et StatusBar restaurées !</p>
          <p className="placeholder-note">
            Le contenu Dockview sera intégré ici (Canvas, Properties, Explorer, Map Settings, etc.)
          </p>
        </div>
      </div>

      {/* StatusBar en bas */}
      <StatusBar className="dockable-layout-statusbar" />
    </div>
  );
};

export default DockableLayoutV2;
