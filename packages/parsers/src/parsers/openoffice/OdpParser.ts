/**
 * Parser pour présentations OpenDocument Presentation (.odp)
 * Similaire à PPTX mais format OpenOffice/LibreOffice
 */

import JSZip from 'jszip';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class OdpParser extends BaseAttachmentParser {
  readonly name = 'OdpParser';

  readonly supportedMimeTypes = ['application/vnd.oasis.opendocument.presentation'];

  readonly supportedExtensions = ['.odp'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);
      const zip = await JSZip.loadAsync(buffer);

      // content.xml contient les slides
      const contentFile = zip.files['content.xml'];
      if (!contentFile) {
        throw new Error('content.xml not found in ODP');
      }

      const xml = await contentFile.async('text');

      // Extraire slides (balises draw:page)
      const slideMatches = xml.match(/<draw:page[^>]*>.*?<\/draw:page>/gs) || [];
      const slides = slideMatches.map(slideXml => {
        const textMatches = slideXml.match(/<text:p[^>]*>([^<]+)<\/text:p>/g) || [];
        return textMatches
          .map(match => match.replace(/<[^>]+>/g, ''))
          .join(' ')
          .trim();
      });

      const text = this.limitText(slides.join('\n\n'), options.textLimit);

      return {
        type: 'odp',
        text,
        data: { slides },
        metadata: {
          size: buffer.byteLength,
          slideCount: slides.length,
          format: 'OpenDocument Presentation (ODP)',
        },
      };
    } catch (error) {
      return {
        type: 'odp',
        metadata: { size: 0 },
        error: `Erreur parsing ODP: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
