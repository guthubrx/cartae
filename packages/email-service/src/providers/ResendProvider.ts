/**
 * Resend Provider - Provider production recommandé
 * Requiert: pnpm add resend
 * Config: EMAIL_PROVIDER=resend EMAIL_API_KEY=re_xxx
 */

import { createRequire } from 'module';
import type {
  EmailServiceInterface,
  EmailServiceConfig,
  SendEmailOptions,
  EmailAddress,
} from '../types/index.js';
import { renderTemplate } from '../utils/templateRenderer.js';

const require = createRequire(import.meta.url);

export class ResendProvider implements EmailServiceInterface {
  private config: EmailServiceConfig;
  private resend: any; // Type Resend si installé

  constructor(config: EmailServiceConfig) {
    this.config = config;

    if (!config.resend?.apiKey) {
      throw new Error('Resend API key requis. Configurez EMAIL_API_KEY=re_xxx');
    }

    // Dynamic import de Resend
    try {
      const { Resend } = require('resend');
      this.resend = new Resend(config.resend.apiKey);
    } catch (error) {
      throw new Error(
        'Package "resend" requis. Installez avec: pnpm add resend\n' +
        'Documentation: https://resend.com/docs'
      );
    }
  }

  async send(options: SendEmailOptions): Promise<{ id: string; success: boolean }> {
    try {
      const payload = {
        from: this.formatAddress(options.from || this.config.from),
        to: this.formatToAddresses(options.to),
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo ? this.formatAddress(options.replyTo) : undefined,
        cc: options.cc ? this.formatToAddresses(options.cc) : undefined,
        bcc: options.bcc ? this.formatToAddresses(options.bcc) : undefined,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          content_type: att.contentType,
        })),
      };

      const response = await this.resend.emails.send(payload);

      if (response.error) {
        console.error('❌ Resend error:', response.error);
        return { id: '', success: false };
      }

      console.log(`✅ Email envoyé via Resend (ID: ${response.data.id})`);
      return { id: response.data.id, success: true };
    } catch (error) {
      console.error('❌ Erreur Resend:', error);
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
      // Test simple: récupérer la liste des domains (requiert API key valide)
      await this.resend.domains.list();
      console.log('✅ Resend config valide');
      return true;
    } catch (error) {
      console.error('❌ Resend config invalide:', error);
      return false;
    }
  }

  /**
   * Format une adresse pour Resend
   */
  private formatAddress(addr: EmailAddress): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
  }

  /**
   * Format tableau d'adresses pour Resend
   */
  private formatToAddresses(to: EmailAddress | EmailAddress[]): string | string[] {
    if (Array.isArray(to)) {
      return to.map((addr) => this.formatAddress(addr));
    }
    return this.formatAddress(to);
  }
}
