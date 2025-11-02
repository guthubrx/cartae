/**
 * FR: Parser pour les fichiers FreeMind .mm
 * EN: Parser for FreeMind .mm files
 */
import { NodeFactory } from '../model';
// FR: Parser FreeMind .mm vers MindMap
// EN: FreeMind .mm parser to MindMap
export class FreeMindParser {
  /**
   * FR: Parser un fichier .mm depuis une chaîne XML
   * EN: Parse a .mm file from XML string
   */
  static parse(xmlContent) {
    try {
      // FR: Parser XML simple (pour MVP, on utilise DOMParser du navigateur)
      // EN: Simple XML parser (for MVP, using browser DOMParser)
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      // FR: Vérifier les erreurs de parsing
      // EN: Check parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`Erreur de parsing XML: ${parseError.textContent}`);
      }
      // FR: Extraire le nœud racine
      // EN: Extract root node
      const mapElement = doc.querySelector('map');
      if (!mapElement) {
        throw new Error('Élément map non trouvé dans le fichier .mm');
      }
      const rootNodeElement = mapElement.querySelector('node');
      if (!rootNodeElement) {
        throw new Error('Nœud racine non trouvé dans le fichier .mm');
      }
      // FR: Créer la carte mentale
      // EN: Create mind map
      const mindMap = NodeFactory.createEmptyMindMap('Carte importée');
      // FR: Parser récursivement les nœuds
      // EN: Recursively parse nodes
      this.parseNodeRecursive(rootNodeElement, mindMap, mindMap.rootId, 0, 0);
      return mindMap;
    } catch (error) {
      throw new Error(
        `Erreur lors du parsing FreeMind: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }
  /**
   * FR: Parser récursif des nœuds
   * EN: Recursive node parser
   */
  static parseNodeRecursive(nodeElement, mindMap, parentId, x, y) {
    // FR: Extraire les attributs du nœud
    // EN: Extract node attributes
    const text = nodeElement.getAttribute('TEXT') || 'Nœud sans titre';
    const position = nodeElement.getAttribute('POSITION');
    const folded = nodeElement.getAttribute('FOLDED') === 'true';
    const color = nodeElement.getAttribute('COLOR');
    const backgroundColor = nodeElement.getAttribute('BACKGROUND_COLOR');
    const style = nodeElement.getAttribute('STYLE');
    // FR: Créer le nœud
    // EN: Create the node
    const node = NodeFactory.createNode(text, parentId);
    node.x = x;
    node.y = y;
    node.collapsed = folded;
    // FR: Appliquer les styles si disponibles
    // EN: Apply styles if available
    if (color || backgroundColor || style) {
      node.style = {
        textColor: color || undefined,
        backgroundColor: backgroundColor || undefined,
        borderStyle: style === 'bubble' ? 'solid' : 'solid',
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
    const childNodes = nodeElement.querySelectorAll(':scope > node');
    childNodes.forEach((childElement, index) => {
      const childX = position === 'left' ? x - 300 : x + 300;
      const childY = y + (index - childNodes.length / 2) * 100;
      this.parseNodeRecursive(childElement, mindMap, node.id, childX, childY);
    });
  }
  /**
   * FR: Sérialiser une MindMap vers XML FreeMind
   * EN: Serialize MindMap to FreeMind XML
   */
  static serialize(mindMap) {
    const rootNode = mindMap.nodes[mindMap.rootId];
    if (!rootNode) {
      throw new Error('Nœud racine non trouvé');
    }
    // FR: Construire le XML
    // EN: Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<map version="1.0.1">\n';
    xml += this.serializeNode(rootNode, mindMap, 1);
    xml += '</map>';
    return xml;
  }
  /**
   * FR: Sérialiser un nœud récursivement
   * EN: Serialize a node recursively
   */
  static serializeNode(node, mindMap, indent) {
    const spaces = '  '.repeat(indent);
    let xml = `${spaces}<node TEXT="${this.escapeXml(node.title)}"`;
    // FR: Ajouter les attributs de style
    // EN: Add style attributes
    if (node.style?.textColor) {
      xml += ` COLOR="${node.style.textColor}"`;
    }
    if (node.style?.backgroundColor) {
      xml += ` BACKGROUND_COLOR="${node.style.backgroundColor}"`;
    }
    if (node.collapsed) {
      xml += ' FOLDED="true"';
    }
    xml += '>\n';
    // FR: Sérialiser les enfants
    // EN: Serialize children
    node.children.forEach(childId => {
      const child = mindMap.nodes[childId];
      if (child) {
        xml += this.serializeNode(child, mindMap, indent + 1);
      }
    });
    xml += `${spaces}</node>\n`;
    return xml;
  }
  /**
   * FR: Échapper les caractères XML
   * EN: Escape XML characters
   */
  static escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
//# sourceMappingURL=freemind.js.map
