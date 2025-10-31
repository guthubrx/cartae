/**
 * FR: Barre de menu de Cartae
 * EN: Cartae menu bar
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Edit,
  Eye,
  Plus,
  Palette,
  Settings,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { usePlatform, formatShortcut } from '../hooks/usePlatform';
import { useFileOperations } from '../hooks/useFileOperations';
import './MenuBar.css';
// import { useAppSettings } from '../hooks/useAppSettings.ts';

function MenuBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);
  // const accentColor = useAppSettings((s) => s.accentColor);
  const platformInfo = usePlatform();
  const { openFileDialog, openFile, createNew, exportActiveXMind } = useFileOperations();
  const navigate = useNavigate();

  // FR: Raccourcis adaptés selon la plateforme
  // EN: Shortcuts adapted according to platform
  const getShortcut = (shortcut: string) => formatShortcut(shortcut, platformInfo);

  // FR: Ouvrir un menu (instantané si on change de menu, sinon annule la fermeture)
  // EN: Open a menu (instant if changing menus, otherwise cancel closing)
  const handleMenuEnter = (menuId: string) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    // Changement instantané de menu
    setActiveMenu(menuId);
  };

  // FR: Fermer le menu avec un délai seulement si on quitte complètement
  // EN: Close menu with delay only if leaving completely
  const handleMenuLeave = () => {
    const timeout = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
    setCloseTimeout(timeout);
  };

  // FR: Gestionnaire pour les actions de menu
  // EN: Handler for menu actions
  const handleMenuAction = async (action: string) => {
    try {
      switch (action) {
        case 'Nouveau':
          createNew();
          break;
        case 'Ouvrir...': {
          const file = await openFileDialog();
          if (file) {
            await openFile(file);
          }
          break;
        }
        case 'Sauvegarder':
        case 'Sauvegarder sous...':
          await exportActiveXMind();
          break;
        default:
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`❌ Erreur lors de l'action ${action}:`, error);
    }
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    setActiveMenu(null);
  };

  const menuItems = [
    {
      id: 'file',
      label: 'Fichier',
      icon: FileText,
      items: [
        { label: 'Nouveau', shortcut: getShortcut('Ctrl+N') },
        { label: 'Ouvrir...', shortcut: getShortcut('Ctrl+O') },
        { label: 'Fermer', shortcut: getShortcut('Ctrl+W') },
        { label: 'Sauvegarder', shortcut: getShortcut('Ctrl+S') },
        { label: 'Sauvegarder sous...', shortcut: getShortcut('Ctrl+Shift+S') },
        { label: 'Exporter...', shortcut: getShortcut('Ctrl+E') },
        { label: 'Imprimer...', shortcut: getShortcut('Ctrl+P') },
      ],
    },
    {
      id: 'edit',
      label: 'Édition',
      icon: Edit,
      items: [
        { label: 'Annuler', shortcut: getShortcut('Ctrl+Z') },
        { label: 'Refaire', shortcut: getShortcut('Ctrl+Y') },
        { label: 'Couper', shortcut: getShortcut('Ctrl+X') },
        { label: 'Copier', shortcut: getShortcut('Ctrl+C') },
        { label: 'Coller', shortcut: getShortcut('Ctrl+V') },
        { label: 'Supprimer', shortcut: 'Suppr' },
        { label: 'Sélectionner tout', shortcut: getShortcut('Ctrl+A') },
      ],
    },
    {
      id: 'view',
      label: 'Affichage',
      icon: Eye,
      items: [
        { label: 'Zoom avant', shortcut: getShortcut('Ctrl++') },
        { label: 'Zoom arrière', shortcut: getShortcut('Ctrl+-') },
        { label: 'Zoom normal', shortcut: getShortcut('Ctrl+0') },
        { label: 'Ajuster à la fenêtre', shortcut: getShortcut('Ctrl+Shift+0') },
        { label: 'Plein écran', shortcut: 'F11' },
      ],
    },
    {
      id: 'insert',
      label: 'Insertion',
      icon: Plus,
      items: [
        { label: 'Nouveau nœud', shortcut: 'Entrée' },
        { label: 'Nouveau nœud enfant', shortcut: 'Tab' },
        { label: 'Nouveau nœud parent', shortcut: 'Shift+Tab' },
        { label: 'Image...', shortcut: getShortcut('Ctrl+I') },
        { label: 'Lien...', shortcut: getShortcut('Ctrl+L') },
      ],
    },
    {
      id: 'format',
      label: 'Format',
      icon: Palette,
      items: [
        { label: 'Police...', shortcut: getShortcut('Ctrl+Shift+F') },
        { label: 'Couleur...', shortcut: getShortcut('Ctrl+Shift+C') },
        { label: 'Style...', shortcut: getShortcut('Ctrl+Shift+S') },
        { label: 'Alignement...', shortcut: getShortcut('Ctrl+Shift+A') },
      ],
    },
    {
      id: 'tools',
      label: 'Outils',
      icon: Settings,
      items: [
        { label: 'Préférences...', shortcut: getShortcut('Ctrl+,') },
        { label: 'Thèmes...', shortcut: getShortcut('Ctrl+Shift+T') },
        { label: 'Plugins...', shortcut: getShortcut('Ctrl+Shift+P') },
      ],
    },
    {
      id: 'help',
      label: 'Aide',
      icon: HelpCircle,
      items: [
        { label: 'Documentation', shortcut: 'F1' },
        { label: 'Raccourcis clavier', shortcut: getShortcut('Ctrl+?') },
        { label: 'À propos', shortcut: getShortcut('Ctrl+Shift+A') },
      ],
    },
  ];

  return (
    <div className="menu-bar" onMouseLeave={handleMenuLeave}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src="/logo-64.png" alt="Cartae" className="menu-logo" />
        {menuItems.map(menu => (
          <div
            key={menu.id}
            className={`menu-item ${activeMenu === menu.id ? 'active' : ''}`}
            onMouseEnter={() => handleMenuEnter(menu.id)}
          >
            <button type="button" className="menu-button">
              <menu.icon className="icon-small" />
              <span>{menu.label}</span>
              <ChevronDown className="icon-small" />
            </button>

            <div className="menu-dropdown" onMouseEnter={() => handleMenuEnter(menu.id)}>
              {menu.items.map(item => (
                <button
                  type="button"
                  key={`${menu.id}-${item.label}`}
                  className="menu-item-option"
                  onClick={() => {
                    if (closeTimeout) {
                      clearTimeout(closeTimeout);
                      setCloseTimeout(null);
                    }
                    if (menu.id === 'tools' && item.label.startsWith('Préférences')) {
                      navigate('/settings');
                      setActiveMenu(null);
                    } else if (menu.id === 'tools' && item.label.startsWith('Plugins')) {
                      navigate('/settings?section=plugins');
                      setActiveMenu(null);
                    } else {
                      handleMenuAction(item.label);
                    }
                  }}
                >
                  <span className="menu-item-label">{item.label}</span>
                  <span className="menu-item-shortcut">{item.shortcut}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MenuBar;
