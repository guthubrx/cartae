/**
 * Gestionnaire centralisé de refresh de tokens Office 365
 *
 * Remplace TokenInterceptorService avec architecture Strategy Pattern.
 * Essaie plusieurs stratégies de refresh dans l'ordre jusqu'à succès.
 *
 * Stratégies supportées :
 * 1. OAuthRefreshStrategy (priorité 1) - OAuth standard avec refresh_token
 * 2. IFrameRefreshStrategy (priorité 2) - Fallback iframe Outlook
 *
 * @example
 * ```typescript
 * const manager = new TokenRefreshManager([
 *   new OAuthRefreshStrategy(),   // Essaye OAuth d'abord
 *   new IFrameRefreshStrategy(),  // Fallback si OAuth échoue
 * ]);
 *
 * await manager.startMonitoring(); // Charge tokens depuis browser.storage
 *
 * const token = await manager.getToken('owa'); // Auto-refresh si expiré
 * ```
 */

import type { IOffice365AuthService } from '../types/IOffice365AuthService';
import type { TokenData } from '../types/auth.types';
import type { ITokenRefreshStrategy, TokenType } from '../strategies/ITokenRefreshStrategy';

export class TokenRefreshManager implements IOffice365AuthService {
  private tokenCache: Map<string, TokenData> = new Map();

  private strategies: ITokenRefreshStrategy[];

  private monitoringInterval: number | null = null;

  /**
   * @param strategies - Liste de stratégies de refresh (ordre = priorité)
   */
  constructor(strategies: ITokenRefreshStrategy[]) {
    this.strategies = strategies;
    console.log(
      `[TokenRefreshManager] 🚀 Initialisé avec ${strategies.length} stratégies:`,
      strategies.map(s => s.name).join(', ')
    );
  }

  /**
   * Démarre la surveillance du storage pour nouveaux tokens
   * Charge tokens existants et vérifie toutes les 30s
   */
  async startMonitoring(): Promise<void> {
    console.log('[TokenRefreshManager] 👂 Démarrage monitoring...');

    // Charger tokens existants
    await this.loadTokensFromStorage();

    // Vérifier toutes les 30s si nouveaux tokens
    this.monitoringInterval = window.setInterval(() => {
      this.loadTokensFromStorage();
    }, 30000);

    console.log('[TokenRefreshManager] ✅ Monitoring actif (check 30s)');
  }

