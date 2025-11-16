/**
 * @cartae/email-service
 * Service d'email configurable multi-providers (Resend, SendGrid, SES, Console)
 */

export { EmailService } from './EmailService.js';

export type {
  EmailProvider,
  EmailAddress,
  EmailAttachment,
  SendEmailOptions,
  EmailTemplate,
  EmailServiceConfig,
  EmailServiceInterface,
} from './types/index.js';

export { renderTemplate, clearTemplateCache } from './utils/templateRenderer.js';

// Providers (exports optionnels si besoin de customisation)
export { ConsoleProvider } from './providers/ConsoleProvider.js';
export { ResendProvider } from './providers/ResendProvider.js';
export { SendGridProvider } from './providers/SendGridProvider.js';
export { SESProvider } from './providers/SESProvider.js';
