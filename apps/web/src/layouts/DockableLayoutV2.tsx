import React, { useRef, useEffect, useState } from 'react';
import { DockviewReact, DockviewApi, DockviewReadyEvent, IDockviewPanelProps } from 'dockview';
import 'dockview/dist/styles/dockview.css';

// Import core components (composants principaux)
import FileTabs from '../components/FileTabs';
import NodeExplorer from '../components/NodeExplorer';
import MindMapCanvas from '../components/MindMapCanvas';
import NodeProperties from '../components/NodeProperties';
import MapSettings from '../components/MapSettings';

// Import panel registry utilities (utilitaires pour le registre de panneaux)
import { getAllPanels, onPanelRegistryChange } from '../utils/panelRegistry';

/**
 * Panel component props type (propriétés des composants de panneau)
 * Chaque panneau reçoit l'API Dockview pour interagir avec le layout
 */
interface PanelComponentProps extends IDockviewPanelProps {
  params?: Record<string, unknown>;
}

/**
 * Core panels map (carte des panneaux principaux)
 * Factory pattern: ID panneau → composant React
 */
const CORE_PANELS: Record<string, React.ComponentType<any>> = {
  files: FileTabs,
  explorer: NodeExplorer,
  canvas: MindMapCanvas,
  properties: NodeProperties,
  mapsettings: MapSettings,
};

/**
 * Custom tab component with badge support (onglet personnalisé avec badges)
 * Affiche le titre + optionnel badge (notifications, compteurs, etc.)
 */
const CustomTab: React.FC<IDockviewPanelProps> = ({ api, params }) => {
  const badge = params?.badge as string | undefined;

  return (
    <div className="dockview-custom-tab">
      <span>{api.title}</span>
      {badge && <span className="tab-badge">{badge}</span>}
    </div>
  );
};

/**
 * DockableLayoutV2 - Main layout component (composant de layout principal)
 *
 * Architecture:
 * - Left column (15%): Files + Explorer (tabs verticaux)
 * - Center column (55%): Canvas (zone de travail principale)
 * - Right column (30%): Properties (50%) + MapSettings (50%) (stack vertical)
 *
 * Features:
 * - Persistence localStorage (clé: 'cartae_dockview_layout_v1')
 * - Dynamic panels via panelRegistry (panneaux dynamiques)
 * - Custom tab rendering (rendu d'onglets personnalisés)
 */
export const DockableLayoutV2: React.FC = () => {
  // API ref for programmatic layout control (ref API pour contrôle programmatique)
  const dockviewApiRef = useRef<DockviewApi | null>(null);

  // Dynamic panels state (état des panneaux dynamiques)
  const [dynamicPanels, setDynamicPanels] = useState<Record<string, React.ComponentType<any>>>({});

  /**
   * Listen to panel registry changes (écouter les changements du registre)
   * Permet d'ajouter des panneaux à la volée (runtime panel registration)
   */
  useEffect(() => {
    const unsubscribe = onPanelRegistryChange(() => {
      const allPanels = getAllPanels();
      const newDynamicPanels: Record<string, React.ComponentType<any>> = {};

      allPanels.forEach(panel => {
        if (!CORE_PANELS[panel.id]) {
          newDynamicPanels[panel.id] = panel.component as React.ComponentType<any>;
        }
      });

      setDynamicPanels(newDynamicPanels);
    });

    return unsubscribe;
  }, []);

  /**
   * Merged components map (carte fusionnée des composants)
   * Core panels + dynamic panels from registry
   */
  const components = {
    ...CORE_PANELS,
    ...dynamicPanels,
  };

  /**
   * Tab components map (carte des composants d'onglets)
   * Support pour custom rendering avec badges
   */
  const tabComponents = {
    default: CustomTab,
  };

  /**
   * onReady callback (callback d'initialisation)
   * Appelé quand Dockview est monté et prêt
   *
   * Workflow:
   * 1. Sauvegarder ref API
   * 2. Charger layout depuis localStorage (si existe)
   * 3. Sinon, créer layout initial (3 colonnes)
   */
  const handleReady = (event: DockviewReadyEvent) => {
    dockviewApiRef.current = event.api;

    // Try to load persisted layout (tentative de chargement layout persisté)
    const savedLayout = localStorage.getItem('cartae_dockview_layout_v1');

    if (savedLayout) {
      try {
        event.api.fromJSON(JSON.parse(savedLayout));
        return;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to restore layout, using default:', error);
      }
    }

    // Default initial layout (layout initial par défaut)
    // Left column: Files + Explorer (tabs)
    const leftGroup = event.api.addGroup();
    event.api.addPanel({
      id: 'files-panel',
      component: 'files',
      title: 'Files',
      position: { referenceGroup: leftGroup },
    });
    event.api.addPanel({
      id: 'explorer-panel',
      component: 'explorer',
      title: 'Explorer',
      position: { referenceGroup: leftGroup },
    });

    // Center column: Canvas
    const centerGroup = event.api.addGroup();
    event.api.addPanel({
      id: 'canvas-panel',
      component: 'canvas',
      title: 'Canvas',
      position: { referenceGroup: centerGroup },
    });

    // Right column: Properties (top) + MapSettings (bottom)
    const rightGroup = event.api.addGroup();
    event.api.addPanel({
      id: 'properties-panel',
      component: 'properties',
      title: 'Properties',
      position: { referenceGroup: rightGroup },
    });
    event.api.addPanel({
      id: 'mapsettings-panel',
      component: 'mapsettings',
      title: 'Map Settings',
      position: { referenceGroup: rightGroup, direction: 'below' },
    });
  };

  /**
   * Persist layout on changes (persistance du layout sur changements)
   * Hook pour Session 54E (full persistence implementation)
   */
  useEffect(() => {
    if (!dockviewApiRef.current) return;

    const handleLayoutChange = () => {
      if (dockviewApiRef.current) {
        const layoutState = dockviewApiRef.current.toJSON();
        localStorage.setItem('cartae_dockview_layout_v1', JSON.stringify(layoutState));
      }
    };

    // Subscribe to layout changes (écouter les changements de layout)
    const api = dockviewApiRef.current;
    api.onDidLayoutChange(handleLayoutChange);

    // Cleanup (nettoyage)
    return () => {
      // Note: Dockview event listeners auto-cleanup on component unmount
    };
  }, []);

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <DockviewReact
        components={components}
        tabComponents={tabComponents}
        onReady={handleReady}
        className="dockview-theme-custom"
      />
    </div>
  );
};

export default DockableLayoutV2;
