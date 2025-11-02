/**
 * FR: Modèles de données pour BigMind - Nœuds, cartes mentales, styles
 * EN: Data models for BigMind - Nodes, mind maps, styles
 */

import { nanoid } from 'nanoid';

// FR: Identifiant unique pour un nœud
// EN: Unique identifier for a node
export type NodeID = string;

// FR: Style d'un nœud (couleurs, police, etc.)
// EN: Node style (colors, font, etc.)
export interface NodeStyle {
  // FR: Couleur de fond du nœud
  // EN: Node background color
  backgroundColor?: string;
  // FR: Couleur du texte
  // EN: Text color
  textColor?: string;
  // FR: Couleur de la bordure
  // EN: Border color
  borderColor?: string;
  // FR: Taille de la police
  // EN: Font size
  fontSize?: number;
  // FR: Poids de la police
  // EN: Font weight
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  // FR: Style de la bordure
  // EN: Border style
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  // FR: Rayon de bordure
  // EN: Border radius
  borderRadius?: number;
}

// FR: Nœud d'une carte mentale
// EN: Mind map node
export interface MindNode {
  // FR: Identifiant unique
  // EN: Unique identifier
  id: NodeID;
  // FR: Identifiant du nœud parent (null pour la racine)
  // EN: Parent node identifier (null for root)
  parentId: NodeID | null;
  // FR: Titre du nœud
  // EN: Node title
  title: string;
  // FR: Notes additionnelles
  // EN: Additional notes
  notes?: string;
  // FR: Nœud plié/déplié
  // EN: Node collapsed/expanded
  collapsed?: boolean;
  // FR: Style du nœud
  // EN: Node style
  style?: NodeStyle;
  // FR: Identifiants des nœuds enfants (dans l'ordre)
  // EN: Child node identifiers (in order)
  children: NodeID[];
  // FR: Position X sur le canvas
  // EN: X position on canvas
  x?: number;
  // FR: Position Y sur le canvas
  // EN: Y position on canvas
  y?: number;
  // FR: Largeur du nœud
  // EN: Node width
  width?: number;
  // FR: Hauteur du nœud
  // EN: Node height
  height?: number;
}

// FR: Métadonnées d'une carte mentale
// EN: Mind map metadata
export interface MindMapMeta {
  // FR: Nom de la carte
  // EN: Map name
  name: string;
  // FR: Date de création
  // EN: Creation date
  createdAt: string;
  // FR: Date de dernière modification
  // EN: Last modification date
  updatedAt: string;
  // FR: Locale (FR/EN)
  // EN: Locale (FR/EN)
  locale: string;
  // FR: Version du format
  // EN: Format version
  version: string;
  // FR: Auteur
  // EN: Author
  author?: string;
  // FR: Description
  // EN: Description
  description?: string;
}

// FR: Carte mentale complète
// EN: Complete mind map
export interface MindMap {
  // FR: Identifiant unique de la carte
  // EN: Unique map identifier
  id: string;
  // FR: Identifiant du nœud racine
  // EN: Root node identifier
  rootId: NodeID;
  // FR: Dictionnaire des nœuds (id -> nœud)
  // EN: Nodes dictionary (id -> node)
  nodes: Record<NodeID, MindNode>;
  // FR: Métadonnées
  // EN: Metadata
  meta: MindMapMeta;
}

// FR: État de sélection
// EN: Selection state
export interface SelectionState {
  // FR: Nœuds sélectionnés
  // EN: Selected nodes
  selectedNodes: NodeID[];
  // FR: Nœud principal (pour les opérations)
  // EN: Primary node (for operations)
  primaryNode: NodeID | null;
  // FR: Mode de sélection (simple, multiple)
  // EN: Selection mode (simple, multiple)
  mode: 'single' | 'multiple';
}

// FR: État de l'historique (undo/redo)
// EN: History state (undo/redo)
export interface HistoryState {
  // FR: Historique des commandes
  // EN: Command history
  commands: Command[];
  // FR: Index de la commande actuelle
  // EN: Current command index
  currentIndex: number;
  // FR: Limite du nombre de commandes
  // EN: Command limit
  limit: number;
}

// FR: Commande pour le pattern Command
// EN: Command for Command pattern
export interface Command {
  // FR: Exécuter la commande
  // EN: Execute the command
  execute(state: MindMap): MindMap;
  // FR: Annuler la commande
  // EN: Undo the command
  undo(state: MindMap): MindMap;
  // FR: Description de la commande
  // EN: Command description
  description: string;
  // FR: Timestamp de création
  // EN: Creation timestamp
  timestamp: number;
}

// FR: Factory pour créer des nœuds
// EN: Factory to create nodes
export class NodeFactory {
  /**
   * FR: Créer un nouveau nœud
   * EN: Create a new node
   */
  static createNode(title: string, parentId: NodeID | null = null, style?: NodeStyle): MindNode {
    return {
      id: nanoid(),
      parentId,
      title,
      children: [],
      style,
      collapsed: false,
      x: 0,
      y: 0,
      width: 200,
      height: 40,
    };
  }

  /**
   * FR: Créer une carte mentale vide
   * EN: Create an empty mind map
   */
  static createEmptyMindMap(name: string = 'Nouvelle carte'): MindMap {
    const rootNode = NodeFactory.createNode('Racine');

    return {
      id: nanoid(),
      rootId: rootNode.id,
      nodes: {
        [rootNode.id]: rootNode,
      },
      meta: {
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        locale: 'fr',
        version: '1.0.0',
      },
    };
  }
}

// FR: Utilitaires pour manipuler les nœuds
// EN: Utilities to manipulate nodes
export class NodeUtils {
  /**
   * FR: Obtenir tous les nœuds enfants d'un nœud
   * EN: Get all child nodes of a node
   */
  static getChildren(map: MindMap, nodeId: NodeID): MindNode[] {
    const node = map.nodes[nodeId];
    if (!node) return [];

    return node.children
      .map(childId => map.nodes[childId])
      .filter((child): child is MindNode => child !== undefined);
  }

  /**
   * FR: Obtenir tous les descendants d'un nœud (récursif)
   * EN: Get all descendants of a node (recursive)
   */
  static getDescendants(map: MindMap, nodeId: NodeID): MindNode[] {
    const children = NodeUtils.getChildren(map, nodeId);
    const descendants = [...children];

    children.forEach(child => {
      descendants.push(...NodeUtils.getDescendants(map, child.id));
    });

    return descendants;
  }

  /**
   * FR: Obtenir le chemin vers la racine
   * EN: Get path to root
   */
  static getPathToRoot(map: MindMap, nodeId: NodeID): MindNode[] {
    const path: MindNode[] = [];
    let currentNode: MindNode | null = map.nodes[nodeId] || null;

    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.parentId ? map.nodes[currentNode.parentId] || null : null;
    }

    return path;
  }

  /**
   * FR: Vérifier si un nœud est un descendant d'un autre
   * EN: Check if a node is a descendant of another
   */
  static isDescendant(map: MindMap, ancestorId: NodeID, descendantId: NodeID): boolean {
    const descendants = NodeUtils.getDescendants(map, ancestorId);
    return descendants.some(node => node.id === descendantId);
  }
}
