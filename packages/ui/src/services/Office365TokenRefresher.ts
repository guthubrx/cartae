/**
 * Office365TokenRefresher - Rafraîchissement automatique des tokens Office365/Teams
 *
 * Stratégie : Charger outlook.office365.com dans un iframe caché toutes les 45 minutes
 * pour permettre à l'extension de capturer les tokens frais automatiquement.
 *
 * Cette approche fonctionne SANS avoir besoin du Microsoft Client ID.
 */

/**
 * Interface pour l'API browser.storage exposée par l'extension
 * Voir: /tools/office365-extension/content-script.js
 */
interface CartaeBrowserStorage {
  get(keys: string[]): Promise<Record<string, any>>;
  set(items: Record<string, any>): Promise<void>;
}

declare global {
  interface Window {
    cartaeBrowserStorage?: CartaeBrowserStorage;
  }
}

export class Office365TokenRefresher {
  private refreshInterval: number | null = null;

  private readonly REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes

  private readonly IFRAME_LOAD_TIMEOUT_MS = 5000; // 5 secondes

  private isRefreshing = false;

  /**
   * Démarre le rafraîchissement automatique des tokens
   */
  start(): void {
    console.log(
      '[Office365TokenRefresher] 🚀 Démarrage du rafraîchissement automatique (interval: 45min)'
    );

    // Premier rafraîchissement immédiat
    this.refreshTokens();

    // Rafraîchissements périodiques
    this.refreshInterval = window.setInterval(() => {
      this.refreshTokens();
    }, this.REFRESH_INTERVAL_MS);
  }

  /**
   * Arrête le rafraîchissement automatique
   */
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('[Office365TokenRefresher] ⏹️ Rafraîchissement automatique arrêté');
    }
  }

  /**
   * Vérifie si l'API browser.storage de l'extension est disponible
   */
  private isExtensionAvailable(): boolean {
    return typeof window.cartaeBrowserStorage !== 'undefined';
  }

  /**
   * Rafraîchit les tokens en chargeant Outlook dans un iframe caché
   */
  private async refreshTokens(): Promise<void> {
    if (this.isRefreshing) {
      console.log('[Office365TokenRefresher] ⏭️ Rafraîchissement déjà en cours, skip');
      return;
    }

    if (!this.isExtensionAvailable()) {
      console.warn(
        '[Office365TokenRefresher] ⚠️ Extension Office365 non détectée - rafraîchissement impossible'
      );
      return;
    }

    this.isRefreshing = true;

    try {
      console.log('[Office365TokenRefresher] 🔄 Rafraîchissement des tokens via iframe...');

      // Lire les tokens AVANT le refresh pour comparaison
      const tokensBefore = await this.getStoredTokens();
      const owaTokenBefore = tokensBefore['cartae-o365-token-owa'];
      const graphTokenBefore = tokensBefore['cartae-o365-token-graph'];

      console.log('[Office365TokenRefresher] 📊 Tokens avant refresh:', {
        owaPresent: !!owaTokenBefore,
        graphPresent: !!graphTokenBefore,
      });

      // Créer iframe caché pointant vers Outlook
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.src = 'https://outlook.office365.com';
      document.body.appendChild(iframe);

      // Attendre que la page charge et que l'extension capture les tokens
      await new Promise(resolve => setTimeout(resolve, this.IFRAME_LOAD_TIMEOUT_MS));

      // Lire les tokens APRÈS le refresh
      const tokensAfter = await this.getStoredTokens();
      const owaTokenAfter = tokensAfter['cartae-o365-token-owa'];
      const graphTokenAfter = tokensAfter['cartae-o365-token-graph'];

      // Vérifier si les tokens ont changé
      const owaChanged = owaTokenBefore !== owaTokenAfter;
      const graphChanged = graphTokenBefore !== graphTokenAfter;

      if (owaChanged || graphChanged) {
        console.log('[Office365TokenRefresher] ✅ Tokens rafraîchis avec succès:', {
          owaRefreshed: owaChanged,
          graphRefreshed: graphChanged,
        });
      } else {
        console.log(
          '[Office365TokenRefresher] ℹ️ Aucun changement de token détecté (peut-être encore valides)'
        );
      }

      // Cleanup iframe
      iframe.remove();
    } catch (error) {
      console.error('[Office365TokenRefresher] ❌ Erreur lors du rafraîchissement:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Récupère les tokens stockés dans l'extension
   */
  private async getStoredTokens(): Promise<Record<string, any>> {
    if (!this.isExtensionAvailable()) {
      return {};
    }

    try {
      const tokens = await window.cartaeBrowserStorage!.get([
        'cartae-o365-token-owa',
        'cartae-o365-token-graph',
      ]);
      return tokens;
    } catch (error) {
      console.error('[Office365TokenRefresher] ❌ Erreur lecture tokens:', error);
      return {};
    }
  }

  /**
   * Force un rafraîchissement manuel des tokens
   */
  async forceRefresh(): Promise<void> {
    console.log('[Office365TokenRefresher] 🔁 Rafraîchissement manuel demandé');
    await this.refreshTokens();
  }
}

/**
 * Instance singleton du refresher
 */
export const office365TokenRefresher = new Office365TokenRefresher();
