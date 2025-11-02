/**
 * FR: Hook pour gérer l'état de la carte mentale
 * EN: Hook to manage mind map state
 */

import { useCallback } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  MindMap,
  // MindNode,
  NodeID,
  SelectionState,
  HistoryManager,
  AddNodeCommand,
  DeleteNodeCommand,
  UpdateNodeTitleCommand,
  MoveNodeCommand,
  ReparentNodeCommand,
  NodeFactory,
} from '@cartae/mindmap-core';

// FR: État global de l'application
// EN: Global application state
interface AppState {
  // FR: Carte mentale actuelle
  // EN: Current mind map
  mindMap: MindMap | null;

  // FR: État de sélection
  // EN: Selection state
  selection: SelectionState;

  // FR: Gestionnaire d'historique
  // EN: History manager
  history: HistoryManager;

  // FR: Mode d'édition (édition inline, etc.)
  // EN: Edit mode (inline editing, etc.)
  editMode: {
    nodeId: NodeID | null;
    field: 'title' | 'notes' | null;
  };

  // FR: Actions
  // EN: Actions
  actions: {
    // FR: Initialiser une nouvelle carte
    // EN: Initialize a new map
    createNewMap: (name?: string) => void;

    // FR: Charger une carte existante
    // EN: Load an existing map
    loadMap: (map: MindMap) => void;

    // FR: Ajouter un nœud
    // EN: Add a node
    addNode: (parentId: NodeID | null, title: string, position?: { x: number; y: number }) => void;

    // FR: Supprimer un nœud
    // EN: Delete a node
    deleteNode: (nodeId: NodeID) => void;

    // FR: Modifier le titre d'un nœud
    // EN: Update node title
    updateNodeTitle: (nodeId: NodeID, title: string) => void;

    // FR: Déplacer un nœud
    // EN: Move a node
    moveNode: (nodeId: NodeID, position: { x: number; y: number }) => void;

    // FR: Changer le parent d'un nœud
    // EN: Change node parent
    reparentNode: (nodeId: NodeID, newParentId: NodeID | null, newIndex?: number) => void;

    // FR: Sélectionner des nœuds
    // EN: Select nodes
    selectNodes: (nodeIds: NodeID[], mode?: 'single' | 'multiple') => void;

    // FR: Annuler la dernière action
    // EN: Undo last action
    undo: () => void;

    // FR: Refaire la dernière action
    // EN: Redo last action
    redo: () => void;

    // FR: Basculer le mode d'édition
    // EN: Toggle edit mode
    setEditMode: (nodeId: NodeID | null, field: 'title' | 'notes' | null) => void;
  };
}

// FR: Store Zustand avec middlewares
// EN: Zustand store with middlewares
export const useMindmapStore = create<AppState>()(
  devtools(
    subscribeWithSelector(
      immer((set, _get) => ({
        mindMap: null,
        selection: {
          selectedNodes: [],
          primaryNode: null,
          mode: 'single',
        },
        history: new HistoryManager(100),
        editMode: {
          nodeId: null,
          field: null,
        },
        actions: {
          createNewMap: (name = 'Nouvelle carte') => {
            set(state => {
              const newMap = NodeFactory.createEmptyMindMap(name);
              state.mindMap = newMap;
              state.selection = {
                selectedNodes: [],
                primaryNode: null,
                mode: 'single',
              };
              state.history.clear();
            });
          },

          loadMap: (map: MindMap) => {
            set(state => {
              state.mindMap = map;
              state.selection = {
                selectedNodes: [],
                primaryNode: null,
                mode: 'single',
              };
              state.history.clear();
            });
          },

          addNode: (parentId, title, position = { x: 0, y: 0 }) => {
            set(state => {
              if (!state.mindMap) return;

              const command = new AddNodeCommand(`node_${Date.now()}`, parentId, title, position);

              state.mindMap = command.execute(state.mindMap);
              state.history.addCommand(command);
            });
          },

          deleteNode: (nodeId: NodeID) => {
            set(state => {
              if (!state.mindMap) return;

              const command = new DeleteNodeCommand(nodeId);
              state.mindMap = command.execute(state.mindMap);
              state.history.addCommand(command);

              // FR: Retirer de la sélection si nécessaire
              // EN: Remove from selection if needed
              state.selection.selectedNodes = state.selection.selectedNodes.filter(
                (id: string) => id !== nodeId
              );
              if (state.selection.primaryNode === nodeId) {
                state.selection.primaryNode = null;
              }
            });
          },

          updateNodeTitle: (nodeId: NodeID, title: string) => {
            set(state => {
              if (!state.mindMap) return;

              const command = new UpdateNodeTitleCommand(nodeId, title);
              state.mindMap = command.execute(state.mindMap);
              state.history.addCommand(command);
            });
          },

          moveNode: (nodeId: NodeID, position: { x: number; y: number }) => {
            set(state => {
              if (!state.mindMap) return;

              const command = new MoveNodeCommand(nodeId, position);
              state.mindMap = command.execute(state.mindMap);
              state.history.addCommand(command);
            });
          },

          reparentNode: (nodeId: NodeID, newParentId: NodeID | null, newIndex = 0) => {
            set(state => {
              if (!state.mindMap) return;

              const command = new ReparentNodeCommand(nodeId, newParentId, newIndex);
              state.mindMap = command.execute(state.mindMap);
              state.history.addCommand(command);
            });
          },

          selectNodes: (nodeIds: NodeID[], mode = 'single') => {
            set(state => {
              state.selection = {
                selectedNodes: mode === 'single' ? [nodeIds[0]] : nodeIds,
                primaryNode: nodeIds[0] || null,
                mode,
              };
            });
          },

          undo: () => {
            set(state => {
              if (!state.mindMap) return;

              const newMap = state.history.undo(state.mindMap);
              if (newMap) {
                state.mindMap = newMap;
              }
            });
          },

          redo: () => {
            set(state => {
              if (!state.mindMap) return;

              const newMap = state.history.redo(state.mindMap);
              if (newMap) {
                state.mindMap = newMap;
              }
            });
          },

          setEditMode: (nodeId: NodeID | null, field: 'title' | 'notes' | null) => {
            set(state => {
              state.editMode = { nodeId, field };
            });
          },
        },
      }))
    ),
    { name: 'bigmind-store' }
  )
);

// FR: Hook personnalisé pour utiliser le store
// EN: Custom hook to use the store
export const useMindmap = () => {
  const store = useMindmapStore();

  // FR: Actions avec useCallback pour éviter les re-renders
  // EN: Actions with useCallback to avoid re-renders
  const actions = useCallback(() => store.actions, [store.actions]);

  return {
    mindMap: store.mindMap,
    selection: store.selection,
    editMode: store.editMode,
    canUndo: store.history.canUndo(),
    canRedo: store.history.canRedo(),
    actions: actions(),
  };
};
