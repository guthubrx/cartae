/**
 * Parser pour fichiers PDF
 *
 * Extrait:
 * - Texte (première page ou toutes)
 * - Nombre de pages
 * - Métadonnées (auteur, titre, date)
 * - Preview URL
 */

import * as pdfjsLib from 'pdfjs-dist';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

// Note: GlobalWorkerOptions.workerSrc DOIT être configuré par l'application
// qui utilise ce parser (voir main.tsx pour exemple avec Vite)
// Ne PAS utiliser CDN ici car ça pose des problèmes CORS/import dynamique

export class PdfParser extends BaseAttachmentParser {
  readonly name = 'PdfParser';

  readonly supportedMimeTypes = ['application/pdf'];

  readonly supportedExtensions = ['.pdf'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);

      // Charger document PDF
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;

      const { numPages } = pdf;

      // Extraction texte (première page par défaut)
      let text: string | undefined;
      if (options.extractText !== false) {
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();

        text = this.limitText(pageText, options.textLimit);
      }

      // Extraction métadonnées
      const metadata = await pdf.getMetadata();
      const info = metadata.info as any;

      // Preview URL
      let previewUrl: string | undefined;
      if (options.generatePreview !== false) {
        previewUrl = this.createBlobUrl(buffer, _mimeType);
      }

      return {
        type: 'pdf',
        text,
        previewUrl,
        metadata: {
          size: buffer.byteLength,
          pageCount: numPages,
          author: info?.Author || undefined,
          title: info?.Title || undefined,
          creationDate: info?.CreationDate ? PdfParser.parsePdfDate(info.CreationDate) : undefined,
          format: 'Portable Document Format (PDF)',
        },
      };
    } catch (error) {
      return {
        type: 'pdf',
        metadata: { size: 0 },
        error: `Erreur parsing PDF: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Parse date PDF (format: D:YYYYMMDDHHmmss)
   */
  private static parsePdfDate(pdfDate: string): Date {
    try {
      // Format: D:20241102153045+01'00'
      const match = pdfDate.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        return new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(minute, 10),
          parseInt(second, 10)
        );
      }
    } catch {
      // Invalid format, fallback to current date
    }
    return new Date();
  }
}
