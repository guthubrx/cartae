/**
 * RateLimiter - Redis Sliding Window Backend
 * Session 81h - API Gateway & Rate Limiting
 *
 * Implémentation sliding window rate limiting avec Redis ZSET.
 * Utilisé par QuotaManager pour enforcer quotas plugins.
 *
 * Architecture:
 * - Data structure: Redis ZSET (sorted set)
 * - Clé: rate_limit:{pluginId}:{userId}
 * - Score: timestamp Unix (secondes)
 * - Member: "timestamp-random" (unique)
 * - TTL: window duration (auto-cleanup)
 *
 * Algorithme Sliding Window:
 * 1. ZREMRANGEBYSCORE: Cleanup entrées hors fenêtre
 * 2. ZCOUNT: Compter requests dans fenêtre actuelle
 * 3. Si count >= limit → DENY (quota exceeded)
 * 4. Sinon → ZADD (ajouter request actuelle) → ALLOW
 * 5. EXPIRE: Reset TTL (auto-delete après inactivité)
 *
 * Avantages vs Fixed Window:
 * - Pas de spike en début de fenêtre (smooth distribution)
 * - Précision constante (pas de 2x limit en edge case)
 * - Adaptable (fenêtre glisse en continu)
 *
 * Performances:
 * - ZCOUNT: O(log N) où N = entries dans ZSET
 * - ZADD: O(log N)
 * - ZREMRANGEBYSCORE: O(log N + M) où M = entries supprimées
 * - Typique: N < 100 → < 1ms latency
 *
 * Métriques Prometheus:
 * - cartae_rate_limiter_checks_total{status} (counter)
 * - cartae_rate_limiter_redis_duration_seconds{operation} (histogram)
 * - cartae_rate_limiter_quota_remaining{plugin_id, user_id} (gauge)
 */

import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';
import { Logger } from '../utils/logger';
import { PrometheusMetrics } from '../utils/prometheus';

// ==============================================================================
// TYPES
// ==============================================================================

/**
 * Résultat check quota
 */
export interface RateLimitResult {
  /**
   * Quota OK? (true = allow, false = deny)
   */
  allowed: boolean;

  /**
   * Requêtes restantes dans fenêtre actuelle
   */
  remaining: number;

  /**
   * Timestamp reset quota (début prochaine fenêtre)
   */
  resetAt: Date;

  /**
   * Requêtes consommées dans fenêtre actuelle
   */
  current: number;

  /**
   * Limite configurée (requests par fenêtre)
   */
  limit: number;

  /**
   * Durée fenêtre (secondes)
   */
  window: number;
}

/**
 * Configuration quota
 */
export interface QuotaConfig {
  /**
   * Limite (requests par fenêtre)
   */
  limit: number;

  /**
   * Durée fenêtre (secondes)
   * - 3600 = 1 heure
   * - 86400 = 1 jour
   */
  window: number;

  /**
   * Tier plugin (free, premium)
   */
  tier?: 'free' | 'premium';
}

/**
 * Statistiques quota
 */
export interface QuotaStats {
  /**
   * Plugin ID
   */
  pluginId: string;

  /**
   * User ID
   */
  userId: string;

  /**
   * Requests consommées (fenêtre actuelle)
   */
  consumed: number;

  /**
   * Requests restantes
   */
  remaining: number;

  /**
   * Limite totale
   */
  limit: number;

  /**
   * Pourcentage utilisé (0-100)
   */
  usagePercent: number;

  /**
   * Timestamp reset
   */
  resetAt: Date;
}

// ==============================================================================
// RATE LIMITER
// ==============================================================================

export class RateLimiter {
  private readonly logger: Logger;
  private readonly metrics: PrometheusMetrics;

  /**
   * Quotas par défaut (tier)
   */
  private static readonly DEFAULT_QUOTAS: Record<string, QuotaConfig> = {
    free: {
      limit: 100,
      window: 3600, // 1 heure
      tier: 'free',
    },
    premium: {
      limit: 1000,
      window: 3600, // 1 heure
      tier: 'premium',
    },
  };

  constructor(
    private readonly redis: Redis,
    private readonly defaultQuota: QuotaConfig = RateLimiter.DEFAULT_QUOTAS.free
  ) {
    this.logger = new Logger('RateLimiter');
    this.metrics = new PrometheusMetrics();
  }

  // ----------------------------------------------------------------------------
  // CHECK QUOTA (Main method)
  // ----------------------------------------------------------------------------

