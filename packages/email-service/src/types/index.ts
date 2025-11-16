/**
 * Email Service Types
 * Architecture configurable multi-providers (Resend, SendGrid, SES, Console)
 */

export type EmailProvider = 'resend' | 'sendgrid' | 'ses' | 'console';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: EmailAddress | EmailAddress[];
  from?: EmailAddress;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: EmailAddress;
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailServiceConfig {
  provider: EmailProvider;
  apiKey?: string;
  from: EmailAddress;
  // Provider-specific config
  resend?: {
    apiKey: string;
  };
  sendgrid?: {
    apiKey: string;
  };
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  console?: {
    logLevel: 'debug' | 'info';
  };
}

export interface EmailServiceInterface {
  /**
   * Envoie un email simple
   */
  send(options: SendEmailOptions): Promise<{ id: string; success: boolean }>;

  /**
   * Envoie un email depuis un template Handlebars
   */
  sendTemplate(
    templateName: string,
    to: EmailAddress | EmailAddress[],
    data: Record<string, any>
  ): Promise<{ id: string; success: boolean }>;

  /**
   * Valide une configuration email
   */
  validateConfig(): Promise<boolean>;
}
