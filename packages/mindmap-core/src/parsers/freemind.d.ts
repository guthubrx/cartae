/**
 * FR: Parser pour les fichiers FreeMind .mm
 * EN: Parser for FreeMind .mm files
 */
import { MindMap } from '../model';
export declare class FreeMindParser {
  /**
   * FR: Parser un fichier .mm depuis une chaîne XML
   * EN: Parse a .mm file from XML string
   */
  static parse(xmlContent: string): MindMap;
  /**
   * FR: Parser récursif des nœuds
   * EN: Recursive node parser
   */
  private static parseNodeRecursive;
  /**
   * FR: Sérialiser une MindMap vers XML FreeMind
   * EN: Serialize MindMap to FreeMind XML
   */
  static serialize(mindMap: MindMap): string;
  /**
   * FR: Sérialiser un nœud récursivement
   * EN: Serialize a node recursively
   */
  private static serializeNode;
  /**
   * FR: Échapper les caractères XML
   * EN: Escape XML characters
   */
  private static escapeXml;
}
//# sourceMappingURL=freemind.d.ts.map
