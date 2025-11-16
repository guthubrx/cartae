/**
 * Email Service - Service principal configurable multi-providers
 * Supporte: Resend, SendGrid, AWS SES, Console (dev)
 */

import type {
  EmailServiceConfig,
  EmailServiceInterface,
  SendEmailOptions,
  EmailAddress,
} from './types/index.js';
import { ConsoleProvider } from './providers/ConsoleProvider.js';
import { ResendProvider } from './providers/ResendProvider.js';

export class EmailService implements EmailServiceInterface {
  private provider: EmailServiceInterface;
  private config: EmailServiceConfig;

  constructor(config: EmailServiceConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  /**
   * Factory pattern - Crée le bon provider selon la config
   */
  private createProvider(config: EmailServiceConfig): EmailServiceInterface {
    switch (config.provider) {
      case 'resend':
        return this.createResendProvider(config);
      case 'sendgrid':
        return this.createSendGridProvider(config);
      case 'ses':
        return this.createSESProvider(config);
      case 'console':
        return this.createConsoleProvider(config);
      default:
        throw new Error(`Provider non supporté: ${config.provider}`);
    }
  }

  /**
   * Providers - Directement importés (bundlés par tsup)
   */
  private createResendProvider(config: EmailServiceConfig): EmailServiceInterface {
    return new ResendProvider(config);
  }

  private createSendGridProvider(config: EmailServiceConfig): EmailServiceInterface {
    throw new Error(
      'SendGrid provider requis. Installez: pnpm add @sendgrid/mail\n' +
      'Puis configurez EMAIL_PROVIDER=sendgrid et EMAIL_API_KEY=SG.xxx'
    );
  }

  private createSESProvider(config: EmailServiceConfig): EmailServiceInterface {
    throw new Error(
      'AWS SES provider requis. Installez: pnpm add @aws-sdk/client-ses\n' +
      'Puis configurez EMAIL_PROVIDER=ses, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY'
    );
  }

  private createConsoleProvider(config: EmailServiceConfig): EmailServiceInterface {
    return new ConsoleProvider(config);
  }

  /**
   * Délègue l'envoi au provider configuré
   */
  async send(options: SendEmailOptions): Promise<{ id: string; success: boolean }> {
    // Utilise le from par défaut de la config si non spécifié
    if (!options.from) {
      options.from = this.config.from;
    }

    return this.provider.send(options);
  }

  /**
   * Envoie depuis un template Handlebars
   */
  async sendTemplate(
    templateName: string,
    to: EmailAddress | EmailAddress[],
    data: Record<string, any>
  ): Promise<{ id: string; success: boolean }> {
    return this.provider.sendTemplate(templateName, to, data);
  }

  /**
   * Valide la configuration du provider
   */
  async validateConfig(): Promise<boolean> {
    return this.provider.validateConfig();
  }

  /**
   * Factory statique depuis variables d'environnement
   */
  static fromEnv(): EmailService {
    const provider = (process.env.EMAIL_PROVIDER || 'console') as EmailServiceConfig['provider'];
    const apiKey = process.env.EMAIL_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@cartae.dev';
    const fromName = process.env.EMAIL_FROM_NAME || 'Cartae';

    const config: EmailServiceConfig = {
      provider,
      apiKey,
      from: { email: fromEmail, name: fromName },
    };

    // Config spécifique par provider
    if (provider === 'resend' && apiKey) {
      config.resend = { apiKey };
    } else if (provider === 'sendgrid' && apiKey) {
      config.sendgrid = { apiKey };
    } else if (provider === 'ses') {
      config.ses = {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      };
    } else if (provider === 'console') {
      config.console = {
        logLevel: (process.env.EMAIL_LOG_LEVEL as 'debug' | 'info') || 'info',
      };
    }

    return new EmailService(config);
  }
}
