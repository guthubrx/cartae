/**
 * TokenRefreshService - Gestion automatique du refresh des tokens Office365/Teams
 *
 * Gère le cycle de vie des tokens OAuth 2.0 :
 * - Détection d'expiration (401 Unauthorized)
 * - Refresh automatique via refresh token
 * - Stockage sécurisé des nouveaux tokens
 */

import { z } from 'zod';

/**
 * Configuration OAuth Microsoft
 * Docs: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
 */
const MICROSOFT_TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

/**
 * Schema Zod pour les tokens stockés
 */
const TokenDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(), // Timestamp Unix (ms)
  tokenType: z.enum(['graph', 'owa']),
});

type TokenData = z.infer<typeof TokenDataSchema>;

/**
 * Schema Zod pour la réponse Microsoft Token Endpoint
 */
const MicrosoftTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(), // Secondes
  token_type: z.string(),
  scope: z.string().optional(),
});

type MicrosoftTokenResponse = z.infer<typeof MicrosoftTokenResponseSchema>;

/**
 * Service de gestion des tokens OAuth
 */
export class TokenRefreshService {
  private clientId: string;

  private clientSecret?: string;

  constructor(clientId: string, clientSecret?: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Rafraîchit un token expiré en utilisant le refresh token
   *
   * @param refreshToken - Refresh token obtenu lors du login initial
   * @param scope - Scopes OAuth requis (optionnel, conserve les scopes originaux si omis)
   * @returns Nouveaux tokens (access + refresh)
   */
  async refreshToken(refreshToken: string, scope?: string): Promise<TokenData> {
    console.log('[TokenRefreshService] Rafraîchissement du token...');

    // Construire le corps de la requête
    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    // Ajouter client_secret si disponible (pour applications confidentielles)
    if (this.clientSecret) {
      body.append('client_secret', this.clientSecret);
    }

    // Ajouter scope si spécifié
    if (scope) {
      body.append('scope', scope);
    }

    try {
      const response = await fetch(MICROSOFT_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      const tokenResponse = MicrosoftTokenResponseSchema.parse(data);

      // Calculer la date d'expiration (now + expires_in - 5min de marge)
      const expiresAt = Date.now() + (tokenResponse.expires_in - 300) * 1000;

      console.log(
        `[TokenRefreshService] ✅ Token rafraîchi, expire dans ${tokenResponse.expires_in}s`
      );

      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || refreshToken, // Conserver l'ancien si pas de nouveau
        expiresAt,
        tokenType: 'graph', // Par défaut Graph, à adapter selon le scope
      };
    } catch (error) {
      console.error('[TokenRefreshService] ❌ Erreur refresh:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un token est expiré
   *
   * @param expiresAt - Timestamp Unix (ms) d'expiration
   * @returns true si expiré ou expire dans moins de 5 minutes
   */
  isTokenExpired(expiresAt: number): boolean {
    const now = Date.now();
    const marginMs = 5 * 60 * 1000; // 5 minutes de marge
    return now >= expiresAt - marginMs;
  }

  /**
   * Extrait le timestamp d'expiration depuis un JWT (sans vérification de signature)
   * ATTENTION : Utiliser uniquement pour vérifier l'expiration côté client, PAS pour la sécurité
   *
   * @param token - JWT token
   * @returns Timestamp d'expiration (ms) ou null si invalide
   */
  extractExpirationFromJWT(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return null;

      // JWT exp est en secondes, convertir en ms
      return payload.exp * 1000;
    } catch {
      return null;
    }
  }

  /**
   * Crée un objet TokenData depuis un access token et refresh token
   *
   * @param accessToken - Access token (JWT)
   * @param refreshToken - Refresh token
   * @param tokenType - Type de token ('graph' ou 'owa')
   * @returns TokenData avec expiration calculée
   */
  createTokenData(
    accessToken: string,
    refreshToken: string,
    tokenType: 'graph' | 'owa'
  ): TokenData {
    const expiresAt = this.extractExpirationFromJWT(accessToken) || Date.now() + 3600 * 1000; // 1h par défaut

    return {
      accessToken,
      refreshToken,
      expiresAt,
      tokenType,
    };
  }
}

/**
 * Instance singleton pour Graph API
 * Client ID : à configurer via variable d'environnement
 */
export const graphTokenService = new TokenRefreshService(
  process.env.MICROSOFT_CLIENT_ID || 'YOUR_CLIENT_ID',
  process.env.MICROSOFT_CLIENT_SECRET // Optionnel pour public clients
);

/**
 * Instance singleton pour OWA API
 * Utilise les mêmes credentials mais avec audience différente
 */
export const owaTokenService = new TokenRefreshService(
  process.env.MICROSOFT_CLIENT_ID || 'YOUR_CLIENT_ID',
  process.env.MICROSOFT_CLIENT_SECRET
);
