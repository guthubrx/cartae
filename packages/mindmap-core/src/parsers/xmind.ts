/**
 * FR: Parser pour les fichiers XMind .xmind
 * EN: Parser for XMind .xmind files
 *
 * Note: XMind utilise un format ZIP avec plusieurs fichiers XML
 * Pour le MVP, on implémente un parser basique
 */

import { MindMap, MindNode, NodeID, NodeFactory } from '../model';

// FR: Interface pour les nœuds XMind
// EN: Interface for XMind nodes
interface XMindNode {
  id: string;
  title: string;
  parentId?: string;
  children?: XMindNode[];
  position?: { x: number; y: number };
  collapsed?: boolean;
  tags?: string[];
  assets?: {
    images?: string[];
    attachments?: string[];
  };
  style?: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
  };
}

// FR: Parser XMind .xmind vers MindMap
// EN: XMind .xmind parser to MindMap
export class XMindParser {
  // FR: Limites de sécurité pour éviter les zip bombs et attaques DoS
  // EN: Security limits to prevent zip bombs and DoS attacks
  private static readonly MAX_NODES = 10000;

  private static readonly MAX_DEPTH = 100;

  private static readonly MAX_JSON_SIZE = 50 * 1024 * 1024; // 50 MB

  private static nodeCount = 0;

  /**
   * FR: Parser un fichier .xmind depuis une chaîne JSON
   * EN: Parse a .xmind file from JSON string
   *
   * Note: Pour le MVP, on suppose que le fichier a été extrait et converti en JSON
   * Dans une version complète, il faudrait parser le ZIP et les XML internes
   */
  static parse(jsonContent: string): MindMap {
    try {
      // FR: Vérifier la taille du JSON
      // EN: Check JSON size
      if (jsonContent.length > this.MAX_JSON_SIZE) {
        const sizeMB = Math.round(jsonContent.length / 1024 / 1024);
        const maxMB = this.MAX_JSON_SIZE / 1024 / 1024;
        throw new Error(`Fichier trop volumineux (${sizeMB}MB). Maximum autorisé: ${maxMB}MB`);
      }

      const xmindData = JSON.parse(jsonContent);

      // FR: Réinitialiser le compteur de nœuds
      // EN: Reset node counter
      this.nodeCount = 0;

      // FR: Créer la carte mentale
      // EN: Create mind map
      const mindMap = NodeFactory.createEmptyMindMap(xmindData.title || 'Carte XMind importée');

      // FR: Parser le nœud racine avec vérification de profondeur
      // EN: Parse root node with depth verification
      if (xmindData.root) {
        this.parseNodeRecursive(xmindData.root, mindMap, mindMap.rootId, 0, 0, 0);
      }

      return mindMap;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      throw new Error(`Erreur lors du parsing XMind: ${message}`);
    }
  }