  /**
   * Vérifie quota et enregistre request si allowed
   *
   * Workflow:
   * 1. Cleanup vieilles entrées (hors fenêtre)
   * 2. Count requests dans fenêtre actuelle
   * 3. Si count >= limit → DENY (429 Too Many Requests)
   * 4. Sinon → ZADD request actuelle → ALLOW (200 OK)
   * 5. Update métriques Prometheus
   *
   * Atomicité:
   * - Utilise pipeline Redis (atomic multi-commands)
   * - Pas de race condition entre COUNT et ADD
   *
   * @param pluginId - ID plugin
   * @param userId - ID utilisateur
   * @param quota - Config quota (default: this.defaultQuota)
   * @returns Résultat check (allowed, remaining, resetAt)
   */
  async checkQuota(
    pluginId: string,
    userId: string,
    quota: QuotaConfig = this.defaultQuota
  ): Promise<RateLimitResult> {
    const startTime = performance.now();
    const key = this.buildKey(pluginId, userId);
    const now = Math.floor(Date.now() / 1000); // Unix timestamp (secondes)
    const windowStart = now - quota.window;

    try {
      // Pipeline Redis (atomic execution)
      const pipeline = this.redis.pipeline();

      // 1. Cleanup vieilles entrées (hors fenêtre)
      pipeline.zremrangebyscore(key, 0, windowStart);

      // 2. Count requests dans fenêtre actuelle
      pipeline.zcount(key, windowStart, now);

      // Execute pipeline
      const results = await pipeline.exec();
      if (!results) {
        throw new Error('Redis pipeline failed');
      }

      // Extract count (2nd command result)
      const [, countResult] = results;
      if (countResult[0]) {
        throw countResult[0]; // Redis error
      }
      const currentCount = countResult[1] as number;

      // 3. Check limit
      if (currentCount >= quota.limit) {
        // DENY - Quota exceeded
        this.metrics.incrementCounter('cartae_rate_limiter_checks_total', {
          status: 'denied',
          plugin_id: pluginId,
        });

        this.logger.warn(
          `Quota exceeded: ${pluginId}/${userId} (${currentCount}/${quota.limit})`
        );

        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date((now + quota.window) * 1000),
          current: currentCount,
          limit: quota.limit,
          window: quota.window,
        };
      }

      // 4. ALLOW - Add request actuelle
      const member = `${now}-${Math.random().toString(36).substring(2, 15)}`;
      await this.redis
        .pipeline()
        .zadd(key, now, member)
        .expire(key, quota.window)
        .exec();

      // Metrics
      this.metrics.incrementCounter('cartae_rate_limiter_checks_total', {
        status: 'allowed',
        plugin_id: pluginId,
      });

      this.metrics.setGauge(
        'cartae_rate_limiter_quota_remaining',
        quota.limit - currentCount - 1,
        { plugin_id: pluginId, user_id: userId }
      );

      // Log (debug)
      this.logger.debug(
        `Quota OK: ${pluginId}/${userId} (${currentCount + 1}/${quota.limit})`
      );

      return {
        allowed: true,
        remaining: quota.limit - currentCount - 1,
        resetAt: new Date((now + quota.window) * 1000),
        current: currentCount + 1,
        limit: quota.limit,
        window: quota.window,
      };
    } catch (error) {
      // Redis error → Log + Fail open (allow request)
      this.logger.error(`Redis error: ${error}`, { pluginId, userId });

      this.metrics.incrementCounter('cartae_rate_limiter_errors_total', {
        plugin_id: pluginId,
      });

      // Fail open (graceful degradation)
      return {
        allowed: true,
        remaining: quota.limit,
        resetAt: new Date((now + quota.window) * 1000),
        current: 0,
        limit: quota.limit,
        window: quota.window,
      };
    } finally {
      // Metrics: Latence opération
      const duration = performance.now() - startTime;
      this.metrics.observeHistogram(
        'cartae_rate_limiter_operation_duration_seconds',
        duration / 1000,
        { operation: 'check_quota' }
      );
    }
  }

  // ----------------------------------------------------------------------------
  // GET QUOTA STATS (Read-only)
  // ----------------------------------------------------------------------------

  /**
   * Récupère statistiques quota (sans enregistrer request)
   *
   * Use case:
   * - GET /api/quotas/:pluginId (afficher quota restant)
   * - Dashboard admin (monitoring quotas)
   *
   * @param pluginId - ID plugin
   * @param userId - ID utilisateur
   * @param quota - Config quota
   * @returns Stats quota
   */
  async getQuotaStats(
    pluginId: string,
    userId: string,
    quota: QuotaConfig = this.defaultQuota
  ): Promise<QuotaStats> {
    const key = this.buildKey(pluginId, userId);
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - quota.window;

    try {
      // Cleanup + Count (sans ZADD)
      await this.redis.zremrangebyscore(key, 0, windowStart);
      const consumed = await this.redis.zcount(key, windowStart, now);

      const remaining = Math.max(0, quota.limit - consumed);
      const usagePercent = (consumed / quota.limit) * 100;

      return {
        pluginId,
        userId,
        consumed,
        remaining,
        limit: quota.limit,
        usagePercent: Math.min(100, Math.round(usagePercent)),
        resetAt: new Date((now + quota.window) * 1000),
      };
    } catch (error) {
      this.logger.error(`Failed to get quota stats: ${error}`, {
        pluginId,
        userId,
      });

      // Fallback: Quota plein (assume full usage)
      return {
        pluginId,
        userId,
        consumed: quota.limit,
        remaining: 0,
        limit: quota.limit,
        usagePercent: 100,
        resetAt: new Date((now + quota.window) * 1000),
      };
    }
  }

  // ----------------------------------------------------------------------------
  // RESET QUOTA (Admin)
  // ----------------------------------------------------------------------------

  /**
   * Reset quota (supprime toutes entrées)
   *
   * Use case:
   * - POST /api/quotas/:pluginId/reset (admin only)
   * - Debugging (quota stuck)
   * - Grace period (pardon dépassement)
   *
   * @param pluginId - ID plugin
   * @param userId - ID utilisateur
   */
  async resetQuota(pluginId: string, userId: string): Promise<void> {
    const key = this.buildKey(pluginId, userId);

    try {
      await this.redis.del(key);

      this.logger.info(`Quota reset: ${pluginId}/${userId}`);

      this.metrics.incrementCounter('cartae_rate_limiter_resets_total', {
        plugin_id: pluginId,
      });
    } catch (error) {
      this.logger.error(`Failed to reset quota: ${error}`, { pluginId, userId });
      throw error;
    }
  }

  // ----------------------------------------------------------------------------
  // BATCH OPERATIONS
  // ----------------------------------------------------------------------------

  /**
   * Récupère stats quotas pour tous users d'un plugin
   *
   * Use case:
   * - Dashboard admin (top consumers)
   * - Alertes quotas (usage > 80%)
   *
   * @param pluginId - ID plugin
   * @param quota - Config quota
   * @returns Liste stats quotas
   */
  async getPluginQuotaStats(
    pluginId: string,
    quota: QuotaConfig = this.defaultQuota
  ): Promise<QuotaStats[]> {
    try {
      // Scan toutes clés rate_limit:{pluginId}:*
      const pattern = `rate_limit:${pluginId}:*`;
      const keys = await this.scanKeys(pattern);

      // Get stats pour chaque user
      const stats = await Promise.all(
        keys.map(async (key) => {
          const userId = key.split(':')[2]; // rate_limit:{pluginId}:{userId}
          return this.getQuotaStats(pluginId, userId, quota);
        })
      );

      // Trier par usage descendant
      return stats.sort((a, b) => b.usagePercent - a.usagePercent);
    } catch (error) {
      this.logger.error(`Failed to get plugin quota stats: ${error}`, {
        pluginId,
      });
      return [];
    }
  }

  /**
   * Récupère top consumers (users avec usage > threshold)
   *
   * @param pluginId - ID plugin
   * @param threshold - Seuil usage (0-100)
   * @param quota - Config quota
   * @returns Top consumers
   */
  async getTopConsumers(
    pluginId: string,
    threshold: number = 80,
    quota: QuotaConfig = this.defaultQuota
  ): Promise<QuotaStats[]> {
    const stats = await this.getPluginQuotaStats(pluginId, quota);
    return stats.filter((s) => s.usagePercent >= threshold);
  }

  // ----------------------------------------------------------------------------
  // UTILS
  // ----------------------------------------------------------------------------

  /**
   * Build Redis key
   * Format: rate_limit:{pluginId}:{userId}
   */
  private buildKey(pluginId: string, userId: string): string {
    return `rate_limit:${pluginId}:${userId}`;
  }

  /**
   * Scan Redis keys (pattern matching)
   *
   * Utilise SCAN (cursor-based) au lieu de KEYS (blocking)
   * Safe pour production (pas de freeze Redis)
   *
   * @param pattern - Pattern Redis (ex: rate_limit:plugin-1:*)
   * @returns Liste clés matchées
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, matchedKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Health check Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// ==============================================================================
// FACTORY
// ==============================================================================

/**
 * Create RateLimiter instance
 *
 * @param redisUrl - Redis connection URL (ex: redis://localhost:6379)
 * @param defaultQuota - Quota par défaut
 * @returns RateLimiter instance
 */
export function createRateLimiter(
  redisUrl: string = 'redis://localhost:6379',
  defaultQuota?: QuotaConfig
): RateLimiter {
  const redis = new Redis(redisUrl, {
    // Connection options
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,

    // Performance
    lazyConnect: false,
    keepAlive: 30000,

    // Reconnection
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('error', (error) => {
    const logger = new Logger('Redis');
    logger.error(`Redis connection error: ${error}`);
  });

  redis.on('ready', () => {
    const logger = new Logger('Redis');
    logger.info('Redis connection ready');
  });

  return new RateLimiter(redis, defaultQuota);
}
