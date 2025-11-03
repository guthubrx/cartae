/**
 * View Store - Gestion de la vue active
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewType = 'mindmap' | 'kanban' | 'table';

export interface ViewConfig {
  id: ViewType;
  label: string;
  icon: string;
  description: string;
  enabled?: boolean;
}

export const VIEW_CONFIGS: Record<ViewType, ViewConfig> = {
  mindmap: {
    id: 'mindmap',
    label: 'Mind Map',
    icon: '🧠',
    description: 'Vue graphe avec relations hiérarchiques',
    enabled: true,
  },
  kanban: {
    id: 'kanban',
    label: 'Kanban',
    icon: '📋',
    description: 'Vue board avec colonnes et drag & drop',
    enabled: true,
  },
  table: {
    id: 'table',
    label: 'Tableau',
    icon: '📊',
    description: 'Vue tableau avec tri et filtres',
    enabled: true,
  },
};

export interface ViewStoreState {
  activeView: ViewType;
  setView: (view: ViewType) => void;
  getView: () => ViewType;
  getActiveViewConfig: () => ViewConfig;
  getAvailableViews: () => ViewConfig[];
  isViewEnabled: (view: ViewType) => boolean;
  resetToDefault: () => void;
}

const DEFAULT_VIEW: ViewType = 'mindmap';

export const useViewStore = create<ViewStoreState>()(
  persist(
    (set, get) => ({
      activeView: DEFAULT_VIEW,

      setView: (view: ViewType) => {
        if (!VIEW_CONFIGS[view]?.enabled) {
          console.warn(`[ViewStore] Vue "${view}" n'est pas activée`);
          return;
        }
        // eslint-disable-next-line no-console
        console.log(`[ViewStore] Changement de vue : ${get().activeView} → ${view}`);
        set({ activeView: view });
      },

      getView: () => get().activeView,
      getActiveViewConfig: () => VIEW_CONFIGS[get().activeView],
      getAvailableViews: () => Object.values(VIEW_CONFIGS).filter(config => config.enabled),
      isViewEnabled: (view: ViewType) => VIEW_CONFIGS[view]?.enabled ?? false,
      resetToDefault: () => {
        // eslint-disable-next-line no-console
        console.log(`[ViewStore] Reset vers vue par défaut : ${DEFAULT_VIEW}`);
        set({ activeView: DEFAULT_VIEW });
      },
    }),
    {
      name: 'cartae-view-storage',
      version: 1,
    }
  )
);

export function useActiveView(): ViewType {
  return useViewStore(state => state.activeView);
}

export function useSetView() {
  return useViewStore(state => state.setView);
}
