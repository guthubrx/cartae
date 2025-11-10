/**
 * DockableLayoutV2 - Layout principal avec Dockview
 *
 * Architecture:
 * - Factory pattern pour tous les panneaux core (files, explorer, canvas, properties, mapsettings)
 * - Intégration complète du système de plugins (getAllPanels, panelRegistry)
 * - Onglets personnalisés avec badges (notifications, compteurs)
 * - Persistance layout dans localStorage (clé: cartae_dockview_layout_v1)
 * - Configuration initiale via objet de layout structuré
 * - Gestion d'erreurs robuste avec fallbacks
 *
 * Layout initial (3 colonnes):
 * - Gauche (15%): Files + Explorer (tabs)
 * - Centre (55%): Canvas (zone de travail principale)
 * - Droite (30%): Properties (50%) + MapSettings (50%) (stack vertical)
 */

import React, { useRef, useEffect, useState } from 'react';
import { DockviewReact, DockviewApi, DockviewReadyEvent, IDockviewPanelProps } from 'dockview';
import 'dockview/dist/styles/dockview.css';
import './DockableLayoutV2.css';

// Import core components (composants principaux)
import FileTabs from '../components/FileTabs';
import NodeExplorer from '../components/NodeExplorer';
import ViewContainer from '../components/ViewContainer';
import ViewSwitcher from '../components/ViewSwitcher';
import NodeProperties from '../components/NodeProperties';
import MapSettings from '../components/MapSettings';

// Import panel registry utilities (utilitaires pour le registre de panneaux)
import { getAllPanels, onPanelRegistryChange, getPanel } from '../utils/panelRegistry';

// Import Obsidian theme loader (chargeur de thème Obsidian)
// TEMPORARILY DISABLED - @cartae/ui package not available yet
// import { useObsidianThemeLoader, type ObsidianThemeConfig } from '@cartae/ui';

// Import MenuBar and StatusBar for Session 69 (barre de menu et statut)
import { MenuBar } from '../components/MenuBar/MenuBar';
import { StatusBar } from '../components/StatusBar/StatusBar';

/**
 * Configuration initiale du layout (initial layout configuration)
 * Définit la structure des 3 colonnes et leurs panneaux
 */
interface LayoutConfig {
  columns: Array<{
    weight: number; // Largeur relative (relative width)
    panels: Array<{
      id: string;
      component: string;
      title: string;
      position?: 'below'; // Position relative au panneau précédent
    }>;
  }>;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  columns: [
    // Colonne gauche (Left column): Files + Explorer
    {
      weight: 15,
      panels: [
        { id: 'files-panel', component: 'files', title: 'Files' },
        { id: 'explorer-panel', component: 'explorer', title: 'Explorer' },
      ],
    },
    // Colonne centre (Center column): Canvas
    {
      weight: 55,
      panels: [{ id: 'canvas-panel', component: 'canvas', title: 'Canvas' }],
    },
    // Colonne droite (Right column): Properties + MapSettings
    {
      weight: 30,
      panels: [
        { id: 'properties-panel', component: 'properties', title: 'Properties' },
        {
          id: 'mapsettings-panel',
          component: 'mapsettings',
          title: 'Map Settings',
          position: 'below',
        },
      ],
    },
  ],
};

/**
 * Panel component props type (propriétés des composants de panneau)
 * Chaque panneau reçoit l'API Dockview pour interagir avec le layout
 */
interface PanelComponentProps extends IDockviewPanelProps {
  params?: Record<string, unknown>;
}

/**
 * Canvas wrapper component with ViewSwitcher and ViewContainer
 * Inclut les boutons de switch entre MindMap/Kanban/Table
 */
const CanvasWithSwitcher = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
      <ViewSwitcher />
    </div>
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <ViewContainer />
    </div>
  </div>
);

/**
 * Composant factory wrapper (enveloppe factory de composant)
 * Encapsule chaque composant dans un div.panel-content (comme DockableLayout.tsx)
 */
