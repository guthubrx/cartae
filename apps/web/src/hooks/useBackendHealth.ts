import { useState, useEffect, useCallback } from 'react';

/**
 * États possibles du backend health check (vérification état backend)
 * - checking: Vérification en cours
 * - online: Backend disponible et répond correctement
 * - offline: Backend ne répond pas ou erreur connexion
 * - error: Erreur inattendue lors de la vérification
 */
export type BackendHealthStatus = 'checking' | 'online' | 'offline' | 'error';

/**
 * État complet du health check (état santé backend)
 */
export interface BackendHealthState {
  status: BackendHealthStatus;
  error?: string;
  lastCheck?: Date;
}

/**
 * Options de configuration du hook (paramètres du hook)
 */
export interface UseBackendHealthOptions {
  /**
   * Intervalle de polling en millisecondes (vérification automatique répétée)
   * Default: 0 (pas de polling automatique)
   */
  pollInterval?: number;

  /**
   * URL du backend à vérifier
   * Default: http://localhost:3001
   */
  backendUrl?: string;
}

/**
 * Valeur de retour du hook
 */
export interface UseBackendHealthReturn {
  state: BackendHealthState;
  recheck: () => Promise<void>;
}

/**
 * Hook React pour vérifier la santé du backend (health check)
 *
 * Ce hook vérifie automatiquement que le backend est disponible au mount du composant
 * et optionnellement à intervalles réguliers (polling).
 *
 * @example
 * ```tsx
 * const { state, recheck } = useBackendHealth();
 *
 * if (state.status === 'offline') {
 *   return <BackendStatusBanner onRecheck={recheck} />;
 * }
 * ```
 *
 * @param options - Options de configuration (pollInterval, backendUrl)
 * @returns État actuel + fonction recheck manuelle
 */
export function useBackendHealth(options?: UseBackendHealthOptions): UseBackendHealthReturn {
  const { pollInterval = 0, backendUrl = 'http://localhost:3001' } = options || {};

  const [state, setState] = useState<BackendHealthState>({
    status: 'checking',
  });

  /**
   * Fonction de vérification health (vérifie endpoint /health du backend)
   *
   * Logique:
   * 1. Fetch GET /health avec timeout 5s
   * 2. Si response.ok (200-299) → online
   * 3. Si erreur réseau (CORS, timeout, etc.) → offline
   * 4. Si autre erreur → error
   */
  const checkHealth = useCallback(async () => {
    setState({ status: 'checking' });

    try {
      // AbortSignal.timeout() crée un timeout automatique pour fetch
      // Compatible avec browsers modernes (Chrome 103+, Firefox 100+, Safari 16+)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Backend répond correctement (status 200-299)
        const data = await response.json();

        setState({
          status: 'online',
          lastCheck: new Date(),
        });
      } else {
        // Backend répond mais avec erreur HTTP (4xx, 5xx)
        setState({
          status: 'offline',
          error: `HTTP ${response.status}`,
          lastCheck: new Date(),
        });
      }
    } catch (error) {
      // Erreur réseau (CORS, timeout, backend down)
      setState({
        status: 'offline',
        error: error instanceof Error ? error.message : 'Network error',
        lastCheck: new Date(),
      });
    }
  }, [backendUrl]);

  /**
   * Fonction recheck manuelle (déclenchée par bouton utilisateur)
   * Permet de retester la connexion sans recharger la page
   */
  const recheck = useCallback(async () => {
    await checkHealth();
  }, [checkHealth]);

  /**
   * Effect: Vérification initiale au mount + polling optionnel
   */
  useEffect(() => {
    // Vérification initiale
    checkHealth();

    // Polling optionnel (si pollInterval > 0)
    if (pollInterval > 0) {
      const interval = setInterval(checkHealth, pollInterval);

      // Cleanup: arrêter polling au unmount du composant
      return () => clearInterval(interval);
    }
  }, [checkHealth, pollInterval]);

  return {
    state,
    recheck,
  };
}
