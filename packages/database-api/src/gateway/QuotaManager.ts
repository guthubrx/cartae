/**
 * QuotaManager - API Quota Management
 * Session 81h - API Gateway & Rate Limiting
 *
 * API REST pour gérer quotas plugins:
 * - GET /api/quotas/:pluginId - Récupérer quota restant
 * - POST /api/quotas/:pluginId/reset - Reset quota (admin only)
 * - GET /api/quotas/:pluginId/stats - Statistiques usage
 * - GET /api/quotas/:pluginId/consumers - Top consumers
 *
 * Utilisé par:
 * 1. Traefik ForwardAuth middleware (vérification quotas)
 * 2. Dashboard admin (monitoring quotas)
 * 3. Plugins (afficher quota restant aux users)
 * 4. Alerting (webhooks si quota > 80%)
 *
 * Architecture:
 * - Express.js router
 * - RateLimiter backend (Redis sliding window)
 * - JWT authentication (extract userId)
 * - Prometheus metrics
 * - Webhook alerts (quota exceeded)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { RateLimiter, QuotaConfig, QuotaStats } from './RateLimiter';
import { Logger } from '../utils/logger';
import { PrometheusMetrics } from '../utils/prometheus';
import { authenticateJWT, requireAdmin } from '../middleware/auth';

// ==============================================================================
// TYPES
// ==============================================================================

/**
 * Request avec user authentifié
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'admin' | 'user';
    email: string;
  };
}

/**
 * Response quota check (ForwardAuth)
 */
export interface QuotaCheckResponse {
  /**
   * Quota allowed?
   */
  allowed: boolean;

  /**
   * Requêtes restantes
   */
  remaining: number;

  /**
   * Timestamp reset (ISO 8601)
   */
  resetAt: string;

  /**
   * Limite totale
   */
  limit: number;

  /**
   * Message erreur (si denied)
   */
  message?: string;
}

/**
 * Configuration webhook
 */
export interface WebhookConfig {
  /**
   * URL webhook (ex: Slack, Discord, Teams)
   */
  url: string;

  /**
   * Seuil déclenchement (0-100)
   */
  threshold: number;

  /**
   * Headers custom (ex: Authorization)
   */
  headers?: Record<string, string>;
}

// ==============================================================================
// QUOTA MANAGER
// ==============================================================================

export class QuotaManager {
  private readonly logger: Logger;
  private readonly metrics: PrometheusMetrics;
  private readonly router: Router;

  /**
   * Cache quotas configs (éviter DB lookup à chaque requête)
   * Key: pluginId, Value: QuotaConfig
   */
  private readonly quotaCache = new Map<string, QuotaConfig>();

  /**
   * Webhooks configs par plugin
   * Key: pluginId, Value: WebhookConfig[]
   */
  private readonly webhooks = new Map<string, WebhookConfig[]>();

  constructor(private readonly rateLimiter: RateLimiter) {
    this.logger = new Logger('QuotaManager');
    this.metrics = new PrometheusMetrics();
    this.router = this.createRouter();
  }

  // ----------------------------------------------------------------------------
  // ROUTER SETUP
  // ----------------------------------------------------------------------------

  /**
   * Créer Express router avec toutes les routes
   */
  private createRouter(): Router {
    const router = Router();

    // Quota check (ForwardAuth pour Traefik)
    router.post(
      '/quota-check',
      authenticateJWT,
      this.handleQuotaCheck.bind(this)
    );

    // Get quota restant (public, nécessite auth)
    router.get(
      '/quotas/:pluginId',
      authenticateJWT,
      this.handleGetQuota.bind(this)
    );

    // Get stats quota (admin only)
    router.get(
      '/quotas/:pluginId/stats',
      authenticateJWT,
      requireAdmin,
      this.handleGetStats.bind(this)
    );

    // Get top consumers (admin only)
    router.get(
      '/quotas/:pluginId/consumers',
      authenticateJWT,
      requireAdmin,
      this.handleGetConsumers.bind(this)
    );

    // Reset quota (admin only)
    router.post(
      '/quotas/:pluginId/reset',
      authenticateJWT,
      requireAdmin,
      this.handleResetQuota.bind(this)
    );

    // Health check
    router.get('/health', this.handleHealthCheck.bind(this));

    // Error handler
    router.use(this.handleError.bind(this));

    return router;
  }

