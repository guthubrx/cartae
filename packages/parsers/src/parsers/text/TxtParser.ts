/**
 * Parser pour fichiers texte brut (.txt)
 *
 * Extrait:
 * - Texte complet (UTF-8)
 * - Statistiques (longueur, lignes)
 */

import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class TxtParser extends BaseAttachmentParser {
  readonly name = 'TxtParser';

  readonly supportedMimeTypes = ['text/plain', 'text/x-log', 'application/x-log'];

  readonly supportedExtensions = ['.txt', '.log', '.md', '.text'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);

      // Décoder UTF-8
      const text = new TextDecoder('utf-8').decode(buffer);

      // Statistiques
      const lines = text.split('\n');
      const lineCount = lines.length;

      return {
        type: 'txt',
        text: this.limitText(text, options.textLimit),
        metadata: {
          size: buffer.byteLength,
          rowCount: lineCount,
          format: 'Plain Text',
        },
      };
    } catch (error) {
      return {
        type: 'txt',
        metadata: { size: 0 },
        error: `Erreur parsing TXT: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
