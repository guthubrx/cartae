/**
 * FR: Barre de menu principale de l'application
 * EN: Main application menu bar
 *
 * Session 69: MenuBar restoration pour DockableLayoutV2
 */

import React, { useState, useEffect, useRef } from 'react';
import './MenuBar.css';

export interface MenuBarProps {
  className?: string;
}

export const MenuBar: React.FC<MenuBarProps> = ({ className = '' }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuItemClick = (action: string) => {
    console.log(`[MenuBar] Action: ${action}`);
    setActiveMenu(null);
    // TODO: Implémenter les actions
  };

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Ne rien faire si le click est sur un bouton de menu (handleMenuClick gère déjà)
      if (target.closest('.menu-button')) {
        return;
      }

      // Fermer si click en dehors de la MenuBar
      if (menuBarRef.current && !menuBarRef.current.contains(target)) {
        setActiveMenu(null);
      }
    };

    if (activeMenu) {
      // Utiliser 'click' au lieu de 'mousedown' pour éviter conflits de timing
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMenu]);

  return (
    <div className={`menu-bar ${className}`}>
      {/* Menu Fichier */}
      <div className="menu-item">
        <button className="menu-button" onClick={() => handleMenuClick('file')}>
          Fichier
        </button>
        {activeMenu === 'file' && (
          <div className="menu-dropdown">
            <button onClick={() => handleMenuItemClick('new')}>
              Nouvelle carte
              <span className="menu-shortcut">Ctrl+N</span>
            </button>
            <button onClick={() => handleMenuItemClick('open')}>
              Ouvrir...
              <span className="menu-shortcut">Ctrl+O</span>
            </button>
            <button onClick={() => handleMenuItemClick('save')}>
              Sauvegarder
              <span className="menu-shortcut">Ctrl+S</span>
            </button>
            <button onClick={() => handleMenuItemClick('save-as')}>
              Sauvegarder sous...
              <span className="menu-shortcut">Ctrl+Shift+S</span>
            </button>
            <div className="menu-separator" />
            <button onClick={() => handleMenuItemClick('export')}>Exporter...</button>
            <button onClick={() => handleMenuItemClick('import')}>Importer...</button>
          </div>
        )}
      </div>

      {/* Menu Édition */}
      <div className="menu-item">
        <button className="menu-button" onClick={() => handleMenuClick('edit')}>
          Édition
        </button>
        {activeMenu === 'edit' && (
          <div className="menu-dropdown">
            <button onClick={() => handleMenuItemClick('undo')}>
              Annuler
              <span className="menu-shortcut">Ctrl+Z</span>
            </button>
            <button onClick={() => handleMenuItemClick('redo')}>
              Refaire
              <span className="menu-shortcut">Ctrl+Y</span>
            </button>
            <div className="menu-separator" />
            <button onClick={() => handleMenuItemClick('cut')}>
              Couper
              <span className="menu-shortcut">Ctrl+X</span>
            </button>
            <button onClick={() => handleMenuItemClick('copy')}>
              Copier
              <span className="menu-shortcut">Ctrl+C</span>
            </button>
            <button onClick={() => handleMenuItemClick('paste')}>
              Coller
              <span className="menu-shortcut">Ctrl+V</span>
            </button>
          </div>
        )}
      </div>

      {/* Menu Affichage */}
      <div className="menu-item">
        <button className="menu-button" onClick={() => handleMenuClick('view')}>
          Affichage
        </button>
        {activeMenu === 'view' && (
          <div className="menu-dropdown">
            <button onClick={() => handleMenuItemClick('zoom-in')}>
              Zoom avant
              <span className="menu-shortcut">Ctrl++</span>
            </button>
            <button onClick={() => handleMenuItemClick('zoom-out')}>
              Zoom arrière
              <span className="menu-shortcut">Ctrl+-</span>
            </button>
            <button onClick={() => handleMenuItemClick('zoom-reset')}>
              Réinitialiser le zoom
              <span className="menu-shortcut">Ctrl+0</span>
            </button>
            <div className="menu-separator" />
            <button onClick={() => handleMenuItemClick('fullscreen')}>
              Plein écran
              <span className="menu-shortcut">F11</span>
            </button>
          </div>
        )}
      </div>

      {/* Menu Aide */}
      <div className="menu-item">
        <button className="menu-button" onClick={() => handleMenuClick('help')}>
          Aide
        </button>
        {activeMenu === 'help' && (
          <div className="menu-dropdown">
            <button onClick={() => handleMenuItemClick('docs')}>Documentation</button>
            <button onClick={() => handleMenuItemClick('shortcuts')}>Raccourcis clavier</button>
            <div className="menu-separator" />
            <button onClick={() => handleMenuItemClick('about')}>À propos de Cartae</button>
          </div>
        )}
      </div>
    </div>
  );
};