  /**
   * Get Express router
   */
  public getRouter(): Router {
    return this.router;
  }

  // ----------------------------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------------------------

  /**
   * POST /api/gateway/quota-check
   * ForwardAuth endpoint pour Traefik
   *
   * Headers requis:
   * - Authorization: Bearer <jwt>
   * - X-Plugin-Id: <plugin_id>
   *
   * Response:
   * - 200 OK: Quota OK, continuer requête
   * - 429 Too Many Requests: Quota exceeded, bloquer requête
   * - 500 Internal Server Error: Redis down, fail open (allow)
   *
   * Headers response:
   * - X-RateLimit-Limit: <limit>
   * - X-RateLimit-Remaining: <remaining>
   * - X-RateLimit-Reset: <timestamp unix>
   * - Retry-After: <seconds> (si 429)
   */
  private async handleQuotaCheck(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Extract plugin ID (header X-Plugin-Id ou query param)
      const pluginId =
        req.headers['x-plugin-id']?.toString() || req.query.pluginId?.toString();

      if (!pluginId) {
        res.status(400).json({ error: 'Missing plugin ID' });
        return;
      }

      // Extract user ID (JWT)
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get quota config (cache ou DB)
      const quota = await this.getQuotaConfig(pluginId);

      // Check quota
      const result = await this.rateLimiter.checkQuota(pluginId, userId, quota);

      // Headers rate limit
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000));

      if (!result.allowed) {
        // DENY - Quota exceeded
        const retryAfter = Math.ceil(
          (result.resetAt.getTime() - Date.now()) / 1000
        );
        res.setHeader('Retry-After', retryAfter);

        // Metrics
        this.metrics.incrementCounter('cartae_quota_denied_total', {
          plugin_id: pluginId,
        });

        // Alert webhook (si configured)
        await this.triggerWebhook(pluginId, userId, result.current, result.limit);

        res.status(429).json({
          allowed: false,
          remaining: 0,
          resetAt: result.resetAt.toISOString(),
          limit: result.limit,
          message: `Quota exceeded: ${result.limit} requests per ${quota.window / 3600} hour(s)`,
        } as QuotaCheckResponse);
        return;
      }

      // ALLOW - Quota OK
      this.metrics.incrementCounter('cartae_quota_allowed_total', {
        plugin_id: pluginId,
      });

      res.status(200).json({
        allowed: true,
        remaining: result.remaining,
        resetAt: result.resetAt.toISOString(),
        limit: result.limit,
      } as QuotaCheckResponse);
    } catch (error) {
      // Redis error → Fail open (allow request)
      this.logger.error(`Quota check error: ${error}`);

      // Metrics
      this.metrics.incrementCounter('cartae_quota_errors_total');

      // Fail open (graceful degradation)
      res.status(200).json({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 3600000).toISOString(),
        limit: 1000,
      } as QuotaCheckResponse);
    }
  }

  /**
   * GET /api/quotas/:pluginId
   * Récupérer quota restant (sans incrémenter)
   *
   * Response:
   * {
   *   pluginId: "plugin-1",
   *   userId: "user-1",
   *   consumed: 75,
   *   remaining: 25,
   *   limit: 100,
   *   usagePercent: 75,
   *   resetAt: "2025-11-15T22:00:00Z"
   * }
   */
  private async handleGetQuota(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { pluginId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const quota = await this.getQuotaConfig(pluginId);
      const stats = await this.rateLimiter.getQuotaStats(pluginId, userId, quota);

      res.json(stats);
    } catch (error) {
      this.logger.error(`Get quota error: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/quotas/:pluginId/stats
   * Statistiques usage plugin (admin only)
   *
   * Response:
   * {
   *   pluginId: "plugin-1",
   *   totalUsers: 150,
   *   activeUsers: 75,  // Users avec requests dans fenêtre actuelle
   *   totalRequests: 5432,
   *   averageUsagePercent: 45,
   *   topConsumers: [...]
   * }
   */
  private async handleGetStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { pluginId } = req.params;
      const quota = await this.getQuotaConfig(pluginId);

      // Get all users stats
      const allStats = await this.rateLimiter.getPluginQuotaStats(pluginId, quota);

      // Calcul aggregates
      const activeUsers = allStats.filter((s) => s.consumed > 0).length;
      const totalRequests = allStats.reduce((sum, s) => sum + s.consumed, 0);
      const averageUsagePercent =
        allStats.length > 0
          ? Math.round(
              allStats.reduce((sum, s) => sum + s.usagePercent, 0) / allStats.length
            )
          : 0;

      // Top 10 consumers
      const topConsumers = allStats.slice(0, 10);

      res.json({
        pluginId,
        totalUsers: allStats.length,
        activeUsers,
        totalRequests,
        averageUsagePercent,
        topConsumers,
      });
    } catch (error) {
      this.logger.error(`Get stats error: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/quotas/:pluginId/consumers?threshold=80
   * Top consumers (usage > threshold)
   *
   * Query params:
   * - threshold: Seuil usage (default: 80)
   *
   * Response: QuotaStats[]
   */
  private async handleGetConsumers(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { pluginId } = req.params;
      const threshold = parseInt(req.query.threshold?.toString() || '80', 10);

      const quota = await this.getQuotaConfig(pluginId);
      const consumers = await this.rateLimiter.getTopConsumers(
        pluginId,
        threshold,
        quota
      );

      res.json(consumers);
    } catch (error) {
      this.logger.error(`Get consumers error: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/quotas/:pluginId/reset
   * Reset quota (admin only)
   *
   * Body:
   * {
   *   userId: "user-1"  // Optionnel, si absent = reset tous users
   * }
   */
  private async handleResetQuota(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { pluginId } = req.params;
      const { userId } = req.body;

      if (userId) {
        // Reset quota pour un user spécifique
        await this.rateLimiter.resetQuota(pluginId, userId);
        this.logger.info(`Quota reset by admin: ${pluginId}/${userId}`);
      } else {
        // Reset quota pour tous les users du plugin
        const allStats = await this.rateLimiter.getPluginQuotaStats(pluginId);
        await Promise.all(
          allStats.map((s) => this.rateLimiter.resetQuota(pluginId, s.userId))
        );
        this.logger.info(`Quota reset for all users: ${pluginId} (${allStats.length} users)`);
      }

      res.json({ success: true });
    } catch (error) {
      this.logger.error(`Reset quota error: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/gateway/health
   * Health check (Redis + API)
   */
  private async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const redisHealthy = await this.rateLimiter.healthCheck();

      if (!redisHealthy) {
        res.status(503).json({
          status: 'unhealthy',
          redis: 'down',
        });
        return;
      }

      res.json({
        status: 'healthy',
        redis: 'up',
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: String(error),
      });
    }
  }

  /**
   * Error handler
   */
  private handleError(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    this.logger.error(`Unhandled error: ${error.message}`, {
      stack: error.stack,
      url: req.url,
    });

    this.metrics.incrementCounter('cartae_quota_manager_errors_total');

    res.status(500).json({
      error: 'Internal server error',
    });
  }

  // ----------------------------------------------------------------------------
  // QUOTA CONFIG
  // ----------------------------------------------------------------------------

  /**
   * Récupérer config quota pour un plugin
   *
   * 1. Check cache (in-memory)
   * 2. Si pas en cache → Query DB
   * 3. Si pas en DB → Use default
   * 4. Cache résultat (TTL 5min)
   *
   * @param pluginId - ID plugin
   * @returns QuotaConfig
   */
  private async getQuotaConfig(pluginId: string): Promise<QuotaConfig> {
    // Check cache
    if (this.quotaCache.has(pluginId)) {
      return this.quotaCache.get(pluginId)!;
    }

    // TODO: Query DB (plugins table, column quota_config)
    // const config = await db.plugins.findOne({ id: pluginId }, 'quota_config');

    // Fallback: Default quota (free tier)
    const defaultConfig: QuotaConfig = {
      limit: 100,
      window: 3600,
      tier: 'free',
    };

    // Cache (TTL 5min)
    this.quotaCache.set(pluginId, defaultConfig);
    setTimeout(() => this.quotaCache.delete(pluginId), 5 * 60 * 1000);

    return defaultConfig;
  }

  /**
   * Update quota config pour un plugin
   *
   * @param pluginId - ID plugin
   * @param config - Nouvelle config
   */
  public async setQuotaConfig(
    pluginId: string,
    config: QuotaConfig
  ): Promise<void> {
    // Update cache
    this.quotaCache.set(pluginId, config);

    // TODO: Update DB
    // await db.plugins.update({ id: pluginId }, { quota_config: config });

    this.logger.info(`Quota config updated: ${pluginId}`, config);
  }

  // ----------------------------------------------------------------------------
  // WEBHOOKS
  // ----------------------------------------------------------------------------

  /**
   * Déclencher webhook si quota > threshold
   *
   * @param pluginId - ID plugin
   * @param userId - ID user
   * @param current - Requêtes consommées
   * @param limit - Limite totale
   */
  private async triggerWebhook(
    pluginId: string,
    userId: string,
    current: number,
    limit: number
  ): Promise<void> {
    try {
      const webhooks = this.webhooks.get(pluginId) || [];
      const usagePercent = (current / limit) * 100;

      for (const webhook of webhooks) {
        if (usagePercent >= webhook.threshold) {
          // Send webhook (async, no await)
          this.sendWebhook(webhook, {
            pluginId,
            userId,
            current,
            limit,
            usagePercent: Math.round(usagePercent),
          }).catch((error) => {
            this.logger.error(`Webhook failed: ${error}`, { webhook });
          });
        }
      }
    } catch (error) {
      // Ne pas bloquer requête si webhook fail
      this.logger.error(`Trigger webhook error: ${error}`);
    }
  }

  /**
   * Envoyer webhook HTTP POST
   */
  private async sendWebhook(
    webhook: WebhookConfig,
    data: {
      pluginId: string;
      userId: string;
      current: number;
      limit: number;
      usagePercent: number;
    }
  ): Promise<void> {
    const payload = {
      event: 'quota_exceeded',
      timestamp: new Date().toISOString(),
      data,
    };

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...webhook.headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    this.logger.debug(`Webhook sent: ${webhook.url}`, data);
  }

  /**
   * Configurer webhook pour un plugin
   *
   * @param pluginId - ID plugin
   * @param config - Config webhook
   */
  public addWebhook(pluginId: string, config: WebhookConfig): void {
    const existing = this.webhooks.get(pluginId) || [];
    existing.push(config);
    this.webhooks.set(pluginId, existing);

    this.logger.info(`Webhook added: ${pluginId}`, config);
  }

  /**
   * Supprimer webhook
   */
  public removeWebhook(pluginId: string, url: string): void {
    const existing = this.webhooks.get(pluginId) || [];
    const filtered = existing.filter((w) => w.url !== url);
    this.webhooks.set(pluginId, filtered);

    this.logger.info(`Webhook removed: ${pluginId} (${url})`);
  }
}

// ==============================================================================
// FACTORY
// ==============================================================================

/**
 * Créer QuotaManager instance
 *
 * @param rateLimiter - RateLimiter instance
 * @returns QuotaManager instance
 */
export function createQuotaManager(rateLimiter: RateLimiter): QuotaManager {
  return new QuotaManager(rateLimiter);
}
