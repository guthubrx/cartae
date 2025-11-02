/**
 * Parser pour documents Microsoft Word (.docx)
 *
 * Extrait:
 * - Texte brut
 * - HTML formaté
 * - Métadonnées
 */

import mammoth from 'mammoth';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class DocxParser extends BaseAttachmentParser {
  readonly name = 'DocxParser';

  readonly supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  readonly supportedExtensions = ['.docx'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);

      // Extraction texte brut
      let text: string | undefined;
      if (options.extractText !== false) {
        const textResult = await mammoth.extractRawText({ arrayBuffer: buffer });
        text = this.limitText(textResult.value, options.textLimit);
      }

      // Extraction HTML formaté
      let html: string | undefined;
      if (options.extractHtml !== false) {
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
        html = htmlResult.value;
      }

      return {
        type: 'docx',
        text,
        html,
        metadata: {
          size: buffer.byteLength,
          format: 'Microsoft Word Document (DOCX)',
        },
      };
    } catch (error) {
      return {
        type: 'docx',
        metadata: { size: 0 },
        error: `Erreur parsing DOCX: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
