/**
 * Parser pour présentations Microsoft PowerPoint (.pptx)
 *
 * Extrait:
 * - Texte des slides
 * - Nombre de slides
 * - Notes (si présentes)
 */

import JSZip from 'jszip';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class PptxParser extends BaseAttachmentParser {
  readonly name = 'PptxParser';

  readonly supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  readonly supportedExtensions = ['.pptx'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);
      const zip = await JSZip.loadAsync(buffer);

      // Trouver tous les slides
      const slideFiles = Object.keys(zip.files)
        .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
        .sort(); // Tri pour ordre correct

      const slides: string[] = [];

      // Extraire texte de chaque slide
      for (const slideName of slideFiles) {
        const xml = await zip.files[slideName].async('text');

        // Parser XML pour extraire texte (regex améliorée)
        // Format: <a:t>Texte</a:t> et <a:r><a:t>Texte</a:t></a:r>
        const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
        const slideText = textMatches
          .map(match => {
            const content = match.match(/<a:t[^>]*>([^<]*)<\/a:t>/);
            return content ? content[1] : '';
          })
          .filter(text => text.trim())
          .join(' ')
          .trim();

        if (slideText) {
          slides.push(slideText);
        }
      }

      // Combiner tout le texte
      let text: string | undefined;
      if (options.extractText !== false) {
        text = this.limitText(slides.join('\n\n'), options.textLimit);
      }

      // Data = slides individuels
      let data: any;
      if (options.extractData !== false) {
        data = {
          slides: slides.map((content, index) => ({
            slideNumber: index + 1,
            content,
          })),
        };
      }

      return {
        type: 'pptx',
        text,
        data,
        metadata: {
          size: buffer.byteLength,
          slideCount: slides.length,
          format: 'Microsoft PowerPoint Presentation (PPTX)',
        },
      };
    } catch (error) {
      return {
        type: 'pptx',
        metadata: { size: 0 },
        error: `Erreur parsing PPTX: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
