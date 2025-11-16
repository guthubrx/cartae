/**
 * AWS SES Provider - Alternative AWS
 * Requiert: pnpm add @aws-sdk/client-ses
 * Config: EMAIL_PROVIDER=ses AWS_REGION=us-east-1 AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx
 */

import type {
  EmailServiceInterface,
  EmailServiceConfig,
  SendEmailOptions,
  EmailAddress,
} from '../types/index.js';
import { renderTemplate } from '../utils/templateRenderer.js';

export class SESProvider implements EmailServiceInterface {
  private config: EmailServiceConfig;
  private client: any;

  constructor(config: EmailServiceConfig) {
    this.config = config;

    if (!config.ses) {
      throw new Error(
        'AWS SES config requis. Configurez AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY'
      );
    }

    try {
      const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
      this.client = new SESClient({
        region: config.ses.region,
        credentials: {
          accessKeyId: config.ses.accessKeyId,
          secretAccessKey: config.ses.secretAccessKey,
        },
      });
      this.SendEmailCommand = SendEmailCommand;
    } catch (error) {
      throw new Error(
        'Package "@aws-sdk/client-ses" requis. Installez avec: pnpm add @aws-sdk/client-ses\n' +
        'Documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/ses-examples-sending-email.html'
      );
    }
  }

  private SendEmailCommand: any;

  async send(options: SendEmailOptions): Promise<{ id: string; success: boolean }> {
    try {
      const params = {
        Source: this.formatAddress(options.from || this.config.from),
        Destination: {
          ToAddresses: this.formatToArray(options.to),
          CcAddresses: options.cc ? this.formatToArray(options.cc) : undefined,
          BccAddresses: options.bcc ? this.formatToArray(options.bcc) : undefined,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: options.html
              ? {
                  Data: options.html,
                  Charset: 'UTF-8',
                }
              : undefined,
            Text: options.text
              ? {
                  Data: options.text,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
        ReplyToAddresses: options.replyTo ? [this.formatAddress(options.replyTo)] : undefined,
      };

      const command = new this.SendEmailCommand(params);
      const response = await this.client.send(command);

      const id = response.MessageId || `ses-${Date.now()}`;
      console.log(`✅ Email envoyé via AWS SES (ID: ${id})`);
      return { id, success: true };
    } catch (error: any) {
      console.error('❌ Erreur AWS SES:', error);
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
      // Test simple: vérifier les quotas SES (requiert credentials valides)
      const { GetSendQuotaCommand } = require('@aws-sdk/client-ses');
      const command = new GetSendQuotaCommand({});
      await this.client.send(command);
      console.log('✅ AWS SES config valide');
      return true;
    } catch (error) {
      console.error('❌ AWS SES config invalide:', error);
      return false;
    }
  }

  private formatAddress(addr: EmailAddress): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
  }

  private formatToArray(to: EmailAddress | EmailAddress[]): string[] {
    if (Array.isArray(to)) {
      return to.map((addr) => this.formatAddress(addr));
    }
    return [this.formatAddress(to)];
  }
}
