/**
 * FR: Hook pour gérer les fichiers ouverts et la navigation
 * EN: Hook to manage open files and navigation
 */

import { create } from 'zustand';
import { XMindParser } from '../parsers/XMindParser';
import { v4 as uuidv4 } from 'uuid';
import { getNodeColor } from '../utils/nodeColors';
import { getPalette } from '../themes/colorPalettes';
import { loadOverlayFromStorage, saveOverlayToStorage } from '../utils/overlayValidation';
import {
  emitNodeCreated,
  emitNodeUpdated,
  emitNodeDeleted,
  emitFileCreated,
  emitFileOpened,
  emitFileClosed,
  emitFileActivated,
  emitSheetChanged,
  emitViewportChanged,
  emitNodeSelected,
  emitPaletteChanged,
} from '../utils/mindmapEvents';
import { adaptBigMindToContent, createEmptyBigMindData } from '../utils/contentAdapter';
import { loadObject, saveObject } from '../utils/storageManager';
import type { ExtendedMindMapData } from '../utils/fileFormat';
import { migrateAllLegacyData, hasLegacyData } from '../utils/legacyDataMigration';

export interface OpenFile {
  id: string;
  name: string;
  path?: string;
  type: 'xmind' | 'mm' | 'new';
  content?: ExtendedMindMapData; // Extended format with plugin support
  lastModified: Date;
  isActive: boolean;
  // FR: Feuilles (onglets) pour XMind
  // EN: Sheets (tabs) for XMind
  sheets?: Array<{ id: string; title: string }>;
  activeSheetId?: string | null;
  sheetsData?: any[]; // JSON brut des feuilles pour re-swapper
  // FR: Données XMind originales pour préserver la compatibilité
  // EN: Original XMind data to preserve compatibility
  xmindOriginal?: {
    theme?: any;
    manifest?: any;
    metadata?: any;
    extensions?: any;
    structureClass?: string;
  };
  // FR: Viewport (position et zoom) pour la carte
  // EN: Viewport (position and zoom) for the map
  viewport?: { x: number; y: number; zoom: number };
  // FR: Nœud sélectionné
  // EN: Selected node
  selectedNodeId?: string | null;
  // FR: Tags cachés pour cette carte
  // EN: Hidden tags for this map
  hiddenTags?: string[];
}

export interface MindMapData {
  id: string;
  name: string;
  rootNode: {
    id: string;
    title: string;
    children: any[];
  };
  nodes: Record<string, any>;
}

interface OpenFilesState {
  openFiles: OpenFile[];
  activeFileId: string | null;
  openFile: (file: Omit<OpenFile, 'id' | 'lastModified' | 'isActive'>) => string;
  closeFile: (fileId: string) => void;
  activateFile: (fileId: string) => void;
  getActiveFile: () => OpenFile | null;
  setActiveSheet: (fileId: string, sheetId: string) => void;
  createNewFile: (name?: string) => string;
  updateActiveFileNode: (nodeId: string, patch: Partial<any>) => void;
  addChildToActive: (parentId: string, title?: string) => string | null;
  removeNodeFromActive: (nodeId: string) => string | null; // returns parentId if removed
  addSiblingToActive: (siblingOfId: string, title?: string) => string | null;
  applyAutomaticColorsToAll: (theme: any) => void;
  updateActiveFileNodePalette: (paletteId: string) => void;
  updateActiveFileTagPalette: (paletteId: string) => void;
  updateActiveFileDefaultNodeStyle: (
    style: Partial<{ fontSize: number; width: number; fontFamily: string }>
  ) => void;
  updateActiveFileViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  updateActiveFileSelection: (selectedNodeId: string | null) => void;
  updateActiveFileHiddenTags: (hiddenTags: string[]) => void;
  saveOpenFilesToStorage: () => void;
  restoreOpenFilesFromStorage: () => void;
}

/**
 * FR: Hook pour gérer les fichiers ouverts
 * EN: Hook to manage open files
 */
