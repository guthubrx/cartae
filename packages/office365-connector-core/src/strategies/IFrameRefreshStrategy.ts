/**
 * Stratégie de refresh par iframe (méthode actuelle Office365TokenRefresher)
 *
 * Charge outlook.office365.com dans un iframe caché pour permettre
 * à l'extension de recapturer automatiquement les nouveaux tokens.
 *
 * Cette approche fonctionne SANS avoir besoin du Microsoft Client ID.
 *
 * @see Office365TokenRefresher.ts (code legacy migré ici)
 */

import type { ITokenRefreshStrategy, TokenType, TokenData } from './ITokenRefreshStrategy';

export class IFrameRefreshStrategy implements ITokenRefreshStrategy {
  name = 'IFrameRefresh';

  private readonly REFRESH_TIMEOUT_MS = 5000; // 5 secondes

  /**
   * Cette stratégie fonctionne pour OWA et Graph
   * (les deux sont accessibles via outlook.office365.com)
   */
  canRefresh(tokenType: TokenType): boolean {
    return tokenType === 'owa' || tokenType === 'graph';
  }

  /**
   * Rafraîchit un token en chargeant Outlook dans un iframe caché
   *
   * Flow :
   * 1. Lire tokens AVANT refresh
   * 2. Créer iframe pointant vers outlook.office365.com
   * 3. Attendre 5s que l'extension capture les nouveaux tokens
   * 4. Lire tokens APRÈS refresh
   * 5. Vérifier si token a changé
   * 6. Cleanup iframe
   */
  async refresh(tokenType: TokenType, refreshToken: string | null): Promise<TokenData> {
    console.log(`[${this.name}] 🔄 Refresh ${tokenType} via iframe...`);

    // Vérifier que l'API extension est disponible
    if (typeof (window as any).cartaeBrowserStorage === 'undefined') {
      throw new Error(
        `[${this.name}] Extension Office365 non disponible (cartaeBrowserStorage undefined)`
      );
    }

    // 1. Lire tokens AVANT refresh
    const tokensBefore = await this.getStoredTokens();
    const tokenBefore = tokensBefore[`cartae-o365-token-${tokenType}`];

    console.log(
      `[${this.name}] 📊 Token ${tokenType} avant refresh:`,
      tokenBefore ? '✅ présent' : '❌ absent'
    );

    // 2. Créer iframe caché
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.src = 'https://outlook.office365.com';
    document.body.appendChild(iframe);

    console.log(`[${this.name}] 🖼️ Iframe créé, attente ${this.REFRESH_TIMEOUT_MS}ms...`);

    // 3. Attendre que l'extension capture les nouveaux tokens
    await new Promise(resolve => setTimeout(resolve, this.REFRESH_TIMEOUT_MS));

    // 4. Lire tokens APRÈS refresh
    const tokensAfter = await this.getStoredTokens();
    const tokenAfter = tokensAfter[`cartae-o365-token-${tokenType}`];

    // 5. Cleanup iframe
    iframe.remove();

    // 6. Vérifier si token a changé
    if (!tokenAfter) {
      throw new Error(
        `[${this.name}] ❌ Aucun token ${tokenType} capturé après refresh. ` +
          `Vérifiez que l'extension est chargée et que vous êtes connecté à Outlook.`
      );
    }

    if (tokenAfter === tokenBefore) {
      console.warn(
        `[${this.name}] ⚠️ Token ${tokenType} inchangé après refresh (peut-être encore valide)`
      );
    } else {
      console.log(`[${this.name}] ✅ Token ${tokenType} rafraîchi avec succès`);
    }

    // Retourner les nouvelles données du token
    return {
      accessToken: tokenAfter,
      refreshToken: tokensAfter[`cartae-o365-token-${tokenType}-refresh`] || null,
      expiresIn: tokensAfter[`cartae-o365-token-${tokenType}-expires-in`] || 3599,
      capturedAt:
        tokensAfter[`cartae-o365-token-${tokenType}-captured-at`] || new Date().toISOString(),
    };
  }

  /**
   * Récupère les tokens stockés dans l'extension
   */
  private async getStoredTokens(): Promise<Record<string, any>> {
    const browserStorage = (window as any).cartaeBrowserStorage;

    if (!browserStorage) {
      throw new Error('Extension Office365 non disponible');
    }

    try {
      const data = await browserStorage.get([
        'cartae-o365-token-owa',
        'cartae-o365-token-owa-refresh',
        'cartae-o365-token-owa-expires-in',
        'cartae-o365-token-owa-captured-at',
        'cartae-o365-token-graph',
        'cartae-o365-token-graph-refresh',
        'cartae-o365-token-graph-expires-in',
        'cartae-o365-token-graph-captured-at',
      ]);

      return data;
    } catch (error) {
      console.error(`[${this.name}] ❌ Erreur lecture storage:`, error);
      throw error;
    }
  }
}
