/**
 * Service d'authentification Office 365 par interception de tokens.
 *
 * Flow :
 * 1. Extension Firefox capture tokens (background.js)
 * 2. Stocke dans browser.storage.local
 * 3. TokenInterceptorService lit tokens depuis storage
 * 4. Fournit tokens aux services (OWA, Graph, SharePoint, Teams)
 *
 * Prérequis :
 * - Extension Firefox chargée (extension-integration/)
 * - User connecté à OWA au moins une fois
 */

import type { IOffice365AuthService } from '../types/IOffice365AuthService';
import type { TokenData } from '../types/auth.types';

export class TokenInterceptorService implements IOffice365AuthService {
  private tokens: Map<string, TokenData> = new Map();

  private storageCheckInterval: number | null = null;

  /**
   * Démarre la surveillance du storage pour nouveaux tokens
   */
  async startMonitoring(): Promise<void> {
    // Charger tokens existants
    await this.loadTokensFromStorage();

    // Vérifier toutes les 30s si nouveaux tokens
    this.storageCheckInterval = window.setInterval(() => {
      this.loadTokensFromStorage();
    }, 30000);
  }

  /**
   * Arrête la surveillance
   */
  stopMonitoring(): void {
    if (this.storageCheckInterval) {
      window.clearInterval(this.storageCheckInterval);
      this.storageCheckInterval = null;
    }
  }

  /**
   * Charge tokens depuis browser.storage.local (via content script)
   */
  private async loadTokensFromStorage(): Promise<void> {
    try {
      // Vérifier si API window.cartaeBrowserStorage disponible (injectée par content script)
      if (typeof (window as any).cartaeBrowserStorage === 'undefined') {
        console.warn(
          '[TokenInterceptor] Extension Firefox non chargée (cartaeBrowserStorage non disponible)'
        );
        return;
      }

      // Charger tous les tokens via content script
      const data = await (window as any).cartaeBrowserStorage.get([
        'cartae-o365-token-owa',
        'cartae-o365-token-owa-refresh',
        'cartae-o365-token-owa-expires-in',
        'cartae-o365-token-owa-captured-at',
        'cartae-o365-token-graph',
        'cartae-o365-token-graph-refresh',
        'cartae-o365-token-graph-expires-in',
        'cartae-o365-token-graph-captured-at',
        'cartae-o365-token-sharepoint',
        'cartae-o365-token-sharepoint-refresh',
        'cartae-o365-token-sharepoint-expires-in',
        'cartae-o365-token-sharepoint-captured-at',
        'cartae-o365-token-teams',
        'cartae-o365-token-teams-refresh',
        'cartae-o365-token-teams-expires-in',
        'cartae-o365-token-teams-captured-at',
      ]);

      // Mapper vers TokenData
      const types = ['owa', 'graph', 'sharepoint', 'teams'] as const;
      types.forEach(type => {
        const token = data[`cartae-o365-token-${type}`];
        if (token) {
          this.tokens.set(type, {
            accessToken: token,
            refreshToken: data[`cartae-o365-token-${type}-refresh`] || null,
            expiresIn: data[`cartae-o365-token-${type}-expires-in`] || 3599,
            capturedAt: data[`cartae-o365-token-${type}-captured-at`] || new Date().toISOString(),
          });
          console.log(`[TokenInterceptor] ✅ Token ${type} chargé`);
        }
      });
    } catch (error) {
      console.error('[TokenInterceptor] ❌ Erreur chargement tokens:', error);
    }
  }

  /**
   * Récupère token pour un service spécifique
   */
  async getToken(service: 'owa' | 'graph' | 'sharepoint' | 'teams'): Promise<string | null> {
    let tokenData = this.tokens.get(service);

    if (!tokenData) {
      console.warn(`[TokenInterceptor] ⚠️ Token ${service} non disponible`);
      return null;
    }

    // Vérifier expiration
    const capturedAt = new Date(tokenData.capturedAt).getTime();
    const expiresAt = capturedAt + tokenData.expiresIn * 1000;
    const now = Date.now();

    if (now >= expiresAt) {
      console.warn(`[TokenInterceptor] ⚠️ Token ${service} expiré, rechargement...`);

      // Recharger depuis storage (l'extension capture automatiquement les nouveaux tokens)
      await this.loadTokensFromStorage();

      // Vérifier si token rafraîchi
      tokenData = this.tokens.get(service);
      if (!tokenData) {
        console.error(`[TokenInterceptor] ❌ Token ${service} toujours indisponible après reload`);
        return null;
      }

      // Re-vérifier expiration du nouveau token
      const newCapturedAt = new Date(tokenData.capturedAt).getTime();
      const newExpiresAt = newCapturedAt + tokenData.expiresIn * 1000;

      if (now >= newExpiresAt) {
        console.error(
          `[TokenInterceptor] ❌ Token ${service} toujours expiré. Reconnectez-vous à Office 365.`
        );
        return null;
      }
    }

    return tokenData.accessToken;
  }

  /**
   * Vérifie si tokens disponibles
   */
  hasTokens(): boolean {
    return this.tokens.size > 0;
  }

  /**
   * Vérifier expiration d'un token et retourner info
   */
  checkTokenExpiration(service: 'owa' | 'graph' | 'sharepoint' | 'teams'): {
    hasToken: boolean;
    isExpired: boolean;
    expiresIn?: number;
    shouldRefresh: boolean;
  } {
    const tokenData = this.tokens.get(service);

    if (!tokenData) {
      return {
        hasToken: false,
        isExpired: true,
        shouldRefresh: true,
      };
    }

    const capturedAt = new Date(tokenData.capturedAt).getTime();
    const expiresAt = capturedAt + tokenData.expiresIn * 1000;
    const now = Date.now();
    const expiresIn = Math.max(0, Math.floor((expiresAt - now) / 1000));

    const isExpired = now >= expiresAt;
    const shouldRefresh = expiresIn < 600; // < 10 minutes

    return {
      hasToken: true,
      isExpired,
      expiresIn,
      shouldRefresh,
    };
  }

  /**
   * Récupère tous les tokens
   */
  getAllTokens(): Map<string, TokenData> {
    return new Map(this.tokens);
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return this.hasTokens();
  }

  /**
   * Obtenir access token (par défaut OWA)
   */
  async getAccessToken(): Promise<string> {
    const token = await this.getToken('owa');

    if (!token) {
      throw new Error(
        '[TokenInterceptor] Token OWA non disponible. ' +
          "Assurez-vous que l'extension est chargée et que vous êtes connecté à OWA."
      );
    }

    return token;
  }

  /**
   * Déconnecte l'utilisateur
   */
  async logout(): Promise<void> {
    this.tokens.clear();

    // Nettoyer storage extension
    if (typeof window !== 'undefined' && (window as any).browser) {
      await (window as any).browser.storage.local.remove([
        'cartae-o365-token-owa',
        'cartae-o365-token-owa-refresh',
        'cartae-o365-token-graph',
        'cartae-o365-token-graph-refresh',
        'cartae-o365-token-sharepoint',
        'cartae-o365-token-sharepoint-refresh',
        'cartae-o365-token-teams',
        'cartae-o365-token-teams-refresh',
      ]);
    }

    console.log('[TokenInterceptor] 🧹 Tokens nettoyés');
  }
}
