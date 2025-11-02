/**
 * FR: Parser pour les fichiers XMind .xmind
 * EN: Parser for XMind .xmind files
 *
 * Note: XMind utilise un format ZIP avec plusieurs fichiers XML
 * Pour le MVP, on implémente un parser basique
 */
import { NodeFactory } from '../model';
// FR: Parser XMind .xmind vers MindMap
// EN: XMind .xmind parser to MindMap
export class XMindParser {
  /**
   * FR: Parser un fichier .xmind depuis une chaîne JSON
   * EN: Parse a .xmind file from JSON string
   *
   * Note: Pour le MVP, on suppose que le fichier a été extrait et converti en JSON
   * Dans une version complète, il faudrait parser le ZIP et les XML internes
   */
  static parse(jsonContent) {
    try {
      const xmindData = JSON.parse(jsonContent);
      // FR: Créer la carte mentale
      // EN: Create mind map
      const mindMap = NodeFactory.createEmptyMindMap(xmindData.title || 'Carte XMind importée');
      // FR: Parser le nœud racine
      // EN: Parse root node
      if (xmindData.root) {
        this.parseNodeRecursive(xmindData.root, mindMap, mindMap.rootId, 0, 0);
      }
      return mindMap;
    } catch (error) {
      throw new Error(
        `Erreur lors du parsing XMind: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }
  /**
   * FR: Parser récursif des nœuds XMind
   * EN: Recursive XMind node parser
   */
  static parseNodeRecursive(xmindNode, mindMap, parentId, x, y) {
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
    // FR: Parser les enfants
    // EN: Parse children
    if (xmindNode.children) {
      xmindNode.children.forEach((child, index) => {
        const childX = x + (index - xmindNode.children.length / 2) * 200;
        const childY = y + 150;
        this.parseNodeRecursive(child, mindMap, node.id, childX, childY);
      });
    }
  }
  /**
   * FR: Sérialiser une MindMap vers JSON XMind
   * EN: Serialize MindMap to XMind JSON
   */
  static serialize(mindMap) {
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
  static serializeNode(node, mindMap) {
    const xmindNode = {
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
        .map(child => this.serializeNode(child, mindMap));
    }
    return xmindNode;
  }
}
//# sourceMappingURL=xmind.js.map
