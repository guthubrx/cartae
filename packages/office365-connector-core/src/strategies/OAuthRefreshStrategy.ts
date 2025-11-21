/**
 * Stratégie de refresh OAuth standard (utilise refresh_token)
 *
 * Appelle le backend /api/office365/refresh qui fait un POST vers
 * Microsoft Token Endpoint avec le refresh_token.
 *
 * Cette approche est la méthode standard OAuth 2.0, mais nécessite
 * que le refresh_token soit disponible (flow Authorization Code + PKCE).
 *
 * @see TokenRefreshService.ts (backend)
 */

import type { ITokenRefreshStrategy, TokenType, TokenData } from './ITokenRefreshStrategy';

export class OAuthRefreshStrategy implements ITokenRefreshStrategy {
  name = 'OAuthRefresh';

  private readonly BACKEND_URL =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://api.cartae.com'; // Production URL

  /**
   * Cette stratégie fonctionne pour tous les types de tokens
   * (OWA, Graph, SharePoint, Teams)
   */
  canRefresh(tokenType: TokenType): boolean {
    return true;
  }

  /**
   * Rafraîchit un token via OAuth 2.0 standard
   *
   * Flow :
   * 1. Vérifier que refresh_token est disponible
   * 2. Appeler backend /api/office365/refresh
   * 3. Backend appelle Microsoft Token Endpoint
   * 4. Retourner nouveau access_token + refresh_token
   *
   * @throws Error si refresh_token manquant ou expiré
   */
  async refresh(tokenType: TokenType, refreshToken: string | null): Promise<TokenData> {
    console.log(`[${this.name}] 🔄 Refresh ${tokenType} via OAuth...`);

    // Vérifier que refresh_token est disponible
    if (!refreshToken) {
      throw new Error(
        `[${this.name}] ❌ Refresh token manquant pour ${tokenType}. ` +
          `OAuth refresh impossible. Flow Authorization Code + PKCE requis pour obtenir refresh_token.`
      );
    }

    console.log(
      `[${this.name}] 📋 Refresh token disponible pour ${tokenType} (${refreshToken.substring(0, 20)}...)`
    );

    try {
      // Appeler backend
      const response = await fetch(`${this.BACKEND_URL}/api/office365/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
          tokenType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `[${this.name}] ❌ Backend refresh failed (${response.status}): ${errorText}`
        );
      }

      const result = await response.json();

      // Vérifier si le refresh a réussi
      if (!result.success) {
        if (result.requiresReauth) {
          throw new Error(
            `[${this.name}] ❌ Refresh token expiré pour ${tokenType}. ` +
              `Re-connexion Office365 requise (refresh token invalide après 90 jours).`
          );
        }

        throw new Error(
          `[${this.name}] ❌ OAuth refresh échoué: ${result.error || 'Unknown error'}`
        );
      }

      console.log(`[${this.name}] ✅ Token ${tokenType} rafraîchi via OAuth`);

      // Retourner les nouvelles données du token
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken, // Peut être un nouveau refresh_token (rolling refresh)
        expiresIn: 3599, // 1 heure par défaut (Microsoft standard)
        capturedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Re-throw avec contexte
      if (error instanceof Error) {
        console.error(`[${this.name}] ❌ Erreur OAuth refresh:`, error.message);
        throw error;
      }

      throw new Error(`[${this.name}] ❌ Erreur inconnue lors du refresh OAuth: ${String(error)}`);
    }
  }
}