export const useOpenFiles = create<OpenFilesState>((set, get) => ({
  openFiles: [],
  activeFileId: null,

  // FR: Ouvrir un nouveau fichier
  // EN: Open a new file
  openFile: (file: Omit<OpenFile, 'id' | 'lastModified' | 'isActive'>) => {
    const newFile: OpenFile = {
      ...file,
      id: uuidv4(),
      lastModified: new Date(),
      isActive: true,
    };

    set(state => {
      // FR: Désactiver tous les autres fichiers et ajouter le nouveau
      // EN: Deactivate all other files and add the new one
      const updatedFiles = state.openFiles.map(f => ({ ...f, isActive: false }));
      const result = [...updatedFiles, newFile];

      return {
        ...state,
        openFiles: result,
        activeFileId: newFile.id,
      };
    });

    // FR: Sauvegarder dans localStorage
    // EN: Save to localStorage
    get().saveOpenFilesToStorage();

    // Emit file opened event
    emitFileOpened({
      fileId: newFile.id,
      name: newFile.name,
      type: newFile.type,
      path: newFile.path,
    });

    // Migrate legacy data in background if needed
    if (newFile.content && hasLegacyData(newFile.content as ExtendedMindMapData)) {
      migrateAllLegacyData(newFile.content as ExtendedMindMapData)
        .then(migrated => {
          if (migrated) {
            // Save after migration
            get().saveOpenFilesToStorage();
          }
        })
        .catch(error => {
          // eslint-disable-next-line no-console
          console.error('[useOpenFiles] Legacy migration failed:', error);
        });
    }

    return newFile.id;
  },

  // FR: Fermer un fichier
  // EN: Close a file
  closeFile: (fileId: string) => {
    const currentState = get();
    const file = currentState.openFiles.find(f => f.id === fileId);

    set(s => {
      const filteredFiles = s.openFiles.filter(f => f.id !== fileId);

      // FR: Si on ferme le fichier actif, activer le précédent
      // EN: If closing active file, activate the previous one
      let newActiveFileId = s.activeFileId;
      if (fileId === s.activeFileId) {
        if (filteredFiles.length > 0) {
          const lastFile = filteredFiles[filteredFiles.length - 1];
          lastFile.isActive = true;
          newActiveFileId = lastFile.id;
        } else {
          newActiveFileId = null;
        }
      }

      return {
        ...s,
        openFiles: filteredFiles,
        activeFileId: newActiveFileId,
      };
    });

    // FR: Sauvegarder dans localStorage
    // EN: Save to localStorage
    get().saveOpenFilesToStorage();

    // Emit file closed event
    if (file) {
      emitFileClosed({
        fileId,
        name: file.name,
      });
    }
  },

  // FR: Activer un fichier
  // EN: Activate a file
  activateFile: (fileId: string) => {
    const currentState = get();
    const file = currentState.openFiles.find(f => f.id === fileId);

    set(s => ({
      ...s,
      openFiles: s.openFiles.map(f => ({ ...f, isActive: f.id === fileId })),
      activeFileId: fileId,
    }));

    // FR: Sauvegarder dans localStorage
    // EN: Save to localStorage
    get().saveOpenFilesToStorage();

    // Emit file activated event
    if (file) {
      emitFileActivated({
        fileId,
        name: file.name,
      });
    }
  },

  // FR: Définir la feuille active pour un fichier
  // EN: Set active sheet for a file
  setActiveSheet: (fileId: string, sheetId: string) => {
    set(state => {
      const file = state.openFiles.find(f => f.id === fileId);
      if (!file || !file.sheets || !file.sheetsData) {
        return state;
      }
      // FR: Retrouver l'index de la feuille et reconstruire le contenu
      const idx = file.sheets.findIndex(s => s.id === sheetId);
      if (idx < 0) return state;
      try {
        const sheetData = file.sheetsData[idx];
        const big = XMindParser.convertSheetJSONToBigMind(sheetData);
        const adaptedContent = adaptBigMindToContent(big);

        // Emit sheet changed event
        const sheet = file.sheets.find(s => s.id === sheetId);
        emitSheetChanged({
          fileId,
          sheetId,
          sheetTitle: sheet?.title || '',
        });

        return {
          ...state,
          openFiles: state.openFiles.map(f =>
            f.id === fileId ? { ...f, activeSheetId: sheetId, content: adaptedContent } : f
          ),
        };
      } catch (e) {
        return state;
      }
    });
  },

  // FR: Obtenir le fichier actif
  // EN: Get active file
  getActiveFile: () => {
    const state = get();
    const activeFile = state.openFiles.find(f => f.isActive) || null;
    return activeFile;
  },

  // FR: Créer un nouveau fichier
  // EN: Create a new file
  createNewFile: (name: string = 'Nouvelle carte') => {
    const bigMindData = createEmptyBigMindData(name);
    const content = adaptBigMindToContent(bigMindData);

    const fileId = get().openFile({
      name,
      type: 'new',
      content,
    });

    // Emit file created event
    emitFileCreated({
      fileId,
      name,
      type: 'new',
    });

    return fileId;
  },

  // FR: Mettre à jour un nœud du fichier actif et persister en localStorage
  // EN: Update a node of the active file and persist to localStorage
  updateActiveFileNode: (nodeId: string, patch: Partial<any>) => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active || !active.content || !active.content.nodes?.[nodeId]) return;

    const oldNode = active.content.nodes[nodeId];
    const updatedNode = { ...oldNode, ...patch };
    const updatedContent = {
      ...active.content,
      nodes: { ...active.content.nodes, [nodeId]: updatedNode },
    };

    // Persister overlay minimal (titre, notes, style, metadata)
    try {
      const key = `bigmind_overlay_${active.name}`;
      const overlay = loadOverlayFromStorage(key);
      overlay.nodes = overlay.nodes || {};
      overlay.nodes[nodeId] = {
        title: updatedNode.title,
        notes: updatedNode.notes,
        style: updatedNode.style,
        metadata: updatedNode.metadata,
      };
      saveOverlayToStorage(key, overlay);
    } catch (e) {
      // Ignore errors
    }

    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f =>
        f.id === active.id ? { ...f, content: updatedContent } : f
      ),
    }));

    // FR: Déclencher l'événement pour les plugins si le titre a changé
    // EN: Trigger event for plugins if title changed
    if (patch.title !== undefined && oldNode.title !== patch.title) {
      emitNodeUpdated({
        nodeId,
        title: patch.title,
        node: updatedNode,
      });
    }
  },
  // FR: Ajouter un enfant au nœud parent dans le fichier actif
  // EN: Add a child to parent in the active file
  addChildToActive: (parentId: string, title: string = 'Nouveau nœud') => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active || !active.content || !active.content.nodes?.[parentId]) return null;
    const newId = uuidv4();
    const nodes = { ...active.content.nodes };
    const newNode = { id: newId, title, children: [], parentId };
    nodes[newId] = newNode;
    const parent = { ...nodes[parentId] };
    parent.children = [...(parent.children || []), newId];
    nodes[parentId] = parent;

    const updatedContent = { ...active.content, nodes };
    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f =>
        f.id === active.id ? { ...f, content: updatedContent } : f
      ),
    }));

    // FR: Déclencher l'événement pour les plugins
    // EN: Trigger event for plugins
    emitNodeCreated({
      nodeId: newId,
      parentId,
      title,
      node: newNode,
    });

    return newId;
  },
  // FR: Supprimer un nœud (et son sous-arbre) du fichier actif
  // EN: Remove a node (and its subtree) from the active file
  removeNodeFromActive: (nodeId: string) => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active || !active.content || !active.content.nodes?.[nodeId]) return null;
    const rootId = active.content.rootNode?.id || active.content.nodes?.root?.id;
    // Ne pas supprimer la racine
    if (nodeId === rootId) return null;

    const nodes = { ...active.content.nodes } as Record<string, any>;
    const nodeToDelete = nodes[nodeId];
    const toDelete: string[] = [];
    const collect = (id: string) => {
      toDelete.push(id);
      const n = nodes[id];
      const children: string[] = n?.children || [];
      children.forEach(collect);
    };
    collect(nodeId);

    const parentId: string | null = nodes[nodeId]?.parentId || null;
    // Retirer du parent
    if (parentId && nodes[parentId]) {
      nodes[parentId] = {
        ...nodes[parentId],
        children: (nodes[parentId].children || []).filter((cid: string) => cid !== nodeId),
      };
    }
    // Supprimer tous les nœuds collectés
    toDelete.forEach(id => {
      delete nodes[id];
    });

    const updatedContent = { ...active.content, nodes };
    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f =>
        f.id === active.id ? { ...f, content: updatedContent } : f
      ),
    }));

    // FR: Déclencher l'événement pour les plugins
    // EN: Trigger event for plugins
    emitNodeDeleted({
      nodeId,
      node: nodeToDelete,
    });

    return parentId;
  },
  // FR: Ajouter un frère au nœud sélectionné (même parent)
  // EN: Add a sibling to selected node (same parent)
  addSiblingToActive: (siblingOfId: string, title: string = 'Nouveau nœud') => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active || !active.content || !active.content.nodes?.[siblingOfId]) return null;
    const nodes = { ...active.content.nodes } as Record<string, any>;
    const parentId: string | null = nodes[siblingOfId]?.parentId || null;
    if (!parentId) {
      // pas de parent -> créer enfant du courant
      return get().addChildToActive(siblingOfId, title);
    }
    const newId = uuidv4();
    const newNode = { id: newId, title, children: [], parentId };
    nodes[newId] = newNode;
    const list: string[] = [...(nodes[parentId]?.children || [])];
    const idx = list.indexOf(siblingOfId);
    if (idx >= 0) list.splice(idx + 1, 0, newId);
    else list.push(newId);
    nodes[parentId] = { ...nodes[parentId], children: list };

    const updatedContent = { ...active.content, nodes };
    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f =>
        f.id === active.id ? { ...f, content: updatedContent } : f
      ),
    }));

    // FR: Déclencher l'événement pour les plugins
    // EN: Trigger event for plugins
    emitNodeCreated({
      nodeId: newId,
      parentId,
      title,
      node: newNode,
    });

    return newId;
  },

  // FR: Appliquer les couleurs automatiques à tous les nœuds
  // EN: Apply automatic colors to all nodes
  applyAutomaticColorsToAll: (theme: any) => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active || !active.content || !active.content.nodes) return;

    const rootId = active.content.rootNode?.id || active.content.nodes?.root?.id;
    if (!rootId) return;

    const nodes = { ...active.content.nodes } as Record<string, any>;
    const updatedNodes: Record<string, any> = {};

    // FR: Appliquer la couleur automatique à chaque nœud
    // EN: Apply automatic color to each node
    Object.keys(nodes).forEach(nodeId => {
      const node = nodes[nodeId];
      const autoColor = getNodeColor(nodeId, nodes, rootId, theme);

      updatedNodes[nodeId] = {
        ...node,
        style: {
          ...node.style,
          backgroundColor: autoColor,
        },
      };
    });

    const updatedContent = { ...active.content, nodes: updatedNodes };
    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f =>
        f.id === active.id ? { ...f, content: updatedContent } : f
      ),
    }));
  },

  // FR: Mettre à jour la palette de nœuds du fichier actif
  // EN: Update node palette of the active file
  updateActiveFileNodePalette: (paletteId: string) => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active || !active.content || !active.content.nodes) return;

    const rootId = active.content.rootNode?.id || active.content.nodes?.root?.id;
    if (!rootId) return;

    // FR: Si c'est la palette "__map__", on ne recalcule PAS les couleurs
    // EN: If it's the "__map__" palette, DON'T recalculate colors
    // (ces couleurs SONT déjà la palette de la carte)
    if (paletteId === '__map__') {
      const updatedContent = {
        ...active.content,
        nodePaletteId: paletteId,
      };

      // Persister dans localStorage
      try {
        const key = `bigmind_overlay_${active.name}`;
        const overlay = loadOverlayFromStorage(key);
        overlay.nodePaletteId = paletteId;
        saveOverlayToStorage(key, overlay);
      } catch (e) {
        // Ignore errors
      }

      set(prev => ({
        ...prev,
        openFiles: prev.openFiles.map(f =>
          f.id === active.id ? { ...f, content: updatedContent } : f
        ),
      }));

      // Emit palette changed event
      emitPaletteChanged({
        type: 'node',
        paletteId,
      });

      return;
    }

    // FR: Obtenir la palette et créer un thème temporaire
    // EN: Get palette and create temporary theme
    const palette = getPalette(paletteId);
    const tempTheme = {
      id: 'temp',
      name: 'Temporary Theme',
      colors: {
        background: '#f8fafc',
        backgroundSecondary: '#ffffff',
        backgroundTertiary: '#f1f5f9',
        foreground: '#0f172a',
        foregroundSecondary: '#475569',
        foregroundMuted: '#94a3b8',
        nodeBackground: '#ffffff',
        nodeText: '#0f172a',
        nodeBorder: '#e2e8f0',
        accent: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      palette: palette.colors,
    };

    // FR: Recalculer les couleurs de tous les nœuds avec la nouvelle palette
    // EN: Recalculate all node colors with the new palette
    const nodes = { ...active.content.nodes } as Record<string, any>;
    const updatedNodes: Record<string, any> = {};

    Object.keys(nodes).forEach(nodeId => {
      const node = nodes[nodeId];
      const autoColor = getNodeColor(nodeId, nodes, rootId, tempTheme);

      updatedNodes[nodeId] = {
        ...node,
        style: {
          ...node.style,
          backgroundColor: autoColor,
        },
      };
    });

    const updatedContent = {
      ...active.content,
      nodePaletteId: paletteId,
      nodes: updatedNodes,
    };

    // Persister dans localStorage
    try {
      const key = `bigmind_overlay_${active.name}`;
      const overlay = loadOverlayFromStorage(key);
      overlay.nodePaletteId = paletteId;
      // FR: Sauvegarder aussi les couleurs mises à jour
      // EN: Also save updated colors
      if (!overlay.nodes) overlay.nodes = {};
      Object.keys(updatedNodes).forEach(nodeId => {
        if (!overlay.nodes) overlay.nodes = {};
        overlay.nodes[nodeId] = overlay.nodes[nodeId] || {};
        overlay.nodes[nodeId].style = updatedNodes[nodeId].style;
      });
      saveOverlayToStorage(key, overlay);
    } catch (e) {
      // Ignore errors
    }

    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f =>
        f.id === active.id ? { ...f, content: updatedContent } : f
      ),
    }));

    // Emit palette changed event
    emitPaletteChanged({
      type: 'node',
      paletteId,
    });
  },

  // FR: Mettre à jour la palette de tags du fichier actif
  // EN: Update tag palette of the active file
  updateActiveFileTagPalette: (paletteId: string) => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active || !active.content) return;

    // FR: Note: pour les tags, on ne recalcule jamais les couleurs automatiquement
    // EN: Note: for tags, we never recalculate colors automatically
    // (les tags obtiennent leur couleur au moment de la création)
    const updatedContent = {
      ...active.content,
      tagPaletteId: paletteId,
    };

    // Persister dans localStorage
    try {
      const key = `bigmind_overlay_${active.name}`;
      const overlay = loadOverlayFromStorage(key);
      overlay.tagPaletteId = paletteId;
      saveOverlayToStorage(key, overlay);
    } catch (e) {
      // Ignore errors
    }

    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f =>
        f.id === active.id ? { ...f, content: updatedContent } : f
      ),
    }));

    // Emit palette changed event
    emitPaletteChanged({
      type: 'tag',
      paletteId,
    });
  },

  // FR: Mettre à jour le style par défaut des nœuds du fichier actif
  // EN: Update default node style of the active file
  updateActiveFileDefaultNodeStyle: (
    style: Partial<{ fontSize: number; width: number; fontFamily: string }>
  ) => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active || !active.content) return;

    const updatedContent = {
      ...active.content,
      defaultNodeStyle: {
        ...active.content.defaultNodeStyle,
        ...style,
      },
    };

    // Persister dans localStorage
    try {
      const key = `bigmind_overlay_${active.name}`;
      const overlay = loadOverlayFromStorage(key);
      overlay.defaultNodeStyle = updatedContent.defaultNodeStyle;
      saveOverlayToStorage(key, overlay);
    } catch (e) {
      // Ignore errors
    }

    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f =>
        f.id === active.id ? { ...f, content: updatedContent } : f
      ),
    }));
  },

  // FR: Mettre à jour le viewport du fichier actif
  // EN: Update viewport of active file
  updateActiveFileViewport: (viewport: { x: number; y: number; zoom: number }) => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active) return;

    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f => (f.id === active.id ? { ...f, viewport } : f)),
    }));

    // FR: Sauvegarder immédiatement dans localStorage (synchrone)
    // EN: Save immediately to localStorage (synchronous)
    get().saveOpenFilesToStorage();

    // Emit viewport changed event
    emitViewportChanged(viewport);
  },

  // FR: Mettre à jour la sélection du fichier actif
  // EN: Update selection of active file
  updateActiveFileSelection: (selectedNodeId: string | null) => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active) return;

    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f => (f.id === active.id ? { ...f, selectedNodeId } : f)),
    }));

    // FR: Sauvegarder immédiatement dans localStorage (synchrone)
    // EN: Save immediately to localStorage (synchronous)
    get().saveOpenFilesToStorage();

    // Emit node selected event
    emitNodeSelected({
      nodeId: selectedNodeId,
      nodeIds: selectedNodeId ? [selectedNodeId] : [],
    });
  },

  // FR: Mettre à jour les tags cachés du fichier actif
  // EN: Update hidden tags of active file
  updateActiveFileHiddenTags: (hiddenTags: string[]) => {
    const state = get();
    const active = state.openFiles.find(f => f.isActive);
    if (!active) return;

    set(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(f => (f.id === active.id ? { ...f, hiddenTags } : f)),
    }));

    // FR: Sauvegarder immédiatement dans localStorage (synchrone)
    // EN: Save immediately to localStorage (synchronous)
    get().saveOpenFilesToStorage();
  },

  // FR: Sauvegarder les fichiers ouverts dans localStorage
  // EN: Save open files to localStorage
  saveOpenFilesToStorage: () => {
    const state = get();

    // FR: Sauvegarder TOUS les fichiers avec leur contenu actuel
    // EN: Save ALL files with their current content
    const filesToSave = state.openFiles.map(f => ({
      id: f.id,
      name: f.name,
      type: f.type,
      path: f.path,
      content: f.content,
      isActive: f.isActive,
      lastModified: f.lastModified,
      viewport: f.viewport,
      selectedNodeId: f.selectedNodeId,
      hiddenTags: f.hiddenTags,
      sheets: f.sheets,
      activeSheetId: f.activeSheetId,
    }));

    saveObject('bigmind_open_files', {
      files: filesToSave,
      activeFileId: state.activeFileId,
    });
  },

  // FR: Restaurer les fichiers ouverts depuis localStorage
  // EN: Restore open files from localStorage
  restoreOpenFilesFromStorage: () => {
    const data = loadObject<any>('bigmind_open_files', null);
    if (!data) return;

    const { files, activeFileId } = data;

    if (!files || !Array.isArray(files) || files.length === 0) return;

    // FR: Convertir lastModified en Date
    // EN: Convert lastModified to Date
    const restoredFiles = files.map((f: any) => ({
      ...f,
      lastModified: new Date(f.lastModified),
    }));

    set({
      openFiles: restoredFiles,
      activeFileId: activeFileId || (restoredFiles.length > 0 ? restoredFiles[0].id : null),
    });
  },
}));
