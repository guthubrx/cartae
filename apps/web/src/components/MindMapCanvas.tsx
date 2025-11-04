/**
 * FR: Composant principal du canvas de carte mentale
 * EN: Main mind map canvas component
 */

import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../styles/drag-drop-animations.css';
import { useOpenFiles } from '../hooks/useOpenFiles';
// import { useViewport } from '../hooks/useViewport';
import { useCanvasOptions } from '../hooks/useCanvasOptions';
import { useSelection } from '../hooks/useSelection';
import MindMapNode from './MindMapNode';
import MindMapEdge from './MindMapEdge';
import { useFlowInstance } from '../hooks/useFlowInstance';
import { useShortcuts } from '../hooks/useShortcuts';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useTagStore } from '../hooks/useTagStore';
import { useAppSettings } from '../hooks/useAppSettings';
import { nodeStyleRegistry } from '../utils/nodeStyleRegistry';
import { getPalette, getCanvasBackgroundForTheme } from '../themes/colorPalettes';

// FR: Types de nœuds personnalisés
// EN: Custom node types
const nodeTypes: NodeTypes = {
  mindmap: MindMapNode as any,
};

// FR: Types d'arêtes personnalisés
// EN: Custom edge types
const edgeTypes: EdgeTypes = {
  mindmap: MindMapEdge as any,
};

