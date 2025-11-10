/**
 * FR: Layout avec panneaux dockables (style Photoshop)
 * EN: Dockable panels layout (Photoshop style)
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Layout, Model, TabNode, IJsonModel, Actions, DockLocation } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import { MenuBar } from '../components/MenuBar/MenuBar';
import FileTabs from '../components/FileTabs';
import NodeExplorer from '../components/NodeExplorer';
import MindMapCanvas from '../components/MindMapCanvas';
import NodeProperties from '../components/NodeProperties';
import MapSettings from '../components/MapSettings';
import { StatusBar } from '../components/StatusBar/StatusBar';
import ViewSwitcher from '../components/ViewSwitcher';
import ViewContainer from '../components/ViewContainer';
import { getAllPanels, onPanelRegistryChange } from '../utils/panelRegistry';
import './DockableLayout.css';

// FR: Configuration initiale du layout
// EN: Initial layout configuration
const DEFAULT_LAYOUT: IJsonModel = {
  global: {
    tabEnableClose: false,
    tabEnableRename: false,
    tabSetEnableMaximize: true,
    tabSetEnableDivide: false, // FR: Désactivé - on utilise les boutons de split / EN: Disabled - we use split buttons
    tabSetEnableDrop: true,
    tabSetEnableDrag: true,
    tabEnableDrag: true,
    borderEnableDrop: true,
    tabSetMinWidth: 100,
    tabSetMinHeight: 100,
    splitterSize: 1,
    enableEdgeDock: false, // FR: Désactivé - on utilise les boutons / EN: Disabled - we use buttons
    enableRotateBorderIcons: false,
  },
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      // FR: Colonne gauche avec Fichiers et Explorateur
      // EN: Left column with Files and Explorer
      {
        type: 'tabset',
        weight: 15,
        selected: 0,
        enableDivide: true,
        children: [
          {
            type: 'tab',
            name: 'Fichiers',
            component: 'files',
            enableClose: false,
          },
          {
            type: 'tab',
            name: 'Explorateur',
            component: 'explorer',
            enableClose: false,
          },
        ],
      },
      // FR: Canvas au centre
      // EN: Canvas in the center
      {
        type: 'tabset',
        weight: 55,
        enableTabStrip: false,
        enableDivide: true,
        children: [
          {
            type: 'tab',
            name: 'Canvas',
            component: 'canvas',
            enableClose: false,
          },
        ],
      },
      // FR: Colonne droite avec Propriétés en haut et Tags en bas
      // EN: Right column with Properties on top and Tags on bottom
      {
        type: 'column',
        weight: 30,
        children: [
          {
            type: 'tabset',
            weight: 50,
            enableDivide: true,
            children: [
              {
                type: 'tab',
                name: 'Propriétés',
                component: 'properties',
                enableClose: false,
              },
            ],
          },
          {
            type: 'tabset',
            weight: 50,
            enableDivide: true,
            children: [
              {
                type: 'tab',
                name: 'Paramètres de la carte',
                component: 'mapsettings',
                enableClose: false,
              },
            ],
          },
        ],
      },
    ],
  },
};

const STORAGE_KEY = 'bigmind_layout_config_v11'; // v11 with MapSettings tab

// FR: Liste des onglets core disponibles
// EN: List of available core tabs
const CORE_TABS = [
  { id: 'files', name: 'Fichiers', component: 'files' },
  { id: 'explorer', name: 'Explorateur', component: 'explorer' },
  { id: 'properties', name: 'Propriétés', component: 'properties' },
  { id: 'mapsettings', name: 'Paramètres de la carte', component: 'mapsettings' },
];

function DockableLayout() {
  const layoutRef = useRef<Layout>(null);
  const [registryVersion, setRegistryVersion] = useState(0);
  const [addTabMenuState, setAddTabMenuState] = useState<{
    tabSetId: string | null;
    anchorEl: HTMLElement | null;
  }>({ tabSetId: null, anchorEl: null });

  // FR: Force re-render when panel registry changes
  // EN: Force re-render when panel registry changes
  useEffect(() => {
    setRegistryVersion(v => v + 1);

    const unsubscribe = onPanelRegistryChange(() => {
      setRegistryVersion(v => v + 1);
    });

    return unsubscribe;
  }, []);

  // FR: Obtenir les panneaux dynamiques depuis le registre
  // EN: Get dynamic panels from registry
  const pluginPanels = getAllPanels();

  // FR: Combiner les onglets core + onglets des plugins
  // EN: Combine core tabs + plugin tabs
  const allAvailableTabs = React.useMemo(() => {
    const pluginTabs = pluginPanels.map(panel => ({
      id: panel.id,
      name: panel.name,
      component: panel.id,
    }));
    return [...CORE_TABS, ...pluginTabs];
  }, [pluginPanels]);

  // FR: Charger la configuration sauvegardée ou utiliser la configuration par défaut
  // EN: Load saved configuration or use default configuration
  const getInitialModel = useCallback((): Model => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedLayout = JSON.parse(saved);
        return Model.fromJson(parsedLayout);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load layout config:', e);
    }
    return Model.fromJson(DEFAULT_LAYOUT);
  }, []);

  const [model] = React.useState(getInitialModel);

  // FR: Mettre à jour les variables CSS pour centrer les poignées et calculer leur taille
  // EN: Update CSS variables to center handles and calculate their size
  React.useEffect(() => {
    const updateHandlePositions = () => {
      // Splitters verticaux (séparent gauche/droite)
      const vertSplitters = document.querySelectorAll('.flexlayout__splitter_vert');
      vertSplitters.forEach(splitter => {
        const nextElement = splitter.nextElementSibling as HTMLElement;
        if (nextElement) {
          const nextRect = nextElement.getBoundingClientRect();
          const offset = nextRect.width / 2;
          const handleWidth = nextRect.width;
          (splitter as HTMLElement).style.setProperty('--handle-offset', `${offset}px`);
          (splitter as HTMLElement).style.setProperty('--handle-width', `${handleWidth}px`);
        }
      });

      // Splitters horizontaux (séparent haut/bas)
      const horzSplitters = document.querySelectorAll('.flexlayout__splitter_horz');
      horzSplitters.forEach(splitter => {
        const nextElement = splitter.nextElementSibling as HTMLElement;
        if (nextElement) {
          const nextRect = nextElement.getBoundingClientRect();
          const offset = nextRect.height / 2;
          const handleHeight = nextRect.height;
          (splitter as HTMLElement).style.setProperty('--handle-offset-vert', `${offset}px`);
          (splitter as HTMLElement).style.setProperty('--handle-height', `${handleHeight}px`);
        }
      });
    };

    updateHandlePositions();

    // Observer pour détecter les changements de taille
    const observer = new ResizeObserver(updateHandlePositions);
    const main = document.querySelector('.dockable-main');
    if (main) observer.observe(main);

    // Observer aussi tous les tabsets pour détecter les redimensionnements des panneaux
    const tabsets = document.querySelectorAll('.flexlayout__tabset');
    tabsets.forEach(tabset => observer.observe(tabset));

    // Mettre à jour après un court délai pour s'assurer que le layout est rendu
    const timeout = setTimeout(updateHandlePositions, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [model]);

  // FR: Sauvegarder la configuration dans localStorage
  // EN: Save configuration to localStorage
  const onModelChange = useCallback((newModel: Model) => {
    try {
      const json = newModel.toJson();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json));

      // Mettre à jour les positions et dimensions des poignées après le changement de modèle
      setTimeout(() => {
        // Splitters verticaux
        const vertSplitters = document.querySelectorAll('.flexlayout__splitter_vert');
        vertSplitters.forEach(splitter => {
          const nextElement = splitter.nextElementSibling as HTMLElement;
          if (nextElement) {
            const nextRect = nextElement.getBoundingClientRect();
            const offset = nextRect.width / 2;
            const handleWidth = nextRect.width;
            (splitter as HTMLElement).style.setProperty('--handle-offset', `${offset}px`);
            (splitter as HTMLElement).style.setProperty('--handle-width', `${handleWidth}px`);
          }
        });

        // Splitters horizontaux
        const horzSplitters = document.querySelectorAll('.flexlayout__splitter_horz');
        horzSplitters.forEach(splitter => {
          const nextElement = splitter.nextElementSibling as HTMLElement;
          if (nextElement) {
            const nextRect = nextElement.getBoundingClientRect();
            const offset = nextRect.height / 2;
            const handleHeight = nextRect.height;
            (splitter as HTMLElement).style.setProperty('--handle-offset-vert', `${offset}px`);
            (splitter as HTMLElement).style.setProperty('--handle-height', `${handleHeight}px`);
          }
        });
      }, 50);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save layout config:', e);
    }
  }, []);

  // FR: Factory pour créer les composants des panneaux
  // EN: Factory to create panel components
  const factory = useCallback(
    (node: TabNode) => {
      const component = node.getComponent();

      switch (component) {
        case 'files':
          return (
            <div className="panel-content">
              <FileTabs />
            </div>
          );

        case 'explorer':
          return (
            <div className="panel-content">
              <NodeExplorer />
            </div>
          );

        case 'canvas':
          return (
            <div className="panel-content canvas-panel">
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* ViewSwitcher : boutons MindMap / Kanban / Table */}
                <div
                  style={{ padding: '8px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}
                >
                  <ViewSwitcher />
                </div>
                {/* ViewContainer : affiche la vue active */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <ViewContainer />
                </div>
              </div>
            </div>
          );

        case 'properties':
          return (
            <div className="panel-content">
              <NodeProperties />
            </div>
          );

        case 'mapsettings':
          return (
            <div className="panel-content">
              <MapSettings />
            </div>
          );

        default: {
          // FR: Vérifier si c'est un panneau du registre
          // EN: Check if it's a panel from the registry
          const panel = pluginPanels.find(p => p.id === component);
          if (panel) {
            const Component = panel.component;
            return (
              <div className="panel-content">
                <Component />
              </div>
            );
          }
          return <div className="panel-content">Unknown component: {component}</div>;
        }
      }
    },
    [pluginPanels]
  );

  // FR: Rendu personnalisé du nom des onglets (avec badges)
  // EN: Custom tab name rendering (with badges)
  const onRenderTab = useCallback(
    (node: TabNode, renderValues: any) => {
      const component = node.getComponent();

      // FR: Vérifier si c'est un panneau du registre avec badge
      // EN: Check if it's a panel from the registry with badge
      const panel = pluginPanels.find(p => p.id === component);
      if (panel && panel.badge) {
        const badgeCount = panel.badge();
        if (badgeCount !== null && badgeCount > 0) {
          renderValues.content = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{panel.name}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  height: '16px',
                  padding: '0 4px',
                  background: 'var(--accent-color)',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: 'white',
                }}
              >
                {badgeCount}
              </span>
            </div>
          );
        }
      }
    },
    [pluginPanels]
  );

  // FR: Action personnalisée pour gérer le split 50/50
  // EN: Custom action to handle 50/50 split
  const onAction = useCallback((action: any) => {
    // FR: Si on ajoute un noeud avec BOTTOM ou TOP, ajuster le weight pour 50/50
    // EN: If adding a node with BOTTOM or TOP, adjust weight for 50/50
    if (action.type === 'FlexLayout_AddNode') {
      const location = action.data?.location;
      if (location === 'bottom' || location === 'top') {
        // FR: Forcer le weight à 50 pour un split équilibré
        // EN: Force weight to 50 for balanced split
        if (action.data && !action.data.weight) {
          action.data.weight = 50;
        }
      }
    }
    return action;
  }, []);

  // FR: Rendu personnalisé du header du tabset pour ajouter boutons de split
  // EN: Custom tabset header rendering to add split buttons
  const onRenderTabSet = useCallback(
    (tabSetNode: any, renderValues: any) => {
      // Ne pas ajouter de boutons sur le canvas
      const tabs = tabSetNode.getChildren();
      if (tabs.length > 0 && tabs[0].getComponent() === 'canvas') {
        return;
      }

      // FR: Trouver l'onglet sélectionné
      // EN: Find selected tab
      const selectedTabIndex = tabSetNode.getSelected();
      const selectedTab = tabs[selectedTabIndex];

      if (!selectedTab) return;

      // FR: Obtenir la liste des composants déjà présents dans ce tabset
      // EN: Get list of components already present in this tabset
      const existingComponents = tabs.map((tab: any) => tab.getComponent());

      // FR: Filtrer les onglets disponibles pour n'afficher que ceux qui ne sont pas déjà présents
      // EN: Filter available tabs to show only those not already present
      const availableTabs = allAvailableTabs.filter(
        tab => !existingComponents.includes(tab.component) && tab.component !== 'canvas'
      );

      const buttons = [];

      // FR: Bouton "+" pour ajouter un onglet
      // EN: "+" button to add a tab
      if (availableTabs.length > 0) {
        buttons.push(
          <button
            key="add-tab"
            type="button"
            className="flexlayout__tab_toolbar_button"
            title="Ajouter un onglet"
            onClick={e => {
              setAddTabMenuState({
                tabSetId: tabSetNode.getId(),
                anchorEl: e.currentTarget,
              });
            }}
            style={{
              padding: '4px 8px',
              fontSize: '16px',
              background: 'transparent',
              border: '0.5px solid var(--border-color, #e2e8f0)',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'var(--fg-secondary)',
              marginLeft: '2px',
              fontWeight: 'bold',
            }}
          >
            +
          </button>
        );
      }

      buttons.push(
        <button
          key="close-tab"
          type="button"
          className="flexlayout__tab_toolbar_button"
          title="Fermer l'onglet actif"
          onClick={() => {
            // FR: Fermer l'onglet sélectionné
            // EN: Close selected tab
            model.doAction(Actions.deleteTab(selectedTab.getId()));
          }}
          style={{
            padding: '4px 8px',
            fontSize: '14px',
            background: 'transparent',
            border: '0.5px solid var(--border-color, #e2e8f0)',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'var(--fg-secondary)',
            marginLeft: '2px',
          }}
        >
          ✕
        </button>
      );

      renderValues.stickyButtons = buttons.concat([
        <button
          key="split-horizontal"
          type="button"
          className="flexlayout__tab_toolbar_button"
          title="Diviser horizontalement (déplacer l'onglet actif à droite)"
          onClick={() => {
            // FR: Déplacer l'onglet sélectionné vers la droite
            // EN: Move selected tab to the right
            model.doAction(
              Actions.moveNode(selectedTab.getId(), tabSetNode.getId(), DockLocation.RIGHT, 0)
            );
          }}
          style={{
            padding: '4px 8px',
            fontSize: '16px',
            background: 'transparent',
            border: '0.5px solid var(--border-color, #e2e8f0)',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'var(--fg-secondary)',
            marginLeft: '2px',
          }}
        >
          ⬌
        </button>,
        <button
          key="split-vertical"
          type="button"
          className="flexlayout__tab_toolbar_button"
          title="Diviser verticalement (déplacer l'onglet actif en bas)"
          onClick={() => {
            // FR: Déplacer l'onglet sélectionné vers le bas
            // EN: Move selected tab to the bottom
            model.doAction(
              Actions.moveNode(selectedTab.getId(), tabSetNode.getId(), DockLocation.BOTTOM, 0)
            );
          }}
          style={{
            padding: '4px 8px',
            fontSize: '16px',
            background: 'transparent',
            border: '0.5px solid var(--border-color, #e2e8f0)',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'var(--fg-secondary)',
            marginLeft: '2px',
          }}
        >
          ⬍
        </button>,
      ]);
    },
    [model, setAddTabMenuState]
  );

  // FR: Gérer l'ajout d'un onglet
  // EN: Handle adding a tab
  const handleAddTab = useCallback(
    (tabSetId: string, tabComponent: string, tabName: string) => {
      model.doAction(
        Actions.addNode(
          {
            type: 'tab',
            name: tabName,
            component: tabComponent,
            enableClose: false,
          },
          tabSetId,
          DockLocation.CENTER,
          -1
        )
      );
      setAddTabMenuState({ tabSetId: null, anchorEl: null });
    },
    [model]
  );

  // FR: Fermer le menu
  // EN: Close the menu
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addTabMenuState.anchorEl && !addTabMenuState.anchorEl.contains(e.target as Node)) {
        const menu = document.getElementById('add-tab-menu');
        if (menu && !menu.contains(e.target as Node)) {
          setAddTabMenuState({ tabSetId: null, anchorEl: null });
        }
      }
    };

    if (addTabMenuState.anchorEl) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [addTabMenuState.anchorEl]);

  return (
    <div className="dockable-layout">
      {/* FR: Barre de menu */}
      {/* EN: Menu bar */}
      <div className="dockable-menu-bar">
        <MenuBar />
      </div>

      {/* FR: Zone principale avec panneaux flexibles */}
      {/* EN: Main area with flexible panels */}
      <div className="dockable-main">
        <Layout
          ref={layoutRef}
          model={model}
          factory={factory}
          onModelChange={onModelChange}
          onRenderTab={onRenderTab}
          onRenderTabSet={onRenderTabSet}
          onAction={onAction}
        />
      </div>

      {/* FR: Barre d'onglets des feuilles XMind */}
      {/* EN: XMind sheets tab bar */}
      <div className="dockable-tab-bar">
        <FileTabs type="tab-bar" />
      </div>

      {/* FR: Barre de statut */}
      {/* EN: Status bar */}
      <div className="dockable-status-bar">
        <StatusBar />
      </div>

      {/* FR: Menu pour ajouter un onglet */}
      {/* EN: Menu to add a tab */}
      {addTabMenuState.anchorEl && addTabMenuState.tabSetId && (
        <div
          id="add-tab-menu"
          style={{
            position: 'fixed',
            top: `${addTabMenuState.anchorEl.getBoundingClientRect().bottom + 4}px`,
            left: `${addTabMenuState.anchorEl.getBoundingClientRect().left}px`,
            background: 'var(--bg)',
            border: '0.5px solid var(--border-color, #e2e8f0)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 10000,
            minWidth: '180px',
            overflow: 'hidden',
          }}
        >
          {allAvailableTabs
            .filter(tab => {
              // FR: Filtrer les onglets qui ne sont pas déjà dans le tabset
              // EN: Filter tabs that are not already in the tabset
              const tabSetNode = model.getNodeById(addTabMenuState.tabSetId!);
              if (!tabSetNode) return false;
              const tabs = tabSetNode.getChildren();
              const existingComponents = tabs.map((t: any) => t.getComponent());
              return !existingComponents.includes(tab.component) && tab.component !== 'canvas';
            })
            .map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleAddTab(addTabMenuState.tabSetId!, tab.component, tab.name)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'var(--fg)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {tab.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default DockableLayout;
