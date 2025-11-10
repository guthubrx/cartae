/**
 * Utilitaire pour retry automatique sur erreurs temporaires
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 1,
  retryDelay: 2000, // 2s
  retryableStatuses: [503, 504], // Service Unavailable, Gateway Timeout
};

/**
 * Exécute une requête fetch avec retry automatique
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      // Vérifier si erreur retryable
      if (opts.retryableStatuses.includes(response.status)) {
        if (attempt < opts.maxRetries) {
          console.warn(
            `[fetchWithRetry] HTTP ${response.status} sur ${url}, retry ${attempt + 1}/${opts.maxRetries}...`
          );
          await sleep(opts.retryDelay);
          continue;
        }
        // Dernier attempt, retourner l'erreur
        return response;
      }

      // Succès ou erreur non-retryable
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxRetries) {
        console.warn(
          `[fetchWithRetry] Erreur réseau sur ${url}, retry ${attempt + 1}/${opts.maxRetries}...`
        );
        await sleep(opts.retryDelay);
        continue;
      }

      // Dernier attempt échoué
      throw lastError;
    }
  }

  // Impossible d'arriver ici
  throw lastError || new Error('Retry failed');
}

/**
 * Helper pour attendre X ms
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
