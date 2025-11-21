/**
 * Interface pour les stratégies de refresh de tokens Office 365
 *
 * Chaque stratégie implémente une méthode spécifique pour rafraîchir les tokens :
 * - OAuthRefreshStrategy : Utilise refresh_token via OAuth 2.0 standard
 * - IFrameRefreshStrategy : Charge iframe pour recapture automatique
 * - Futures stratégies possibles (SAML, etc.)
 */

/**
 * Type de token Office 365
 */
export type TokenType = 'owa' | 'graph' | 'teams' | 'sharepoint';

/**
 * Données d'un token Office 365
 */
export interface TokenData {
  /** Access token JWT */
  accessToken: string;

  /** Refresh token (peut être null si non disponible) */
  refreshToken: string | null;

  /** Durée de validité en secondes */
  expiresIn: number;

  /** Date de capture (ISO 8601) */
  capturedAt: string;
}

/**
 * Interface pour les stratégies de refresh de tokens
 *
 * Pattern Strategy : chaque stratégie implémente une méthode différente
 * pour rafraîchir les tokens Office 365.
 *
 * @example
 * ```typescript
 * class OAuthRefreshStrategy implements ITokenRefreshStrategy {
 *   name = 'OAuthRefresh';
 *
 *   canRefresh(tokenType: TokenType): boolean {
 *     return true; // Fonctionne pour tous les types
 *   }
 *
 *   async refresh(tokenType: TokenType, refreshToken: string | null): Promise<TokenData> {
 *     // Appelle Microsoft OAuth endpoint avec refresh_token
 *   }
 * }
 * ```
 */
export interface ITokenRefreshStrategy {
  /**
   * Nom de la stratégie (pour logs et debugging)
   * @example "OAuthRefresh", "IFrameRefresh", "SAMLRefresh"
   */
  name: string;

  /**
   * Vérifie si cette stratégie peut rafraîchir ce type de token
   *
   * @param tokenType - Type de token à rafraîchir
   * @returns true si la stratégie supporte ce type
   *
   * @example
   * ```typescript
   * // IFrameRefreshStrategy supporte seulement OWA et Graph
   * canRefresh(tokenType: TokenType): boolean {
   *   return tokenType === 'owa' || tokenType === 'graph';
   * }
   *
   * // OAuthRefreshStrategy supporte tous les types
   * canRefresh(tokenType: TokenType): boolean {
   *   return true;
   * }
   * ```
   */
  canRefresh(tokenType: TokenType): boolean;

  /**
   * Rafraîchit un token
   *
   * @param tokenType - Type de token à rafraîchir
   * @param refreshToken - Refresh token (peut être null)
   * @returns Nouvelles données du token
   * @throws Error si le refresh échoue
   *
   * @example
   * ```typescript
   * const newToken = await strategy.refresh('owa', 'refresh_token_here');
   * console.log(newToken.accessToken); // Nouveau access token
   * ```
   */
  refresh(tokenType: TokenType, refreshToken: string | null): Promise<TokenData>;
}
