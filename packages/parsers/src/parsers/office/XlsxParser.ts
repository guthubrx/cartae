/**
 * Parser pour tableurs Microsoft Excel (.xlsx)
 *
 * Extrait:
 * - Données tabulaires (JSON)
 * - Noms des feuilles
 * - Statistiques (nb lignes/colonnes)
 */

import * as XLSX from 'xlsx';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class XlsxParser extends BaseAttachmentParser {
  readonly name = 'XlsxParser';

  readonly supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel', // XLS legacy (support partiel)
  ];

  readonly supportedExtensions = ['.xlsx', '.xls'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);

      // Parser workbook
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Extraction données
      let data: any;
      let rowCount = 0;
      let columnCount = 0;

      if (options.extractData !== false) {
        const sheets = workbook.SheetNames.map(name => {
          const worksheet = workbook.Sheets[name];
          let sheetData = XLSX.utils.sheet_to_json(worksheet);

          // Appliquer limite si spécifiée
          if (options.dataLimit && sheetData.length > options.dataLimit) {
            sheetData = sheetData.slice(0, options.dataLimit);
          }

          // Stats première feuille
          if (rowCount === 0 && sheetData.length > 0 && typeof sheetData[0] === 'object') {
            rowCount = sheetData.length;
            columnCount = Object.keys(sheetData[0] as object).length;
          }

          return {
            name,
            data: sheetData,
            rowCount: sheetData.length,
          };
        });

        data = { sheets };
      }

      // Extraction texte (première feuille uniquement)
      let text: string | undefined;
      if (options.extractText !== false && workbook.SheetNames.length > 0) {
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvText = XLSX.utils.sheet_to_csv(firstSheet);
        text = this.limitText(csvText, options.textLimit);
      }

      return {
        type: 'xlsx',
        text,
        data,
        metadata: {
          size: buffer.byteLength,
          sheetCount: workbook.SheetNames.length,
          rowCount,
          columnCount,
          format: 'Microsoft Excel Spreadsheet (XLSX)',
        },
      };
    } catch (error) {
      return {
        type: 'xlsx',
        metadata: { size: 0 },
        error: `Erreur parsing XLSX: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
