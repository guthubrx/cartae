/**
 * Parser pour documents OpenDocument Text (.odt)
 * Similaire à DOCX mais format OpenOffice/LibreOffice
 */

import JSZip from 'jszip';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class OdtParser extends BaseAttachmentParser {
  readonly name = 'OdtParser';

  readonly supportedMimeTypes = ['application/vnd.oasis.opendocument.text'];

  readonly supportedExtensions = ['.odt'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);
      const zip = await JSZip.loadAsync(buffer);

      // Fichier content.xml contient le texte
      const contentFile = zip.files['content.xml'];
      if (!contentFile) {
        throw new Error('content.xml not found in ODT');
      }

      const xml = await contentFile.async('text');

      // Extraire texte (regex simple pour balises text:p)
      const textMatches = xml.match(/<text:p[^>]*>([^<]+)<\/text:p>/g) || [];
      const text = textMatches
        .map(match => match.replace(/<[^>]+>/g, ''))
        .join('\n')
        .trim();

      return {
        type: 'odt',
        text: this.limitText(text, options.textLimit),
        metadata: {
          size: buffer.byteLength,
          format: 'OpenDocument Text (ODT)',
        },
      };
    } catch (error) {
      return {
        type: 'odt',
        metadata: { size: 0 },
        error: `Erreur parsing ODT: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
