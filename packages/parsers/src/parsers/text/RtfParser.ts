/**
 * Parser pour fichiers Rich Text Format (.rtf)
 *
 * Extrait:
 * - Texte brut (formatage ignoré)
 * - Métadonnées basiques
 */

import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class RtfParser extends BaseAttachmentParser {
  readonly name = 'RtfParser';

  readonly supportedMimeTypes = ['application/rtf', 'text/rtf', 'text/richtext'];

  readonly supportedExtensions = ['.rtf'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);
      const rtfText = new TextDecoder('utf-8').decode(buffer);

      // Extraction texte simple (regex basique)
      // Supprimer commandes RTF: {\rtf1...} et \command
      let plainText = rtfText
        .replace(/\\[a-z]+-?\d*\s?/g, '') // Commandes RTF
        .replace(/[{}]/g, '') // Accolades
        .replace(/\\/g, '') // Backslashes restants
        .trim();

      // Nettoyage supplémentaire
      plainText = plainText
        .replace(/\n{3,}/g, '\n\n') // Multi-lignes
        .trim();

      return {
        type: 'rtf',
        text: this.limitText(plainText, options.textLimit),
        metadata: {
          size: buffer.byteLength,
          format: 'Rich Text Format (RTF)',
        },
      };
    } catch (error) {
      return {
        type: 'rtf',
        metadata: { size: 0 },
        error: `Erreur parsing RTF: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
