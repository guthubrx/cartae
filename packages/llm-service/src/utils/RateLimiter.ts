/**
 * Rate Limiter - Limite le nombre de requêtes par période
 *
 * Implémentation Token Bucket algorithm
 */

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillIntervalMs: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Vérifie si une requête est autorisée
   */
  async checkLimit(): Promise<boolean> {
    this.refill();
    return this.tokens > 0;
  }

  /**
   * Incrémente le compteur (consomme 1 token)
   */
  increment(): void {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
    }
  }

  /**
   * Rempli le bucket de tokens si l'intervalle est écoulé
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.refillIntervalMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }

  /**
   * Obtient le temps restant avant reset (ms)
   */
  getResetTime(): number {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    return Math.max(0, this.refillIntervalMs - elapsed);
  }

  /**
   * Obtient le nombre de tokens restants
   */
  getRemainingTokens(): number {
    this.refill();
    return this.tokens;
  }
}