function MindMapCanvas() {
  const activeFile = useOpenFiles(state => state.openFiles.find(f => f.isActive) || null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const setFlowInstance = useFlowInstance(s => s.setInstance);
  const viewportRestoredRef = useRef<boolean>(false);
  const lastFileIdRef = useRef<string | null>(null);
  const restoringRef = useRef<boolean>(false);
  // const zoom = useViewport((s) => s.zoom);
  // const setZoom = useViewport((s) => s.setZoom);
  const nodesDraggable = useCanvasOptions(s => s.nodesDraggable);
  const followSelection = useCanvasOptions(s => s.followSelection);
  const selectedNodeId = useSelection(s => s.selectedNodeId);
  const setSelectedNodeId = useSelection(s => s.setSelectedNodeId);
  const addChildToActive = useOpenFiles(s => s.addChildToActive);
  const updateActiveFileNode = useOpenFiles(s => s.updateActiveFileNode);
  const addSiblingToActive = useOpenFiles(s => s.addSiblingToActive);
  const removeNodeFromActive = useOpenFiles(s => s.removeNodeFromActive);
  const applyAutomaticColorsToAll = useOpenFiles(s => s.applyAutomaticColorsToAll);
  const updateActiveFileViewport = useOpenFiles(s => s.updateActiveFileViewport);
  const getShortcut = useShortcuts(s => s.getShortcut);

  // FR: Hooks pour filtrer les nœuds par tags cachés
  // EN: Hooks to filter nodes by hidden tags
  const hiddenTags = useTagStore(s => s.hiddenTags);
  const getNodeTags = useTagStore(s => s.getNodeTags);

  // FR: Hook pour le thème
  // EN: Hook for theme
  const themeId = useAppSettings(s => s.themeId);
  const getCurrentTheme = useAppSettings(s => s.getCurrentTheme);
  const showMinimap = useAppSettings(s => s.showMinimap);
  const defaultNodePaletteId = useAppSettings(s => s.defaultNodePaletteId);

  // FR: Calculer le fond de carte selon la palette et le thème
  // EN: Calculate canvas background based on palette and theme
  const canvasBackgroundColor = useMemo(() => {
    if (!activeFile) {
      // Si aucun fichier, utiliser le fond par défaut du thème
      return getCurrentTheme().colors.backgroundSecondary;
    }

    // Obtenir la palette active (celle de la carte ou la palette par défaut)
    const activePaletteId = activeFile.content?.nodePaletteId || defaultNodePaletteId;
    const palette = getPalette(activePaletteId);
    
    // Obtenir le fond de carte adaptatif si disponible
    const canvasBg = getCanvasBackgroundForTheme(palette, themeId as 'light' | 'dark');
    
    // Si la palette a un fond de carte défini, l'utiliser
    if (canvasBg) {
      return canvasBg;
    }

    // Sinon, utiliser le fond par défaut du thème
    return getCurrentTheme().colors.backgroundSecondary;
  }, [activeFile, defaultNodePaletteId, themeId, getCurrentTheme]);

  // FR: Récupérer les paramètres par défaut des nœuds
  // EN: Get default node settings
  const defaultNodeWidth = useAppSettings(s => s.defaultNodeWidth);
  const defaultNodeHeight = useAppSettings(s => s.defaultNodeHeight);

  // FR: Hook pour gérer le drag & drop des nœuds
  // EN: Hook to manage node drag & drop
  const {
    draggedNodeId,
    draggedDescendants,
    dragTarget,
    isValidTarget,
    ghostNode,
    dragMode,
    setDragMode,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    dropPosition,
    isSiblingReorder,
  } = useDragAndDrop({
    activeFile,
    instanceRef,
  });

  // Debug logs removed for cleanliness

  // FR: Convertir les nœuds du fichier actif en nœuds ReactFlow
  // EN: Convert active file nodes to ReactFlow nodes
  const convertToReactFlowNodes = useCallback((): Node[] => {
    if (!activeFile || !activeFile.content || !activeFile.content.nodes) {
      return [];
    }

    // FR: Variable locale pour éviter les erreurs TypeScript "possibly undefined"
    // EN: Local variable to avoid TypeScript "possibly undefined" errors
    const { content } = activeFile;

    const nodes: Node[] = [];

    // FR: Le parser XMind crée rootNode, pas nodes.root
    // EN: XMind parser creates rootNode, not nodes.root
    const rootNode = content.rootNode || content.nodes?.root;

    if (!rootNode) {
      return [];
    }

    // FR: Le nœud racine sera ajouté par positionSubtree (pour éviter les doublons)
    // EN: Root node will be added by positionSubtree (to avoid duplicates)

    // FR: Layout horizontal avec calcul dynamique de la hauteur pour éviter les chevauchements
    // EN: Horizontal layout with dynamic height calculation to avoid overlaps
    const LINE_HEIGHT = 20; // Hauteur de ligne approx
    const NODE_VPAD = 16; // Padding vertical
    const SIBLING_GAP = 16; // Espace entre sous-arbres
    const HORIZONTAL_GAP = 80; // Espace horizontal entre les niveaux

    // FR: Calculer la largeur effective avec hiérarchie : fichier > global
    // EN: Calculate effective width with hierarchy: file > global
    const getEffectiveNodeWidth = (): number => {
      if (content.defaultNodeStyle?.width) {
        return content.defaultNodeStyle.width;
      }
      return defaultNodeWidth || 200;
    };

    const NODE_WIDTH = getEffectiveNodeWidth();
    // FR: Distance entre niveaux adaptée à la largeur des nœuds
    // EN: Distance between levels adapted to node width
    const LEVEL_WIDTH = NODE_WIDTH + HORIZONTAL_GAP;

    const estimateTextHeight = (text: string): number => {
      // FR: Si une hauteur fixe est définie, l'utiliser
      // EN: If a fixed height is defined, use it
      if (defaultNodeHeight > 0) {
        return defaultNodeHeight;
      }

      // FR: Sinon, calcul automatique basé sur le texte
      // EN: Otherwise, automatic calculation based on text
      if (!text) return LINE_HEIGHT + NODE_VPAD;
      const words = text.split(/\s+/);
      const avgCharWidth = 7;
      const maxCharsPerLine = Math.max(8, Math.floor((NODE_WIDTH - 24) / avgCharWidth));
      let lines = 1;
      let current = 0;
      words.forEach(w => {
        const len = w.length + 1;
        if (current + len > maxCharsPerLine) {
          lines += 1;
          current = len;
        } else {
          current += len;
        }
      });
      return Math.max(LINE_HEIGHT + NODE_VPAD, lines * LINE_HEIGHT + NODE_VPAD);
    };

    // FR: Calcul de la hauteur (px) par sous-arbre
    // EN: Compute subtree total height in pixels
    const subtreeHeightById: Record<string, number> = {};
    const nodeOwnHeightById: Record<string, number> = {};
    const computeSubtreeHeights = (node: any): number => {
      const own = estimateTextHeight(node.title || '');
      nodeOwnHeightById[node.id] = own;
      // Si le nœud est replié, ignorer sa descendance
      if (node.collapsed || !node.children || node.children.length === 0) {
        subtreeHeightById[node.id] = own;
        return own;
      }
      let total = 0;
      node.children.forEach((childId: string, idx: number) => {
        const childNode = content.nodes[childId];
        if (childNode) {
          total += computeSubtreeHeights(childNode);
          if (idx < node.children.length - 1) total += SIBLING_GAP;
        }
      });
      const height = Math.max(own, total);
      subtreeHeightById[node.id] = height;
      return height;
    };

    // FR: Positionner un sous-arbre dans une bande verticale (px)
    // EN: Position a subtree within a vertical band (px)
    const positionSubtree = (
      node: any,
      level: number,
      direction: number, // -1 left, 0 root, +1 right
      baseY: number // début de la bande verticale allouée
    ) => {
      const totalHeight = subtreeHeightById[node.id] || LINE_HEIGHT + NODE_VPAD;
      const x = level === 0 ? 0 : direction * level * LEVEL_WIDTH;
      const nodeCenterY = baseY + totalHeight / 2 - nodeOwnHeightById[node.id] / 2;

      // FR: Créer les données de base du nœud
      // EN: Create base node data
      const nodeData: any = {
        id: node.id,
        title: node.title,
        parentId: level === 0 ? null : 'parent', // fixé plus tard
        children: node.children || [],
        style: node.style,
        isSelected: false,
        isPrimary: level === 0,
        direction,
        childCounts: { total: node.children?.length || 0 },
      };

      // FR: Calculer les styles via les plugins (synchrone)
      // EN: Compute styles via plugins (synchronous)
      const computedStyle = nodeStyleRegistry.compute(nodeData, {
        nodeId: node.id,
        nodes: content.nodes || {},
        rootId: rootNode.id,
        level,
        isPrimary: level === 0,
      });

      // FR: Ajouter computedStyle aux données
      // EN: Add computedStyle to data
      if (Object.keys(computedStyle).length > 0) {
        nodeData.computedStyle = computedStyle;
      }

      nodes.push({
        id: node.id,
        type: 'mindmap',
        position: { x, y: nodeCenterY },
        data: nodeData,
      });

      // Si replié, ne pas positionner les enfants
      if (node.collapsed || !node.children || node.children.length === 0) return;

      const childIds: string[] = node.children;
      if (childIds.length === 1) {
        // FR: Cas enfant unique: aligner verticalement le centre de l'enfant sur le parent
        // EN: Single child: align child's center with parent's center
        const onlyId = childIds[0];
        const ch = subtreeHeightById[onlyId] || LINE_HEIGHT + NODE_VPAD;
        const parentCenterY =
          nodeCenterY + (nodeOwnHeightById[node.id] || LINE_HEIGHT + NODE_VPAD) / 2;
        // FR: Respecter la bande verticale allouée pour éviter de chevaucher d'autres branches
        // EN: Respect allocated vertical band to avoid overlapping other branches
        const bandStart = baseY;
        const bandEnd = baseY + totalHeight;
        let base = parentCenterY - ch / 2;
        if (base < bandStart) base = bandStart;
        if (base + ch > bandEnd) base = Math.max(bandStart, bandEnd - ch);
        const childNode = content.nodes[onlyId];
        // FR: Déterminer la direction pour l'enfant
        // EN: Determine direction for child
        let childDirection: number;
        if (level === 0) {
          childDirection = direction === 0 ? +1 : direction;
        } else {
          childDirection = direction;
        }
        positionSubtree(childNode, level + 1, childDirection, base);
      } else if (level === 0) {
        // FR: Au niveau racine: utiliser les positions XMind si disponibles, sinon répartition par défaut
        // EN: At root level: use XMind positions if available, otherwise default distribution
        const rightIds: string[] = [];
        const leftIds: string[] = [];

        childIds.forEach((id, idx) => {
          const childNode = content.nodes[id];
          const xmindPos = (childNode as any)?.xmindPosition;

          // FR: Si position XMind disponible, utiliser x pour déterminer le côté
          // EN: If XMind position available, use x to determine side
          if (xmindPos && typeof xmindPos.x === 'number') {
            if (xmindPos.x >= 0) {
              rightIds.push(id);
            } else {
              leftIds.push(id);
            }
          } else if (idx < Math.ceil(childIds.length / 2)) {
            // FR: Fallback: première moitié à droite, deuxième moitié à gauche
            // EN: Fallback: first half on right, second half on left
            rightIds.push(id);
          } else {
            leftIds.push(id);
          }
        });

        // FR: Injecter les compteurs gauche/droite sur la racine
        const rootIndex = nodes.findIndex(n => n.id === node.id);
        if (rootIndex !== -1) {
          (nodes[rootIndex].data as any).childCounts = {
            left: leftIds.length,
            right: rightIds.length,
            total: childIds.length,
          };
        }

        // Droite
        let offsetRight =
          nodeCenterY -
          (rightIds.reduce(
            (acc, id) => acc + (subtreeHeightById[id] || LINE_HEIGHT + NODE_VPAD),
            0
          ) +
            SIBLING_GAP * Math.max(0, rightIds.length - 1)) /
            2;
        rightIds.forEach(childId => {
          const ch = subtreeHeightById[childId] || LINE_HEIGHT + NODE_VPAD;
          positionSubtree(content.nodes[childId], level + 1, +1, offsetRight);
          offsetRight += ch + SIBLING_GAP;
        });

        // Gauche
        // FR: Inverser l'ordre pour correspondre à XMind (de bas en haut dans le tableau)
        // EN: Reverse order to match XMind (bottom to top in array)
        const leftIdsReversed = [...leftIds].reverse();
        let offsetLeft =
          nodeCenterY -
          (leftIdsReversed.reduce(
            (acc, id) => acc + (subtreeHeightById[id] || LINE_HEIGHT + NODE_VPAD),
            0
          ) +
            SIBLING_GAP * Math.max(0, leftIdsReversed.length - 1)) /
            2;
        leftIdsReversed.forEach(childId => {
          const ch = subtreeHeightById[childId] || LINE_HEIGHT + NODE_VPAD;
          positionSubtree(content.nodes[childId], level + 1, -1, offsetLeft);
          offsetLeft += ch + SIBLING_GAP;
        });
      } else if (childIds.length > 1) {
        // FR: Conserver l'ordre et la direction du parent - Plusieurs enfants
        // EN: Keep parent order and direction - Multiple children
        let currentY = baseY;
        childIds.forEach((childId: string) => {
          const ch = subtreeHeightById[childId] || LINE_HEIGHT + NODE_VPAD;
          positionSubtree(content.nodes[childId], level + 1, direction, currentY);
          currentY += ch + SIBLING_GAP;
        });
      } else {
        // FR: Conserver l'ordre et la direction du parent - Alignement au centre pour enfant unique
        // EN: Keep parent order and direction - Center alignment for single child
        const onlyId = childIds[0];
        const ch = subtreeHeightById[onlyId] || LINE_HEIGHT + NODE_VPAD;
        const parentCenterY =
          nodeCenterY + (nodeOwnHeightById[node.id] || LINE_HEIGHT + NODE_VPAD) / 2;
        const start = parentCenterY - ch / 2;
        positionSubtree(content.nodes[onlyId], level + 1, direction, start);
      }
    };

    // FR: Calcul préalable des tailles de sous-arbres
    // EN: Pre-compute subtree sizes
    const totalHeight = computeSubtreeHeights(rootNode);
    const startY = -totalHeight / 2;

    // FR: Positionner depuis la racine en respectant les bandes verticales par sous-arbre
    // EN: Position from root respecting vertical bands per subtree
    positionSubtree(rootNode, 0, 0, startY);

    // FR: Corriger les parentId après positionnement
    // EN: Fix parentId after positioning
    const fixParentIds = (node: any, parentId: string | null = null): void => {
      const nodeIndex = nodes.findIndex(n => n.id === node.id);
      if (nodeIndex !== -1) {
        nodes[nodeIndex].data.parentId = parentId;
      }

      if (node.children && node.children.length > 0) {
        node.children.forEach((childId: string) => {
          const childNode = content.nodes[childId];
          if (childNode) {
            fixParentIds(childNode, node.id);
          }
        });
      }
    };

    fixParentIds(rootNode);

    return nodes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, defaultNodeWidth, defaultNodeHeight]);

  // FR: Convertir les connexions en arêtes ReactFlow
  // EN: Convert connections to ReactFlow edges
  const convertToReactFlowEdges = useCallback((): Edge[] => {
    if (!activeFile || !activeFile.content || !activeFile.content.nodes) {
      return [];
    }

    // FR: Variable locale pour éviter les erreurs TypeScript "possibly undefined"
    // EN: Local variable to avoid TypeScript "possibly undefined" errors
    const { content } = activeFile;

    const edges: Edge[] = [];

    // FR: Le parser XMind crée rootNode, pas nodes.root
    // EN: XMind parser creates rootNode, not nodes.root
    const rootNode = content.rootNode || content.nodes?.root;

    if (!rootNode) return edges;

    // FR: Fonction récursive pour créer les connexions en respectant la direction (gauche/droite)
    // EN: Recursive function to create connections respecting direction (left/right)
    const createConnections = (
      node: any,
      level: number,
      direction: number,
      branchColor?: string
    ): void => {
      if (node.collapsed || !node.children || node.children.length === 0) return;

      const childIds: string[] = node.children;

      if (level === 0) {
        // FR: Même partition qu'au layout: utiliser positions XMind ou fallback
        // EN: Same partition as layout: use XMind positions or fallback
        const rightIds: string[] = [];
        const leftIds: string[] = [];

        childIds.forEach((id, idx) => {
          const childNode = content.nodes[id];
          const xmindPos = (childNode as any)?.xmindPosition;

          // FR: Si position XMind disponible, utiliser x pour déterminer le côté
          // EN: If XMind position available, use x to determine side
          if (xmindPos && typeof xmindPos.x === 'number') {
            if (xmindPos.x >= 0) {
              rightIds.push(id);
            } else {
              leftIds.push(id);
            }
          } else if (idx < Math.ceil(childIds.length / 2)) {
            // FR: Fallback: première moitié à droite, deuxième moitié à gauche
            // EN: Fallback: first half on right, second half on left
            rightIds.push(id);
          } else {
            leftIds.push(id);
          }
        });

        rightIds.forEach(childId => {
          const childNode = content.nodes[childId];
          const childColor = childNode?.style?.backgroundColor || '#dc2626';

          edges.push({
            id: `edge-${node.id}-${childId}`,
            source: node.id,
            target: childId,
            sourceHandle: 'right',
            type: 'smoothstep',
            style: { stroke: childColor, strokeWidth: 2 },
            data: { isSelected: false, parentId: node.id, childId },
          });

          if (childNode) createConnections(childNode, level + 1, +1, childColor);
        });

        // FR: Inverser l'ordre pour correspondre à XMind (de bas en haut dans le tableau)
        // EN: Reverse order to match XMind (bottom to top in array)
        const leftIdsReversed = [...leftIds].reverse();
        leftIdsReversed.forEach(childId => {
          const childNode = content.nodes[childId];
          const childColor = childNode?.style?.backgroundColor || '#dc2626';

          edges.push({
            id: `edge-${node.id}-${childId}`,
            source: node.id,
            target: childId,
            sourceHandle: 'left',
            type: 'smoothstep',
            style: { stroke: childColor, strokeWidth: 2 },
            data: { isSelected: false, parentId: node.id, childId },
          });

          if (childNode) createConnections(childNode, level + 1, -1, childColor);
        });
      } else {
        // FR: Aux niveaux > 0, conserver la direction du parent et la couleur de branche
        // EN: At levels > 0, keep parent direction and branch color
        const handleId = direction === -1 ? 'left' : 'right';
        const edgeColor = branchColor || '#dc2626';

        childIds.forEach(childId => {
          edges.push({
            id: `edge-${node.id}-${childId}`,
            source: node.id,
            target: childId,
            sourceHandle: handleId,
            type: 'smoothstep',
            style: { stroke: edgeColor, strokeWidth: 2 },
            data: { isSelected: false, parentId: node.id, childId },
          });
          const childNode = content.nodes[childId];
          if (childNode) createConnections(childNode, level + 1, direction, branchColor);
        });
      }
    };

    // FR: Commencer par le nœud racine
    // EN: Start with root node
    createConnections(rootNode, 0, 0);

    return edges;
  }, [activeFile]);

  // FR: Appliquer les états de drag aux nœuds
  // EN: Apply drag states to nodes
  const nodesWithDragStates = useMemo(() => {
    const baseNodes = convertToReactFlowNodes();

    // FR: Ajouter les propriétés de drag et de filtrage par tags à chaque nœud
    // EN: Add drag and tag filtering properties to each node
    return baseNodes.map(node => {
      // FR: Vérifier si le nœud a au moins un tag caché
      // EN: Check if node has at least one hidden tag
      const nodeTags = getNodeTags(node.id);
      const hasHiddenTag = nodeTags ? nodeTags.some(tagId => hiddenTags.includes(tagId)) : false;

      return {
        ...node,
        data: {
          ...node.data,
          isGhost: node.id === ghostNode?.id,
          isBeingDragged: node.id === draggedNodeId,
          isDescendantOfDragged: draggedNodeId && draggedDescendants.includes(node.id),
          isDragTarget: node.id === dragTarget,
          isValidDragTarget: node.id === dragTarget && isValidTarget,
          isInvalidDragTarget: node.id === dragTarget && !isValidTarget && dragTarget !== null,
          dropPosition: node.id === dragTarget ? dropPosition : null,
          isSiblingReorder: node.id === dragTarget ? isSiblingReorder : false,
          isHiddenByTag: hasHiddenTag,
        },
      };
    });
  }, [
    convertToReactFlowNodes,
    ghostNode,
    draggedNodeId,
    draggedDescendants,
    dragTarget,
    isValidTarget,
    dropPosition,
    isSiblingReorder,
    hiddenTags,
    getNodeTags,
  ]);

  // FR: Ajouter le nœud fantôme à la liste si en cours de drag
  // EN: Add ghost node to list if dragging
  const initialNodes = useMemo(() => {
    if (!ghostNode) return nodesWithDragStates;
    return [
      ...nodesWithDragStates,
      {
        ...ghostNode,
        draggable: false,
        selectable: false,
        data: {
          ...ghostNode.data,
          isGhost: true,
        },
      },
    ];
  }, [nodesWithDragStates, ghostNode]);

  // FR: Appliquer les états de drag aux arêtes (cacher les liens du nœud draggé)
  // EN: Apply drag states to edges (hide links of dragged node)
  const edgesWithDragStates = useMemo(() => {
    const baseEdges = convertToReactFlowEdges();

    if (!draggedNodeId) return baseEdges;

    // FR: Cacher les edges connectés au nœud draggé ou ses descendants
    // EN: Hide edges connected to dragged node or its descendants
    return baseEdges.map(edge => {
      const isDraggedNodeEdge = edge.source === draggedNodeId || edge.target === draggedNodeId;
      const isDescendantEdge =
        draggedDescendants.includes(edge.source) || draggedDescendants.includes(edge.target);

      if (isDraggedNodeEdge || isDescendantEdge) {
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: 0,
          },
          animated: false,
        };
      }

      return edge;
    });
  }, [convertToReactFlowEdges, draggedNodeId, draggedDescendants]);

  const initialEdges = useMemo(() => edgesWithDragStates, [edgesWithDragStates]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // FR: Conserver une référence aux nœuds positionnés pour la navigation
  // EN: Keep a ref to positioned nodes for navigation
  const nodesRef = useRef<Node[]>(initialNodes as any);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // FR: Synchroniser les nœuds ReactFlow avec initialNodes (pour le ghost node)
  // EN: Sync ReactFlow nodes with initialNodes (for ghost node)
  React.useEffect(() => {
    setNodes(initialNodes as any);
  }, [initialNodes, setNodes]);

  // FR: Synchroniser les arêtes ReactFlow avec initialEdges
  // EN: Sync ReactFlow edges with initialEdges
  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // FR: Appliquer automatiquement les couleurs quand le thème change
  // EN: Automatically apply colors when theme changes
  useEffect(() => {
    if (activeFile) {
      const theme = getCurrentTheme();
      applyAutomaticColorsToAll(theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]); // Seulement quand le thème change

  // FR: Callback pour sauvegarder le viewport quand il change
  // EN: Callback to save viewport when it changes
  const onMoveEnd = useCallback(
    (_event: any, viewport: Viewport) => {
      if (!activeFile || !viewportRestoredRef.current) return;
      updateActiveFileViewport(viewport);
    },
    [activeFile, updateActiveFileViewport]
  );

  // FR: Restaurer le viewport et la sélection quand le fichier change
  // EN: Restore viewport and selection when file changes
  useEffect(() => {
    if (!activeFile) return;

    // FR: Si le fichier a changé, restaurer son viewport et sa sélection
    // EN: If file changed, restore its viewport and selection
    if (activeFile.id !== lastFileIdRef.current) {
      lastFileIdRef.current = activeFile.id;
      viewportRestoredRef.current = false;
      restoringRef.current = true;

      // FR: Restaurer la sélection immédiatement
      // EN: Restore selection immediately
      if (activeFile.selectedNodeId) {
        // FR: Utiliser setState directement pour éviter de déclencher la sauvegarde
        // EN: Use setState directly to avoid triggering save
        useSelection.setState({
          selectedNodeId: activeFile.selectedNodeId,
          selectedNodeIds: [activeFile.selectedNodeId],
        });
      } else {
        useSelection.setState({
          selectedNodeId: null,
          selectedNodeIds: [],
        });
      }

      // FR: Restaurer les tags cachés
      // EN: Restore hidden tags
      if (activeFile.hiddenTags && activeFile.hiddenTags.length > 0) {
        useTagStore.setState({ hiddenTags: activeFile.hiddenTags });
      } else {
        useTagStore.setState({ hiddenTags: [] });
      }

      // FR: Attendre que l'instance soit prête et que les nœuds soient rendus
      // EN: Wait for instance to be ready and nodes to be rendered
      const attemptRestore = (attempts = 0) => {
        if (attempts > 20) return;

        if (!instanceRef.current) {
          setTimeout(() => attemptRestore(attempts + 1), 100);
          return;
        }

        if (activeFile.viewport) {
          // FR: Restaurer le viewport sauvegardé
          // EN: Restore saved viewport
          instanceRef.current.setViewport(activeFile.viewport, { duration: 300 });
        } else {
          // FR: Pas de viewport sauvegardé, faire un fitView
          // EN: No saved viewport, do fitView
          instanceRef.current.fitView({ duration: 300 });
        }
        viewportRestoredRef.current = true;
        restoringRef.current = false;
      };

      // FR: Commencer les tentatives de restauration
      // EN: Start restoration attempts
      setTimeout(() => attemptRestore(), 100);
    }
  }, [activeFile]);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges]
  );

  // FR: Fonction utilitaire pour vérifier si on doit ignorer les raccourcis clavier
  // EN: Utility function to check if keyboard shortcuts should be ignored
  const shouldIgnoreKeyboardEvent = (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement;
    const activeElement = document.activeElement as HTMLElement;

    // FR: Ignorer si on est dans un champ de saisie
    // EN: Ignore if in an input field
    if (
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.contentEditable === 'true' ||
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.contentEditable === 'true'
    ) {
      return true;
    }

    // FR: Ignorer si on est dans un panneau latéral
    // EN: Ignore if in a side panel
    if (
      target?.closest?.('.tag-layers-panel') ||
      target?.closest?.('.files-column') ||
      target?.closest?.('.node-explorer-column') ||
      target?.closest?.('.dag-search-panel') ||
      target?.closest?.('.node-tag-panel')
    ) {
      return true;
    }

    return false;
  };

  // FR: Navigation clavier dans l'arborescence avec les flèches
  // EN: Keyboard navigation in the tree using arrow keys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (shouldIgnoreKeyboardEvent(e)) return;
      if (!activeFile || !activeFile.content || !activeFile.content.nodes) return;
      const { key } = e;
      // toggle follow
      if (key.toLowerCase() === (getShortcut('view.follow') || 'F').toLowerCase()) {
        e.preventDefault();
        const cur = useCanvasOptions.getState().followSelection;
        useCanvasOptions.getState().setFollowSelection(!cur);
        return;
      }
      if (key === 'Enter') {
        const currentId: string =
          selectedNodeId || activeFile.content.rootNode?.id || activeFile.content.nodes?.root?.id;
        if (!currentId) return;
        e.preventDefault();
        const newId = addSiblingToActive(currentId, 'Nouveau nœud');
        if (newId) setSelectedNodeId(newId);
        return;
      }
      if (key === ' ') {
        // Espace: toggle collapse/expand of current node descendants
        const rootIdSpace: string =
          activeFile.content.rootNode?.id || activeFile.content.nodes?.root?.id;
        const currentIdSpace: string = selectedNodeId || rootIdSpace;
        if (!currentIdSpace) return;
        e.preventDefault();
        const nodesMapAny: any = activeFile.content.nodes;
        const cur = nodesMapAny[currentIdSpace];
        const newCollapsed = !cur?.collapsed;
        updateActiveFileNode(currentIdSpace, { collapsed: newCollapsed });
        return;
      }
      if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight')
        return;
      const nodesMap: any = activeFile.content.nodes;
      // pick current or root
      const rootId: string = activeFile.content.rootNode?.id || activeFile.content.nodes?.root?.id;
      const currentId: string = selectedNodeId || rootId;
      const current = nodesMap[currentId];
      if (!current) return;
      e.preventDefault();

      const select = (id?: string) => {
        if (id && nodesMap[id]) setSelectedNodeId(id);
      };

      const positioned = nodesRef.current;
      const curNode = positioned.find(n => n.id === currentId);
      const curX = curNode?.position?.x || 0;
      const isLeftSide = currentId !== rootId && curX < 0;

      const gotoClosestChild = () => {
        const childIds: string[] = current.children || [];
        if (childIds.length === 0) return;
        if (currentId === rootId) {
          // root: choose by side using key
          const desiredRight = key === 'ArrowRight';
          let candidates = childIds.filter(cid => {
            const c = positioned.find(n => n.id === cid);
            return desiredRight ? (c?.position?.x || 0) > 0 : (c?.position?.x || 0) < 0;
          });
          if (candidates.length === 0) candidates = childIds;
          // pick nearest in Euclidean distance
          const curCenterX =
            (curNode?.position?.x || 0) + ((curNode?.data as any)?.width || 200) / 2;
          const curCenterY =
            (curNode?.position?.y || 0) + ((curNode?.data as any)?.height || 40) / 2;
          let bestId: string | undefined;
          let bestD = Number.POSITIVE_INFINITY;
          candidates.forEach(cid => {
            const c = positioned.find(n => n.id === cid);
            if (!c) return;
            const cx = (c.position?.x || 0) + ((c.data as any)?.width || 200) / 2;
            const cy = (c.position?.y || 0) + ((c.data as any)?.height || 40) / 2;
            const dx = cx - curCenterX;
            const dy = cy - curCenterY;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD) {
              bestD = d2;
              bestId = cid;
            }
          });
          select(bestId || candidates[0]);
          return;
        }
        // non-root: closest child irrespective of side
        const curCenterX = (curNode?.position?.x || 0) + ((curNode?.data as any)?.width || 200) / 2;
        const curCenterY = (curNode?.position?.y || 0) + ((curNode?.data as any)?.height || 40) / 2;
        let bestId: string | undefined;
        let bestD = Number.POSITIVE_INFINITY;
        childIds.forEach(cid => {
          const c = positioned.find(n => n.id === cid);
          if (!c) return;
          const cx = (c.position?.x || 0) + ((c.data as any)?.width || 200) / 2;
          const cy = (c.position?.y || 0) + ((c.data as any)?.height || 40) / 2;
          const dx = cx - curCenterX;
          const dy = cy - curCenterY;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD) {
            bestD = d2;
            bestId = cid;
          }
        });
        select(bestId || childIds[0]);
      };

      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        const goParent = () => select(current.parentId);
        if (currentId === rootId) {
          // Root: Left -> closest child on the left, Right -> closest child on the right
          gotoClosestChild();
          return;
        }
        if (isLeftSide) {
          // Left side: Right -> parent (to the right), Left -> child (to the left)
          if (key === 'ArrowRight') {
            goParent();
            return;
          }
          if (key === 'ArrowLeft') {
            gotoClosestChild();
            return;
          }
        } else {
          // Right side: Left -> parent, Right -> child
          if (key === 'ArrowLeft') {
            goParent();
            return;
          }
          if (key === 'ArrowRight') {
            gotoClosestChild();
            return;
          }
        }
      }

      // siblings navigation
      const { parentId } = current;
      if (!parentId) return; // root has no up/down among siblings
      const parent = nodesMap[parentId];
      const siblings: string[] = parent?.children || [];
      const idx = siblings.indexOf(currentId);
      if (idx === -1) return;
      if (key === 'ArrowUp') {
        if (idx > 0) {
          select(siblings[idx - 1]);
        } else {
          // FR: Rechercher un cousin au-dessus (chez les frères du parent précédents) le plus proche en Y
          const grandParentId = parent?.parentId;
          if (!grandParentId) return;
          const grandParent = nodesMap[grandParentId];
          const parentSiblings: string[] = grandParent?.children || [];
          const pIdx = parentSiblings.indexOf(parentId);
          if (pIdx > 0) {
            const positionedA = nodesRef.current;
            const curNodeA = positionedA.find(n => n.id === currentId);
            const curCY =
              (curNodeA?.position?.y || 0) + ((curNodeA?.data as any)?.height || 40) / 2;
            let bestId: string | undefined;
            let bestDY = Number.POSITIVE_INFINITY;
            // parcourir les parents précédents (du plus proche au plus lointain)
            for (let i = pIdx - 1; i >= 0; i -= 1) {
              const cousinParentId = parentSiblings[i];
              const cousinChildren: string[] = nodesMap[cousinParentId]?.children || [];
              for (let j = 0; j < cousinChildren.length; j += 1) {
                const cid = cousinChildren[j];
                const n = positionedA.find(nn => nn.id === cid);
                if (n) {
                  const cy = (n.position?.y || 0) + ((n.data as any)?.height || 40) / 2;
                  const dy = Math.abs(cy - curCY);
                  if (dy < bestDY) {
                    bestDY = dy;
                    bestId = cid;
                  }
                }
              }
              if (bestId) break; // on prend sur le parent le plus proche
            }
            if (bestId) select(bestId);
          }
        }
        return;
      }
      if (key === 'ArrowDown') {
        if (idx < siblings.length - 1) {
          select(siblings[idx + 1]);
        } else {
          // FR: Rechercher un cousin en dessous (chez les frères du parent suivants) le plus proche en Y
          const grandParentId = parent?.parentId;
          if (!grandParentId) return;
          const grandParent = nodesMap[grandParentId];
          const parentSiblings: string[] = grandParent?.children || [];
          const pIdx = parentSiblings.indexOf(parentId);
          if (pIdx !== -1 && pIdx < parentSiblings.length - 1) {
            const positionedB = nodesRef.current;
            const curNodeB = positionedB.find(n => n.id === currentId);
            const curCY =
              (curNodeB?.position?.y || 0) + ((curNodeB?.data as any)?.height || 40) / 2;
            let bestId: string | undefined;
            let bestDY = Number.POSITIVE_INFINITY;
            // parcourir les parents suivants (du plus proche au plus lointain)
            for (let i = pIdx + 1; i < parentSiblings.length; i += 1) {
              const cousinParentId = parentSiblings[i];
              const cousinChildren: string[] = nodesMap[cousinParentId]?.children || [];
              for (let j = 0; j < cousinChildren.length; j += 1) {
                const cid = cousinChildren[j];
                const n = positionedB.find(nn => nn.id === cid);
                if (n) {
                  const cy = (n.position?.y || 0) + ((n.data as any)?.height || 40) / 2;
                  const dy = Math.abs(cy - curCY);
                  if (dy < bestDY) {
                    bestDY = dy;
                    bestId = cid;
                  }
                }
              }
              if (bestId) break; // on prend sur le parent le plus proche
            }
            if (bestId) select(bestId);
          }
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    activeFile,
    selectedNodeId,
    setSelectedNodeId,
    getShortcut,
    addSiblingToActive,
    updateActiveFileNode,
  ]);

  // FR: Raccourci Tab pour créer un enfant du nœud sélectionné
  // EN: Tab shortcut to create child of selected node
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (shouldIgnoreKeyboardEvent(e)) return;
      if (!activeFile || !activeFile.content || !activeFile.content.nodes) return;
      const parentId: string =
        selectedNodeId || activeFile.content.rootNode?.id || activeFile.content.nodes?.root?.id;
      if (!parentId) return;
      e.preventDefault();
      const newId = addChildToActive(parentId, 'Nouveau nœud');
      if (newId) setSelectedNodeId(newId);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeFile, selectedNodeId, addChildToActive, setSelectedNodeId]);

  // FR: Backspace/Delete pour supprimer le nœud sélectionné (et sous-arbre)
  // EN: Backspace/Delete to delete selected node (and subtree)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (shouldIgnoreKeyboardEvent(e)) return;
      if (!activeFile || !activeFile.content || !activeFile.content.nodes) return;
      const currentId: string | undefined =
        selectedNodeId || activeFile.content.rootNode?.id || activeFile.content.nodes?.root?.id;
      if (!currentId) return;
      // Ne pas supprimer la racine
      const rootId: string | undefined =
        activeFile.content.rootNode?.id || activeFile.content.nodes?.root?.id;
      if (currentId === rootId) return;
      e.preventDefault();
      const parentId = removeNodeFromActive(currentId);
      if (parentId) setSelectedNodeId(parentId);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeFile, selectedNodeId, removeNodeFromActive, setSelectedNodeId]);

  // Follow: center on selected node
  useEffect(() => {
    if (!followSelection) return;
    if (!selectedNodeId) return;
    const n = nodesRef.current.find(nn => nn.id === selectedNodeId);
    const inst = instanceRef.current;
    if (!n || !inst) return;
    const width = (n.data as any)?.width || 200;
    const height = (n.data as any)?.height || 40;
    const x = (n.position?.x || 0) + width / 2;
    const y = (n.position?.y || 0) + height / 2;
    try {
      if (typeof inst.setCenter === 'function') {
        inst.setCenter(x, y, { zoom: inst.getZoom?.() || 1, duration: 300 });
      }
    } catch (e) {
      // Ignore errors
    }
  }, [selectedNodeId, followSelection]);

  // FR: Synchroniser le zoom avec l'instance ReactFlow (toujours appelé, indépendamment du fichier actif)
  // EN: Sync zoom with ReactFlow instance (always called, regardless of active file)
  // FR: Désactiver la synchronisation directe du zoom pour éviter l'erreur setZoom inexistante
  // EN: Disable direct zoom sync to avoid setZoom undefined error

  if (!activeFile) {
    return (
      <div className="mindmap-canvas" style={{ width: '100%', height: '100%', minHeight: '400px' }}>
        <div className="no-file-message">
          <h3>Aucun fichier ouvert</h3>
          <p>Ouvrez un fichier .mm ou .xmind pour voir la carte mentale</p>
          <p>Utilisez le menu Fichier → Ouvrir...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mindmap-canvas"
      ref={reactFlowWrapper}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        backgroundColor: canvasBackgroundColor,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodesDraggable={nodesDraggable}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={onMoveEnd}
        attributionPosition="bottom-left"
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        onInit={inst => {
          instanceRef.current = inst;
          setFlowInstance(inst);
        }}
        panOnScroll
        zoomOnScroll={false}
        zoomActivationKeyCode="Meta"
        minZoom={0.05}
        maxZoom={2}
      >
        <Background />
        {/* Controls retirés: le zoom est géré dans la StatusBar */}
        {showMinimap && <MiniMap position="top-right" />}

        {/* FR: Contrôles du mode de drag */}
        {/* EN: Drag mode controls */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            gap: '8px',
            padding: '8px',
            backgroundColor: 'white',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 100,
          }}
        >
          <button
            type="button"
            onClick={() => setDragMode('free')}
            style={{
              padding: '6px 12px',
              border: dragMode === 'free' ? '2px solid #3b82f6' : '1px solid #ccc',
              borderRadius: '3px',
              background: dragMode === 'free' ? '#eff6ff' : '#f9fafb',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: dragMode === 'free' ? '600' : 'normal',
              color: dragMode === 'free' ? '#1e40af' : '#666',
            }}
          >
            📦 Libre
          </button>
          <button
            type="button"
            onClick={() => setDragMode('reparent')}
            style={{
              padding: '6px 12px',
              border: dragMode === 'reparent' ? '2px solid #3b82f6' : '1px solid #ccc',
              borderRadius: '3px',
              background: dragMode === 'reparent' ? '#eff6ff' : '#f9fafb',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: dragMode === 'reparent' ? '600' : 'normal',
              color: dragMode === 'reparent' ? '#1e40af' : '#666',
            }}
          >
            🔗 Rattach
          </button>
        </div>
      </ReactFlow>
    </div>
  );
}

export default MindMapCanvas;
