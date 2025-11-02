/**
 * Parser pour fichiers CSV (Comma Separated Values)
 *
 * Extrait:
 * - Données tabulaires (JSON)
 * - Headers
 * - Statistiques (nb lignes/colonnes)
 */

import Papa from 'papaparse';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class CsvParser extends BaseAttachmentParser {
  readonly name = 'CsvParser';

  readonly supportedMimeTypes = ['text/csv', 'application/csv', 'text/comma-separated-values'];

  readonly supportedExtensions = ['.csv'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);
      const text = new TextDecoder('utf-8').decode(buffer);

      // Parser CSV
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // Convertir nombres
      });

      let data: any;
      let rowCount = 0;
      let columnCount = 0;

      if (options.extractData !== false) {
        let parsedData = result.data;

        // Appliquer limite
        if (options.dataLimit && parsedData.length > options.dataLimit) {
          parsedData = parsedData.slice(0, options.dataLimit);
        }

        rowCount = parsedData.length;
        columnCount = result.meta.fields?.length || 0;

        data = {
          rows: parsedData,
          headers: result.meta.fields || [],
        };
      }

      // Extraction texte (preview)
      let textPreview: string | undefined;
      if (options.extractText !== false) {
        textPreview = this.limitText(text, options.textLimit);
      }

      return {
        type: 'csv',
        text: textPreview,
        data,
        metadata: {
          size: buffer.byteLength,
          rowCount,
          columnCount,
          format: 'Comma Separated Values (CSV)',
        },
      };
    } catch (error) {
      return {
        type: 'csv',
        metadata: { size: 0 },
        error: `Erreur parsing CSV: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