  /**
   * Arrête la surveillance
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      window.clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[TokenRefreshManager] ⏹️ Monitoring arrêté');
    }
  }

  /**
   * Charge tokens depuis browser.storage.local (via content script)
   */
  private async loadTokensFromStorage(): Promise<void> {
    try {
      // Vérifier si API window.cartaeBrowserStorage disponible
      if (typeof (window as any).cartaeBrowserStorage === 'undefined') {
        console.warn('[TokenRefreshManager] Extension Firefox non chargée');
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
        'cartae-o365-token-teams',
        'cartae-o365-token-teams-refresh',
        'cartae-o365-token-teams-expires-in',
        'cartae-o365-token-teams-captured-at',
        'cartae-o365-token-sharepoint',
        'cartae-o365-token-sharepoint-refresh',
        'cartae-o365-token-sharepoint-expires-in',
        'cartae-o365-token-sharepoint-captured-at',
      ]);

      // Mapper vers TokenData
      const types = ['owa', 'graph', 'teams', 'sharepoint'] as const;
      types.forEach(type => {
        const accessToken = data[`cartae-o365-token-${type}`];
        if (accessToken) {
          this.tokenCache.set(type, {
            accessToken,
            refreshToken: data[`cartae-o365-token-${type}-refresh`] || null,
            expiresIn: data[`cartae-o365-token-${type}-expires-in`] || 3599,
            capturedAt: data[`cartae-o365-token-${type}-captured-at`] || new Date().toISOString(),
          });
        }
      });

      const tokensCount = this.tokenCache.size;
      if (tokensCount > 0) {
        console.log(`[TokenRefreshManager] ✅ ${tokensCount} tokens chargés`);
      }
    } catch (error) {
      console.error('[TokenRefreshManager] ❌ Erreur chargement tokens:', error);
    }
  }

  /**
   * Récupère token pour un service spécifique
   * Auto-refresh si expiré ou bientôt expiré (< 5 min)
   */
  async getToken(service: 'owa' | 'graph' | 'teams' | 'sharepoint'): Promise<string | null> {
    let tokenData = this.tokenCache.get(service);

    if (!tokenData) {
      console.warn(`[TokenRefreshManager] ⚠️ Token ${service} non disponible`);
      return null;
    }

    // Vérifier expiration (marge 5 minutes)
    const capturedAt = new Date(tokenData.capturedAt).getTime();
    const expiresAt = capturedAt + tokenData.expiresIn * 1000;
    const now = Date.now();
    const margin = 5 * 60 * 1000; // 5 minutes

    const isExpired = now >= expiresAt - margin;

    if (isExpired) {
      console.log(`[TokenRefreshManager] ⏰ Token ${service} expiré, refresh automatique...`);

      try {
        await this.refreshToken(service as TokenType, tokenData.refreshToken);

        // Recharger token rafraîchi
        tokenData = this.tokenCache.get(service);

        if (!tokenData) {
          throw new Error(`Token ${service} toujours indisponible après refresh`);
        }
      } catch (error) {
        console.error(`[TokenRefreshManager] ❌ Erreur refresh ${service}:`, error);
        throw error;
      }
    }

    return tokenData.accessToken;
  }

  /**
   * Rafraîchit un token avec les stratégies disponibles
   * Essaie chaque stratégie dans l'ordre jusqu'à succès
   */
  private async refreshToken(tokenType: TokenType, refreshToken: string | null): Promise<void> {
    console.log(`[TokenRefreshManager] 🔄 Tentative refresh ${tokenType}...`);

    for (const strategy of this.strategies) {
      if (!strategy.canRefresh(tokenType)) {
        console.log(`[TokenRefreshManager] ⏭️ ${strategy.name} ne supporte pas ${tokenType}, skip`);
        continue;
      }

      try {
        console.log(`[TokenRefreshManager] 🎯 Essai ${strategy.name} pour ${tokenType}...`);

        const newTokenData = await strategy.refresh(tokenType, refreshToken);

        // Mettre à jour le cache
        this.tokenCache.set(tokenType, newTokenData);

        // Sauvegarder dans browser.storage pour persistance
        await (window as any).cartaeBrowserStorage.set({
          [`cartae-o365-token-${tokenType}`]: newTokenData.accessToken,
          [`cartae-o365-token-${tokenType}-refresh`]: newTokenData.refreshToken,
          [`cartae-o365-token-${tokenType}-expires-in`]: newTokenData.expiresIn,
          [`cartae-o365-token-${tokenType}-captured-at`]: newTokenData.capturedAt,
        });

        console.log(`[TokenRefreshManager] ✅ Token ${tokenType} rafraîchi avec ${strategy.name}`);

        return; // Succès, sortir de la boucle
      } catch (error) {
        console.warn(
          `[TokenRefreshManager] ⚠️ ${strategy.name} échoué pour ${tokenType}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continuer avec la stratégie suivante
      }
    }

    // Toutes les stratégies ont échoué
    throw new Error(
      `[TokenRefreshManager] ❌ Impossible de rafraîchir token ${tokenType} ` +
        `(toutes stratégies échouées: ${this.strategies.map(s => s.name).join(', ')})`
    );
  }

  // ========== Autres méthodes IOffice365AuthService ==========

  hasTokens(): boolean {
    return this.tokenCache.size > 0;
  }

  isAuthenticated(): boolean {
    return this.hasTokens();
  }

  async getAccessToken(): Promise<string> {
    const token = await this.getToken('owa');
    if (!token) {
      throw new Error('[TokenRefreshManager] Token OWA non disponible');
    }
    return token;
  }

  checkTokenExpiration(service: 'owa' | 'graph' | 'teams' | 'sharepoint') {
    const tokenData = this.tokenCache.get(service);

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

  getAllTokens(): Map<string, TokenData> {
    return new Map(this.tokenCache);
  }

  async logout(): Promise<void> {
    this.tokenCache.clear();

    // Nettoyer storage extension
    if (typeof (window as any).cartaeBrowserStorage !== 'undefined') {
      await (window as any).cartaeBrowserStorage.set({
        'cartae-o365-token-owa': null,
        'cartae-o365-token-owa-refresh': null,
        'cartae-o365-token-graph': null,
        'cartae-o365-token-graph-refresh': null,
        'cartae-o365-token-teams': null,
        'cartae-o365-token-teams-refresh': null,
        'cartae-o365-token-sharepoint': null,
        'cartae-o365-token-sharepoint-refresh': null,
      });
    }

    console.log('[TokenRefreshManager] 🧹 Tokens nettoyés');
  }
}