const wrapPanelContent = (Component: React.ComponentType<any>, className?: string) => {
  const Wrapped = ({ api, group, params }: PanelComponentProps) => (
    <div className={`panel-content${className ? ` ${className}` : ''}`}>
      <Component api={api} group={group} params={params} />
    </div>
  );
  return Wrapped;
};

/**
 * Core panels map (carte des panneaux principaux)
 * Factory pattern: ID panneau → composant React encapsulé
 */
const CORE_PANELS: Record<string, React.ComponentType<any>> = {
  files: wrapPanelContent(FileTabs),
  explorer: wrapPanelContent(NodeExplorer),
  canvas: wrapPanelContent(CanvasWithSwitcher, 'canvas-panel'),
  properties: wrapPanelContent(NodeProperties),
  mapsettings: wrapPanelContent(MapSettings),
};

/**
 * Custom tab component with badge support (onglet personnalisé avec badges)
 * Affiche le titre + optionnel badge (notifications, compteurs, etc.)
 *
 * Badges:
 * - Récupérés depuis la définition du panneau (panelRegistry)
 * - Affichés uniquement si badge() > 0
 * - Stylisés avec variables CSS Cartae (--accent-color)
 */
const CustomTab: React.FC<IDockviewPanelProps> = ({ api, params }) => {
  const [badgeCount, setBadgeCount] = useState<number | null>(null);

  // Récupérer le badge depuis le registre de panneaux (fetch badge from panel registry)
  useEffect(() => {
    const component = params?.component as string | undefined;
    if (!component) {
      return undefined;
    }

    const panel = getPanel(component);
    if (panel?.badge) {
      const updateBadge = () => {
        const count = panel.badge?.() ?? null;
        setBadgeCount(count);
      };

      updateBadge();
      const interval = setInterval(updateBadge, 1000); // Rafraîchir toutes les secondes
      return () => clearInterval(interval);
    }

    return undefined;
  }, [params?.component]);

  return (
    <div className="dockview-custom-tab">
      <span>{api.title}</span>
      {badgeCount !== null && badgeCount > 0 && (
        <span
          className="tab-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            marginLeft: '6px',
            background: 'var(--accent-color, #3b82f6)',
            borderRadius: '9px',
            fontSize: '11px',
            fontWeight: '600',
            color: 'white',
            lineHeight: '1',
          }}
        >
          {badgeCount}
        </span>
      )}
    </div>
  );
};

/**
 * Placeholder component (composant de remplacement)
 * Utilisé pour les composants inconnus ou manquants (graceful degradation)
 */
const PlaceholderPanel: React.FC<{ componentId: string }> = ({ componentId }) => {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.warn(`[DockableLayoutV2] Unknown component: ${componentId}`);
  }, [componentId]);

  return (
    <div className="panel-content" style={{ padding: '20px', color: 'var(--fg-secondary)' }}>
      <p>⚠️ Component &quot;{componentId}&quot; not found</p>
      <p style={{ fontSize: '12px', marginTop: '10px' }}>
        This panel is missing or failed to load. Check console for details.
      </p>
    </div>
  );
};

/**
 * DockableLayoutV2 - Main layout component (composant de layout principal)
 *
 * Features:
 * - ✅ Factory pattern complet pour tous les panneaux core
 * - ✅ Intégration système de plugins (getAllPanels, dynamic panels)
 * - ✅ Custom tab rendering avec badges (badge count integration)
 * - ✅ Configuration initiale via objet structuré (layout config)
 * - ✅ Persistence localStorage (cartae_dockview_layout_v1)
 * - ✅ Error handling (console warnings, fallback placeholders)
 * - ✅ Real-time plugin addition/removal (onPanelRegistryChange)
 */
