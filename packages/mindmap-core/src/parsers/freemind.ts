/**
 * FR: Parser pour les fichiers FreeMind .mm
 * EN: Parser for FreeMind .mm files
 */

import { MindMap, MindNode, NodeID, NodeFactory } from '../model';

// FR: Obtenir le parser XML selon l'environnement (Node ou Browser)
// EN: Get XML parser based on environment (Node or Browser)
function getXMLParser(): {
  parseFromString: (xmlString: string, mimeType: string) => Document;
} {
  // FR: Environnement navigateur
  // EN: Browser environment
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser() as any;
  }

  // FR: Environnement Node.js - utiliser xmldom si disponible
  // EN: Node.js environment - use xmldom if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { DOMParser: NodeDOMParser } = require('@xmldom/xmldom');
    return new NodeDOMParser();
  } catch (error) {
    throw new Error(
      'Parser XML non disponible. En Node.js, installez @xmldom/xmldom: npm install @xmldom/xmldom'
    );
  }
}

// FR: Interface pour les nœuds XML FreeMind (utilisée pour documentation)
// EN: Interface for FreeMind XML nodes (used for documentation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface FreeMindNode {
  TEXT: string;
  POSITION?: 'left' | 'right';
  FOLDED?: 'true' | 'false';
  COLOR?: string;
  BACKGROUND_COLOR?: string;
  STYLE?: string;
  node?: FreeMindNode[];
}

// FR: Parser FreeMind .mm vers MindMap
// EN: FreeMind .mm parser to MindMap
export class FreeMindParser {
  /**
   * FR: Parser un fichier .mm depuis une chaîne XML
   * EN: Parse a .mm file from XML string
   */
  static parse(xmlContent: string): MindMap {
    try {
      // FR: Parser XML portable (navigateur ou Node.js)
      // EN: Portable XML parser (browser or Node.js)
      const parser = getXMLParser();
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
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      throw new Error(`Erreur lors du parsing FreeMind: ${message}`);
    }
  }

  /**
   * FR: Parser récursif des nœuds
   * EN: Recursive node parser
   */
  private static parseNodeRecursive(
    nodeElement: Element,
    mindMap: MindMap,
    parentId: NodeID,
    x: number,
    y: number
  ): void {
    // FR: Extraire les attributs du nœud
    // EN: Extract node attributes
    const text = nodeElement.getAttribute('TEXT') || 'Nœud sans titre';
    const position = nodeElement.getAttribute('POSITION') as 'left' | 'right' | undefined;
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
  static serialize(mindMap: MindMap): string {
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
  private static serializeNode(node: MindNode, mindMap: MindMap, indent: number): string {
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
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
