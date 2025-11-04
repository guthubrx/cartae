/**
 * @cartae/office365-plugin
 *
 * Plugin de données Office 365 pour Cartae
 * Récupère emails, messages Teams, documents SharePoint et tâches Planner
 */

// Main plugin class
export { Office365Plugin } from './Office365Plugin';

// Services
export { Office365AuthService } from './services/Office365AuthService';
export { OwaEmailService } from './services/OwaEmailService';
export { TeamsService } from './services/TeamsService';
export { SharePointService } from './services/SharePointService';
export { PlannerService } from './services/PlannerService';

// Transformers
export { BaseTransformer } from './transformers/BaseTransformer';
export { EmailTransformer } from './transformers/EmailTransformer';
export { TeamsTransformer } from './transformers/TeamsTransformer';
export { SharePointTransformer } from './transformers/SharePointTransformer';
export { PlannerTransformer } from './transformers/PlannerTransformer';

// Types
export type {
  Office365Email,
  Office365Chat,
  Office365Message,
  SharePointDocument,
  PlannerTask,
  Office365AuthToken,
  ConnectionState,
  SyncResult,
} from './types/office365.types';