export const DockableLayoutV2: React.FC = () => {
  // API ref for programmatic layout control (ref API pour contrôle programmatique)
  const dockviewApiRef = useRef<DockviewApi | null>(null);

  // Dynamic panels state (état des panneaux dynamiques)
  const [dynamicPanels, setDynamicPanels] = useState<Record<string, React.ComponentType<any>>>({});

  // Obsidian theme config state (état de configuration du thème Obsidian)
  // TEMPORARILY DISABLED - @cartae/ui package not available yet
  // const [obsidianTheme, setObsidianTheme] = useState<ObsidianThemeConfig | null>(null);

  // Load Obsidian theme (charger le thème Obsidian)
  // TEMPORARILY DISABLED - @cartae/ui package not available yet
  // useObsidianThemeLoader(obsidianTheme);

  /**
   * Listen to panel registry changes (écouter les changements du registre)
   * Permet d'ajouter/retirer des panneaux en temps réel (real-time panel management)
   */
  useEffect(() => {
    // Initialiser les panneaux dynamiques au démarrage (initialize dynamic panels on mount)
    const initializeDynamicPanels = () => {
      const allPanels = getAllPanels();
      const newDynamicPanels: Record<string, React.ComponentType<any>> = {};

      allPanels.forEach(panel => {
        if (!CORE_PANELS[panel.id]) {
          // Wrapper le composant du plugin dans panel-content (wrap plugin component)
          newDynamicPanels[panel.id] = wrapPanelContent(panel.component);
        }
      });

      setDynamicPanels(newDynamicPanels);
    };

    initializeDynamicPanels();

    // S'abonner aux changements futurs (subscribe to future changes)
    const unsubscribe = onPanelRegistryChange(() => {
      const allPanels = getAllPanels();
      const newDynamicPanels: Record<string, React.ComponentType<any>> = {};

      allPanels.forEach(panel => {
        if (!CORE_PANELS[panel.id]) {
          newDynamicPanels[panel.id] = wrapPanelContent(panel.component);
        }
      });

      setDynamicPanels(newDynamicPanels);
    });

    return unsubscribe;
  }, []);

  /**
   * Merged components map (carte fusionnée des composants)
   * Core panels + dynamic panels from registry + placeholder fallback
   */
  const components = {
    ...CORE_PANELS,
    ...dynamicPanels,
    placeholder: PlaceholderPanel, // Fallback pour composants inconnus
  };

  // Log available components on mount
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[DockableLayoutV2] Available components:', Object.keys(components));
  }, [components]);

  /**
   * Tab components map (carte des composants d'onglets)
   * Support pour custom rendering avec badges
   */
  const tabComponents = {
    default: CustomTab,
  };

  /**
   * Initialize default layout (initialiser le layout par défaut)
   * Crée 3 colonnes: Left (Files+Explorer), Center (Canvas), Right (Properties+MapSettings)
   * All groups expand to full height by default
   */
  const initializeDefaultLayout = (api: DockviewApi): void => {
    // Create groups with explicit sizing
    // First group: root (no direction/reference needed)
    const leftGroup = api.addGroup();

    // Add panels to left group
    api.addPanel({
      id: 'files-panel',
      component: 'files',
      title: 'Files',
      position: { referenceGroup: leftGroup },
      params: { component: 'files' },
    });

    api.addPanel({
      id: 'explorer-panel',
      component: 'explorer',
      title: 'Explorer',
      position: { referenceGroup: leftGroup },
      params: { component: 'explorer' },
    });

    // Center group: 55% width (positioned right of left group)
    const centerGroup = api.addGroup({
      referenceGroup: leftGroup,
      direction: 'right',
      ratio: 55 / 15, // Ratio pour avoir 55% vs 15%
    });

    api.addPanel({
      id: 'canvas-panel',
      component: 'canvas',
      title: 'Canvas',
      position: { referenceGroup: centerGroup },
      params: { component: 'canvas' },
    });

    // Right column: Split vertical (30% width)
    // Top group (Properties) - 50% height
    const rightTopGroup = api.addGroup({
      referenceGroup: centerGroup,
      direction: 'right',
      ratio: 30 / 55, // 30% vs 55% (horizontal)
    });

    api.addPanel({
      id: 'properties-panel',
      component: 'properties',
      title: 'Properties',
      position: { referenceGroup: rightTopGroup },
      params: { component: 'properties' },
    });

    // Bottom group (MapSettings) - 50% height (below top group)
    const rightBottomGroup = api.addGroup({
      referenceGroup: rightTopGroup,
      direction: 'below',
      ratio: 1, // 50/50 split vertical
    });

    api.addPanel({
      id: 'mapsettings-panel',
      component: 'mapsettings',
      title: 'Map Settings',
      position: { referenceGroup: rightBottomGroup },
      params: { component: 'mapsettings' },
    });

    // eslint-disable-next-line no-console
    console.log('[DockableLayoutV2] Initialized layout with 3 columns');
  };

  /**
   * onReady callback (callback d'initialisation)
   * Appelé quand Dockview est monté et prêt
   *
   * Workflow:
   * 1. Sauvegarder ref API
   * 2. Charger layout depuis localStorage (si existe et valide)
   * 3. Sinon, créer layout initial via configuration structurée
   */
  const handleReady = (event: DockviewReadyEvent) => {
    dockviewApiRef.current = event.api;

    // FORCE clear old v1 layout to prevent cached layout issues
    localStorage.removeItem('cartae_dockview_layout_v1');

    // Try to load persisted layout (tentative de chargement layout persisté)
    // Version incremented to v2 to force new layout structure (Properties+MapSettings split)
    const savedLayout = localStorage.getItem('cartae_dockview_layout_v2');

    if (savedLayout) {
      try {
        const layoutJson = JSON.parse(savedLayout);
        event.api.fromJSON(layoutJson);
        // eslint-disable-next-line no-console
        console.log('[DockableLayoutV2] Restored layout from localStorage');
        return;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[DockableLayoutV2] Failed to restore layout, using default:', error);
        // localStorage peut être corrompu, le nettoyer (clean corrupted localStorage)
        localStorage.removeItem('cartae_dockview_layout_v1');
        localStorage.removeItem('cartae_dockview_layout_v2');
      }
    }

    // Default initial layout via configuration (layout initial par défaut)
    initializeDefaultLayout(event.api);
    // eslint-disable-next-line no-console
    console.log('[DockableLayoutV2] Initialized default layout');
  };

  /**
   * Persist layout on changes (persistance du layout sur changements)
   * Sauvegarde automatique dans localStorage à chaque modification
   */
  useEffect(() => {
    if (!dockviewApiRef.current) {
      return;
    }

    const handleLayoutChange = () => {
      if (dockviewApiRef.current) {
        try {
          const layoutState = dockviewApiRef.current.toJSON();
          localStorage.setItem('cartae_dockview_layout_v2', JSON.stringify(layoutState));
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[DockableLayoutV2] Failed to save layout:', error);
        }
      }
    };

    // Subscribe to layout changes (écouter les changements de layout)
    const api = dockviewApiRef.current;
    const disposable = api.onDidLayoutChange(handleLayoutChange);

    // Cleanup (nettoyage)
    return () => {
      disposable.dispose();
    };
  }, []);

  return (
    <div className="dockable-layout">
      {/* MenuBar en haut (Session 69) */}
      <MenuBar className="dockable-layout-menubar" />

      {/* Contenu principal avec Dockview panels */}
      <div className="dockable-layout-content">
        <DockviewReact
          components={components}
          tabComponents={tabComponents}
          onReady={handleReady}
          className="dockview-theme-custom"
        />
      </div>

      {/* StatusBar en bas (Session 69) */}
      <StatusBar className="dockable-layout-statusbar" />
    </div>
  );
};

export default DockableLayoutV2;
