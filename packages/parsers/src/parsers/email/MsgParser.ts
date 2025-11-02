/**
 * Parser pour emails Outlook (.msg)
 * Extrait métadonnées email (from, to, subject, body)
 */

import MsgReader from '@kenjiuno/msgreader';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class MsgParser extends BaseAttachmentParser {
  readonly name = 'MsgParser';

  readonly supportedMimeTypes = ['application/vnd.ms-outlook'];

  readonly supportedExtensions = ['.msg'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);

      // Parser MSG
      const msgReader = new MsgReader(buffer);
      const fileData = msgReader.getFileData();

      const emailData = {
        from: fileData.senderName || '',
        to: fileData.recipients || [],
        subject: fileData.subject || '(no subject)',
        body: fileData.body || '',
        date: fileData.creationTime,
        attachmentCount: fileData.attachments?.length || 0,
      };

      return {
        type: 'msg',
        text: this.limitText(emailData.body, options.textLimit),
        data: emailData,
        metadata: {
          size: buffer.byteLength,
          author: emailData.from,
          title: emailData.subject,
          creationDate: emailData.date ? new Date(emailData.date) : undefined,
          format: 'Outlook Email Message (MSG)',
        },
      };
    } catch (error) {
      return {
        type: 'msg',
        metadata: { size: 0 },
        error: `Erreur parsing MSG: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
