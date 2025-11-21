/**
 * Export principal du package office365-connector-core
 */

// Services
export { TokenRefreshManager } from './services/TokenRefreshManager';

// Strategies
export { OAuthRefreshStrategy, IFrameRefreshStrategy } from './strategies';

// Types
export type {
  ITokenRefreshStrategy,
  TokenType,
  TokenData,
} from './strategies/ITokenRefreshStrategy';

export type { IOffice365AuthService } from './types/IOffice365AuthService';
