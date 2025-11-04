/**
 * IOffice365AuthService - Interface pour services d'authentification Office 365
 *
 * Cette interface permet aux plugins Data Office 365 de partager
 * l'authentification fournie par le plugin de connexion.
 */

import type { TokenData } from './auth.types';

/**
 * Interface pour les services d'authentification Office 365
 */
export interface IOffice365AuthService {
  /**
   * Démarre la surveillance du storage pour nouveaux tokens
   */
  startMonitoring(): Promise<void>;

  /**
   * Arrête la surveillance
   */
  stopMonitoring(): void;

  /**
   * Récupère un token pour un service spécifique
   * @param service Type de service : 'owa', 'graph', 'sharepoint', 'teams'
   */
  getToken(service: 'owa' | 'graph' | 'sharepoint' | 'teams'): Promise<string | null>;

  /**
   * Vérifie si des tokens sont disponibles
   */
  hasTokens(): boolean;

  /**
   * Vérifie l'expiration d'un token
   */
  checkTokenExpiration(service: 'owa' | 'graph' | 'sharepoint' | 'teams'): {
    hasToken: boolean;
    isExpired: boolean;
    expiresIn?: number;
    shouldRefresh: boolean;
  };

  /**
   * Récupère tous les tokens
   */
  getAllTokens(): Map<string, TokenData>;

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean;

  /**
   * Récupère un access token par défaut (OWA)
   */
  getAccessToken(): Promise<string>;

  /**
   * Déconnecte l'utilisateur
   */
  logout(): Promise<void>;
}