  /**
   * FR: Parser récursif des nœuds XMind
   * EN: Recursive XMind node parser
   */
  private static parseNodeRecursive(
    xmindNode: XMindNode,
    mindMap: MindMap,
    parentId: NodeID,
    x: number,
    y: number,
    depth: number
  ): void {
    // FR: Vérifier la profondeur maximale
    // EN: Check maximum depth
    if (depth > this.MAX_DEPTH) {
      throw new Error(
        `Profondeur maximale dépassée (${this.MAX_DEPTH}). Fichier potentiellement malveillant.`
      );
    }

    // FR: Vérifier le nombre maximal de nœuds
    // EN: Check maximum node count
    this.nodeCount += 1;
    if (this.nodeCount > this.MAX_NODES) {
      throw new Error(
        `Nombre maximal de nœuds dépassé (${this.MAX_NODES}). Fichier potentiellement malveillant.`
      );
    }

    // FR: Créer le nœud
    // EN: Create the node
    const node = NodeFactory.createNode(xmindNode.title, parentId);
    node.x = xmindNode.position?.x || x;
    node.y = xmindNode.position?.y || y;

    // FR: Appliquer les styles si disponibles
    // EN: Apply styles if available
    if (xmindNode.style) {
      node.style = {
        backgroundColor: xmindNode.style.backgroundColor,
        textColor: xmindNode.style.textColor,
        fontSize: xmindNode.style.fontSize,
      };
    }

    // FR: Appliquer l'état collapsed si spécifié
    // EN: Apply collapsed state if specified
    if (xmindNode.collapsed !== undefined) {
      node.collapsed = xmindNode.collapsed;
    }

    // FR: Ajouter les tags si disponibles (stockés dans les notes pour le MVP)
    // EN: Add tags if available (stored in notes for MVP)
    if (xmindNode.tags && xmindNode.tags.length > 0) {
      const tagsText = `Tags: ${xmindNode.tags.join(', ')}`;
      node.notes = node.notes ? `${node.notes}\n\n${tagsText}` : tagsText;
    }

    // FR: Ajouter les assets si disponibles (stockés dans les notes pour le MVP)
    // EN: Add assets if available (stored in notes for MVP)
    if (xmindNode.assets) {
      const assetLines: string[] = [];
      if (xmindNode.assets.images && xmindNode.assets.images.length > 0) {
        assetLines.push(`Images: ${xmindNode.assets.images.join(', ')}`);
      }
      if (xmindNode.assets.attachments && xmindNode.assets.attachments.length > 0) {
        assetLines.push(`Attachments: ${xmindNode.assets.attachments.join(', ')}`);
      }
      if (assetLines.length > 0) {
        const assetsText = assetLines.join('\n');
        node.notes = node.notes ? `${node.notes}\n\n${assetsText}` : assetsText;
      }
    }

    // FR: Ajouter le nœud à la carte
    // EN: Add node to map
    mindMap.nodes[node.id] = node;

    // FR: Ajouter l'enfant au parent
    // EN: Add child to parent
    if (parentId !== mindMap.rootId) {
      const parent = mindMap.nodes[parentId];
      if (parent) {
        parent.children.push(node.id);
      }
    }

    // FR: Parser les enfants avec incrément de profondeur
    // EN: Parse children with depth increment
    if (xmindNode.children) {
      xmindNode.children.forEach((child, index) => {
        const childX = x + (index - xmindNode.children!.length / 2) * 200;
        const childY = y + 150;

        this.parseNodeRecursive(child, mindMap, node.id, childX, childY, depth + 1);
      });
    }
  }

  /**
   * FR: Sérialiser une MindMap vers JSON XMind
   * EN: Serialize MindMap to XMind JSON
   */
  static serialize(mindMap: MindMap): string {
    const rootNode = mindMap.nodes[mindMap.rootId];
    if (!rootNode) {
      throw new Error('Nœud racine non trouvé');
    }

    // FR: Construire l'objet XMind
    // EN: Build XMind object
    const xmindData = {
      title: mindMap.meta.name,
      version: '1.0.0',
      root: this.serializeNode(rootNode, mindMap),
    };

    return JSON.stringify(xmindData, null, 2);
  }

  /**
   * FR: Sérialiser un nœud récursivement
   * EN: Serialize a node recursively
   */
  private static serializeNode(node: MindNode, mindMap: MindMap): XMindNode {
    const xmindNode: XMindNode = {
      id: node.id,
      title: node.title,
      position: { x: node.x || 0, y: node.y || 0 },
    };

    // FR: Ajouter les styles
    // EN: Add styles
    if (node.style) {
      xmindNode.style = {
        backgroundColor: node.style.backgroundColor,
        textColor: node.style.textColor,
        fontSize: node.style.fontSize,
      };
    }

    // FR: Sérialiser les enfants
    // EN: Serialize children
    if (node.children.length > 0) {
      xmindNode.children = node.children
        .map(childId => mindMap.nodes[childId])
        .filter(Boolean)
        .map(child => this.serializeNode(child!, mindMap));
    }

    return xmindNode;
  }
}
