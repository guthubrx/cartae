/**
 * Parser pour fichiers JSON
 * Parse et formatte données structurées
 */

import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class JsonParser extends BaseAttachmentParser {
  readonly name = 'JsonParser';

  readonly supportedMimeTypes = ['application/json', 'text/json'];

  readonly supportedExtensions = ['.json'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);
      const jsonText = new TextDecoder('utf-8').decode(buffer);

      // Parser JSON
      const data = JSON.parse(jsonText);

      // Texte formaté
      const text = JSON.stringify(data, null, 2);

      return {
        type: 'json',
        text: this.limitText(text, options.textLimit),
        data,
        metadata: {
          size: buffer.byteLength,
          format: 'JSON Data',
        },
      };
    } catch (error) {
      return {
        type: 'json',
        metadata: { size: 0 },
        error: `Erreur parsing JSON: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
