/**
 * Parser pour tableurs OpenDocument Spreadsheet (.ods)
 * Utilise xlsx lib qui supporte ODS depuis v0.18
 */

import * as XLSX from 'xlsx';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class OdsParser extends BaseAttachmentParser {
  readonly name = 'OdsParser';

  readonly supportedMimeTypes = ['application/vnd.oasis.opendocument.spreadsheet'];

  readonly supportedExtensions = ['.ods'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);

      // xlsx lib supporte ODS
      const workbook = XLSX.read(buffer, { type: 'array' });

      const sheets = workbook.SheetNames.map(name => {
        const worksheet = workbook.Sheets[name];
        let sheetData = XLSX.utils.sheet_to_json(worksheet);

        if (options.dataLimit && sheetData.length > options.dataLimit) {
          sheetData = sheetData.slice(0, options.dataLimit);
        }

        return {
          name,
          data: sheetData,
          rowCount: sheetData.length,
        };
      });

      const rowCount = sheets[0]?.data.length || 0;
      const columnCount = sheets[0]?.data[0] ? Object.keys(sheets[0].data[0]).length : 0;

      return {
        type: 'ods',
        data: { sheets },
        metadata: {
          size: buffer.byteLength,
          sheetCount: sheets.length,
          rowCount,
          columnCount,
          format: 'OpenDocument Spreadsheet (ODS)',
        },
      };
    } catch (error) {
      return {
        type: 'ods',
        metadata: { size: 0 },
        error: `Erreur parsing ODS: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
