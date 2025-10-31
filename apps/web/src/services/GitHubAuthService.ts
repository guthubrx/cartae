/**
 * GitHub Authentication Service
 * Gère l'authentification GitHub via OAuth 2.0
 * Supporte aussi le Personal Access Token (PAT) pour compatibilité
 */

import { GITHUB_CONFIG } from '../config/github';

const GITHUB_TOKEN_KEY = 'cartae-github-token';
const GITHUB_USER_KEY = 'cartae-github-user';
const OAUTH_STATE_KEY = 'cartae-oauth-state';
const OAUTH_RETURN_URL_KEY = 'cartae-oauth-return-url';

export interface GitHubUser {
  login: string; // GitHub username
  name: string;
  email: string;
  avatarUrl: string;
}

export class GitHubAuthService {
  /**
   * Login avec un GitHub Personal Access Token
   * Le token est stocké dans localStorage
   */
  // eslint-disable-next-line class-methods-use-this
  async login(token: string): Promise<GitHubUser> {
    // Valider le token en récupérant les infos user
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error('Token invalide ou expiré');
      }

      const userData = await response.json();

      const user: GitHubUser = {
        login: userData.login,
        name: userData.name || userData.login,
        email: userData.email || '',
        avatarUrl: userData.avatar_url,
      };

      // Stocker le token et user info
      localStorage.setItem(GITHUB_TOKEN_KEY, token);
      localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(user));
      // eslint-disable-next-line no-console
      return user;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[GitHubAuth] Login failed:', error);
      throw new Error(
        `Échec de la connexion GitHub: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  /**
   * Logout - supprime le token et user info
   */
  // eslint-disable-next-line class-methods-use-this
  logout(): void {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    localStorage.removeItem(GITHUB_USER_KEY);
    // eslint-disable-next-line no-console
  }

  /**
   * Récupère l'utilisateur GitHub actuellement connecté
   */
  // eslint-disable-next-line class-methods-use-this
  getUser(): GitHubUser | null {
    const userJson = localStorage.getItem(GITHUB_USER_KEY);
    if (!userJson) return null;

    try {
      return JSON.parse(userJson) as GitHubUser;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[GitHubAuth] Failed to parse user data:', error);
      return null;
    }
  }

  /**
   * Récupère le token GitHub
   */
  // eslint-disable-next-line class-methods-use-this
  getToken(): string | null {
    return localStorage.getItem(GITHUB_TOKEN_KEY);
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null && this.getUser() !== null;
  }

  /**
   * Vérifie que le token est toujours valide
   */
  async validateToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return response.ok;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[GitHubAuth] Token validation failed:', error);
      return false;
    }
  }

  /**
   * Démarre le flow OAuth en redirigeant vers GitHub
   * Génère un state random pour prévenir CSRF
   */
  // eslint-disable-next-line class-methods-use-this
  startOAuthFlow(): void {
    if (!GITHUB_CONFIG.clientId) {
      throw new Error('GitHub OAuth not configured. Set VITE_GITHUB_CLIENT_ID in .env.local');
    }

    // Sauvegarder l'URL actuelle pour y revenir après OAuth
    const currentUrl = window.location.href;
    localStorage.setItem(OAUTH_RETURN_URL_KEY, currentUrl);

    // Générer un state random pour CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem(OAUTH_STATE_KEY, state);

    // eslint-disable-next-line no-console

    // Construire l'URL d'autorisation GitHub
    const params = new URLSearchParams({
      client_id: GITHUB_CONFIG.clientId,
      redirect_uri: window.location.origin,
      scope: GITHUB_CONFIG.scopes.join(' '),
      state,
    });

    const authUrl = `${GITHUB_CONFIG.authUrl}?${params.toString()}`;

    // eslint-disable-next-line no-console

    // Petit délai pour s'assurer que localStorage est persisté avant la redirection
    setTimeout(() => {
      window.location.href = authUrl;
    }, 100);
  }

  /**
   * Gère le callback OAuth après redirection depuis GitHub
   * Échange le code d'autorisation contre un token via Supabase Edge Function
   */
  // eslint-disable-next-line class-methods-use-this
  async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    try {
      // Vérifier le state pour CSRF protection
      const savedState = localStorage.getItem(OAUTH_STATE_KEY);
      // eslint-disable-next-line no-console

      if (!savedState || savedState !== state) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Nettoyer le state
      localStorage.removeItem(OAUTH_STATE_KEY);

      // eslint-disable-next-line no-console

      // Vérifier que l'URL est configurée
      if (
        !GITHUB_CONFIG.oauthCallbackUrl ||
        GITHUB_CONFIG.oauthCallbackUrl.includes('your-project')
      ) {
        throw new Error(
          'Edge Function URL not configured. Check VITE_SUPABASE_FUNCTIONS_URL in .env.local'
        );
      }

      // Appeler la Supabase Edge Function pour échanger le code
      // Note: Edge Function est déployée avec --no-verify-jwt (pas besoin d'auth)
      const response = await fetch(GITHUB_CONFIG.oauthCallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      // eslint-disable-next-line no-console

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Edge Function error: ${error}`);
      }

      const data = await response.json();

      if (!data.success || !data.token || !data.user) {
        throw new Error(data.error || 'Failed to get token from Edge Function');
      }

      const user: GitHubUser = {
        login: data.user.login,
        name: data.user.name || data.user.login,
        email: data.user.email || '',
        avatarUrl: data.user.avatar_url,
      };

      // Stocker le token et user info
      localStorage.setItem(GITHUB_TOKEN_KEY, data.token);
      localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(user));

      // eslint-disable-next-line no-console

      return { success: true, user };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[GitHubAuth] OAuth callback failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during OAuth callback',
      };
    }
  }

  /**
   * Vérifie si on revient d'un OAuth callback
   * Retourne le code et state si présents dans l'URL
   */
  // eslint-disable-next-line class-methods-use-this
  checkOAuthCallback(): { code: string; state: string } | null {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      return { code, state };
    }

    return null;
  }

  /**
   * Nettoie les paramètres OAuth de l'URL après traitement
   */
  // eslint-disable-next-line class-methods-use-this
  cleanOAuthParams(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, document.title, url.toString());
  }
}

// Singleton instance
export const gitHubAuthService = new GitHubAuthService();
