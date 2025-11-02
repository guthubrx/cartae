/**
 * Parser pour fichiers vCard (.vcf)
 * Extrait informations contact
 */

import vCard from 'vcf';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class VcfParser extends BaseAttachmentParser {
  readonly name = 'VcfParser';

  readonly supportedMimeTypes = ['text/vcard', 'text/x-vcard'];

  readonly supportedExtensions = ['.vcf'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);
      const vcfText = new TextDecoder('utf-8').decode(buffer);

      // Parser vCard
      // eslint-disable-next-line new-cap
      const card = new vCard(vcfText);

      const contactData = {
        name: card.get('fn')?.valueOf() || '',
        email: card.get('email')?.valueOf() || '',
        phone: card.get('tel')?.valueOf() || '',
        organization: card.get('org')?.valueOf() || '',
        title: card.get('title')?.valueOf() || '',
        address: card.get('adr')?.valueOf() || '',
      };

      const text = `${contactData.name}\n${contactData.email}\n${contactData.phone}\n${contactData.organization}`;

      return {
        type: 'vcf',
        text: this.limitText(text, options.textLimit),
        data: contactData,
        metadata: {
          size: buffer.byteLength,
          author: contactData.name,
          format: 'vCard Contact (VCF)',
        },
      };
    } catch (error) {
      return {
        type: 'vcf',
        metadata: { size: 0 },
        error: `Erreur parsing VCF: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
