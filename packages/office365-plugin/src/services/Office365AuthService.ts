/**
 * Office365AuthService
 * Gère l'authentification via l'extension Firefox
 * Écoute window.cartaeExtensionAPI pour recevoir le token
 */

import { Office365AuthToken } from '../types/office365.types';

interface ExtensionAPI {
  _token?: string;
  _expiresIn?: number;
  onTokenReceived?: (callback: (token: string, expiresIn: number) => void) => void;
  onExtensionReady?: (callback: () => void) => void;
}

export class Office365AuthService {
  private token: Office365AuthToken | null = null;
  private tokenCallbacks: Array<(token: Office365AuthToken) => void> = [];

  constructor() {
    this.initializeExtensionListener();
  }

  /**
   * Initialise l'écoute de l'API de l'extension Firefox
   * Écoute les callbacks onTokenReceived et onExtensionReady
   */
  private initializeExtensionListener(): void {
    if (typeof window === 'undefined') {
      return; // Node.js environment (tests)
    }

    const api = (window as any).cartaeExtensionAPI as ExtensionAPI | undefined;

    if (!api) {
      console.warn('[Office365Auth] Extension API not available yet');
      return;
    }

    // Vérifier si un token est déjà disponible
    if (api._token) {
      this.setToken(api._token, api._expiresIn || 3600);
    }

    // Écouter les nouveaux tokens
    api.onTokenReceived?.((token: string, expiresIn: number) => {
      console.log('[Office365Auth] Token received from extension');
      this.setToken(token, expiresIn);
    });

    // Écouter la notification de readiness
    api.onExtensionReady?.(() => {
      console.log('[Office365Auth] Extension ready signal received');
    });
  }

  /**
   * Récupère le token actuel
   * Renouvelle le token si expiré
   */
  async getToken(): Promise<string> {
    if (!this.token) {
      throw new Error('Office365 not authenticated. Token not available.');
    }

    // Vérifier l'expiration avec buffer de 5 minutes
    const expirationTime = this.token.receivedAt + this.token.expiresIn * 1000;
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (Date.now() > expirationTime - bufferTime) {
      console.warn('[Office365Auth] Token about to expire, requesting refresh');
      await this.refresh();
    }

    if (!this.token) {
      throw new Error('Failed to refresh token');
    }

    return this.token.token;
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    if (!this.token) {
      return false;
    }

    // Vérifier que le token n'a pas expiré
    const expirationTime = this.token.receivedAt + this.token.expiresIn * 1000;
    return Date.now() < expirationTime;
  }

  /**
   * Rafraîchit le token en le demandant à l'extension
   */
  async refresh(): Promise<void> {
    return new Promise((resolve, reject) => {
      const api = (window as any).cartaeExtensionAPI as ExtensionAPI | undefined;

      if (!api?.onTokenReceived) {
        reject(new Error('Extension API not available for token refresh'));
        return;
      }

      // Timeout après 10 secondes
      const timeout = setTimeout(() => {
        reject(new Error('Token refresh timeout'));
      }, 10000);

      // Attendre le nouveau token
      const originalCallback = api.onTokenReceived;
      api.onTokenReceived = (callback: (token: string, expiresIn: number) => void) => {
        originalCallback?.(callback);
        (token: string, expiresIn: number) => {
          clearTimeout(timeout);
          this.setToken(token, expiresIn);
          resolve();
        };
      };
    });
  }

  /**
   * Définit le token reçu de l'extension
   */
  private setToken(token: string, expiresIn: number): void {
    this.token = {
      token,
      expiresIn,
      receivedAt: Date.now(),
    };

    // Notifier tous les observateurs
    this.tokenCallbacks.forEach((callback) => {
      callback(this.token!);
    });
  }

  /**
   * S'abonne aux changements de token
   */
  onTokenChanged(callback: (token: Office365AuthToken) => void): () => void {
    this.tokenCallbacks.push(callback);

    // Retourner une fonction de désabonnement
    return () => {
      const index = this.tokenCallbacks.indexOf(callback);
      if (index > -1) {
        this.tokenCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Réinitialise l'authentification
   */
  reset(): void {
    this.token = null;
  }
}
