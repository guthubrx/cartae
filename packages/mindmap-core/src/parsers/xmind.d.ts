/**
 * FR: Parser pour les fichiers XMind .xmind
 * EN: Parser for XMind .xmind files
 *
 * Note: XMind utilise un format ZIP avec plusieurs fichiers XML
 * Pour le MVP, on implémente un parser basique
 */
import { MindMap } from '../model';
export declare class XMindParser {
  /**
   * FR: Parser un fichier .xmind depuis une chaîne JSON
   * EN: Parse a .xmind file from JSON string
   *
   * Note: Pour le MVP, on suppose que le fichier a été extrait et converti en JSON
   * Dans une version complète, il faudrait parser le ZIP et les XML internes
   */
  static parse(jsonContent: string): MindMap;
  /**
   * FR: Parser récursif des nœuds XMind
   * EN: Recursive XMind node parser
   */
  private static parseNodeRecursive;
  /**
   * FR: Sérialiser une MindMap vers JSON XMind
   * EN: Serialize MindMap to XMind JSON
   */
  static serialize(mindMap: MindMap): string;
  /**
   * FR: Sérialiser un nœud récursivement
   * EN: Serialize a node recursively
   */
  private static serializeNode;
}
//# sourceMappingURL=xmind.d.ts.map
