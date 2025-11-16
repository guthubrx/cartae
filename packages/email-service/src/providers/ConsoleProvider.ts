/**
 * Console Provider - Provider de développement (logs console, pas d'envoi réel)
 * Utilisé par défaut en dev, aucune dépendance externe requise
 */

import type {
  EmailServiceInterface,
  EmailServiceConfig,
  SendEmailOptions,
  EmailAddress,
} from '../types/index.js';
import { renderTemplate } from '../utils/templateRenderer.js';

export class ConsoleProvider implements EmailServiceInterface {
  private config: EmailServiceConfig;
  private logLevel: 'debug' | 'info';

  constructor(config: EmailServiceConfig) {
    this.config = config;
    this.logLevel = config.console?.logLevel || 'info';
  }

  async send(options: SendEmailOptions): Promise<{ id: string; success: boolean }> {
    const id = `console-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Format pour affichage console
    const toStr = Array.isArray(options.to)
      ? options.to.map((t) => this.formatAddress(t)).join(', ')
      : this.formatAddress(options.to);

    const fromStr = options.from ? this.formatAddress(options.from) : 'N/A';

    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL (Console Provider - Dev Mode)');
    console.log('='.repeat(80));
    console.log(`ID:      ${id}`);
    console.log(`From:    ${fromStr}`);
    console.log(`To:      ${toStr}`);
    console.log(`Subject: ${options.subject}`);

    if (options.cc) {
      console.log(`CC:      ${options.cc.map((c) => this.formatAddress(c)).join(', ')}`);
    }
    if (options.bcc) {
      console.log(`BCC:     ${options.bcc.map((b) => this.formatAddress(b)).join(', ')}`);
    }
    if (options.replyTo) {
      console.log(`ReplyTo: ${this.formatAddress(options.replyTo)}`);
    }

    console.log('-'.repeat(80));

    if (options.text) {
      console.log('TEXT VERSION:');
      console.log(options.text);
      console.log('-'.repeat(80));
    }

    if (options.html) {
      if (this.logLevel === 'debug') {
        console.log('HTML VERSION:');
        console.log(options.html);
        console.log('-'.repeat(80));
      } else {
        console.log('HTML VERSION: (set EMAIL_LOG_LEVEL=debug to see full HTML)');
        console.log(options.html.slice(0, 200) + '...');
        console.log('-'.repeat(80));
      }
    }

    if (options.attachments && options.attachments.length > 0) {
      console.log('ATTACHMENTS:');
      options.attachments.forEach((att) => {
        console.log(`  - ${att.filename} (${att.contentType || 'unknown'})`);
      });
      console.log('-'.repeat(80));
    }

    console.log('✅ Email envoyé (console only, pas d\'envoi réel)');
    console.log('='.repeat(80) + '\n');

    return { id, success: true };
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
    console.log('✅ Console Provider: Toujours valide (mode dev)');
    return true;
  }

  /**
   * Format une adresse email pour affichage
   */
  private formatAddress(addr: EmailAddress): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
  }
}
