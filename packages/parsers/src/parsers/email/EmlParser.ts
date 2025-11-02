/**
 * Parser pour emails RFC822 (.eml)
 * Parsing basique avec regex (pas de lib complexe)
 */

import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class EmlParser extends BaseAttachmentParser {
  readonly name = 'EmlParser';

  readonly supportedMimeTypes = ['message/rfc822', 'text/plain'];

  readonly supportedExtensions = ['.eml'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);
      const emlText = new TextDecoder('utf-8').decode(buffer);

      // Parser headers (regex simple)
      const from = emlText.match(/^From:\s*(.+)$/m)?.[1] || '';
      const to = emlText.match(/^To:\s*(.+)$/m)?.[1] || '';
      const subject = emlText.match(/^Subject:\s*(.+)$/m)?.[1] || '';
      const date = emlText.match(/^Date:\s*(.+)$/m)?.[1] || '';

      // Extraire body (après double newline)
      const bodyMatch = emlText.match(/\n\n([\s\S]+)$/);
      const body = bodyMatch ? bodyMatch[1].trim() : '';

      const emailData = {
        from,
        to,
        subject,
        body,
        date,
      };

      return {
        type: 'eml',
        text: this.limitText(body, options.textLimit),
        data: emailData,
        metadata: {
          size: buffer.byteLength,
          author: from,
          title: subject,
          format: 'Email Message (EML)',
        },
      };
    } catch (error) {
      return {
        type: 'eml',
        metadata: { size: 0 },
        error: `Erreur parsing EML: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
