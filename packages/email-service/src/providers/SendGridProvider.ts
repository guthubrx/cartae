/**
 * SendGrid Provider - Alternative production
 * Requiert: pnpm add @sendgrid/mail
 * Config: EMAIL_PROVIDER=sendgrid EMAIL_API_KEY=SG.xxx
 */

import type {
  EmailServiceInterface,
  EmailServiceConfig,
  SendEmailOptions,
  EmailAddress,
} from '../types/index.js';
import { renderTemplate } from '../utils/templateRenderer.js';

export class SendGridProvider implements EmailServiceInterface {
  private config: EmailServiceConfig;
  private client: any;

  constructor(config: EmailServiceConfig) {
    this.config = config;

    if (!config.sendgrid?.apiKey) {
      throw new Error('SendGrid API key requis. Configurez EMAIL_API_KEY=SG.xxx');
    }

    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(config.sendgrid.apiKey);
      this.client = sgMail;
    } catch (error) {
      throw new Error(
        'Package "@sendgrid/mail" requis. Installez avec: pnpm add @sendgrid/mail\n' +
        'Documentation: https://docs.sendgrid.com/for-developers/sending-email/nodejs'
      );
    }
  }

  async send(options: SendEmailOptions): Promise<{ id: string; success: boolean }> {
    try {
      const msg = {
        to: this.formatTo(options.to),
        from: this.formatAddress(options.from || this.config.from),
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo ? this.formatAddress(options.replyTo) : undefined,
        cc: options.cc ? this.formatToArray(options.cc) : undefined,
        bcc: options.bcc ? this.formatToArray(options.bcc) : undefined,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
          type: att.contentType,
          disposition: 'attachment',
        })),
      };

      const [response] = await this.client.send(msg);
      const id = response.headers['x-message-id'] || `sg-${Date.now()}`;

      console.log(`✅ Email envoyé via SendGrid (ID: ${id})`);
      return { id, success: true };
    } catch (error: any) {
      console.error('❌ Erreur SendGrid:', error.response?.body || error);
      throw error;
    }
  }

  async sendTemplate(
    templateName: string,
    to: EmailAddress | EmailAddress[],
    data: Record<string, any>
  ): Promise<{ id: string; success: boolean }> {
    const { subject, html, text } = await renderTemplate(templateName, data);

    return this.send({
      to,
      from: this.config.from,
      subject,
      html,
      text,
    });
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test avec une requête simple (get API key info)
      await this.client.request({
        method: 'GET',
        url: '/v3/user/profile',
      });
      console.log('✅ SendGrid config valide');
      return true;
    } catch (error) {
      console.error('❌ SendGrid config invalide:', error);
      return false;
    }
  }

  private formatAddress(addr: EmailAddress): any {
    return {
      email: addr.email,
      name: addr.name,
    };
  }

  private formatTo(to: EmailAddress | EmailAddress[]): any {
    if (Array.isArray(to)) {
      return to.map((addr) => this.formatAddress(addr));
    }
    return this.formatAddress(to);
  }

  private formatToArray(addresses: EmailAddress[]): any[] {
    return addresses.map((addr) => this.formatAddress(addr));
  }
}
