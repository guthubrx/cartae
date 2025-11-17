/**
 * Advanced Rate Limiter Middleware
 *
 * Supports multiple backends:
 * - Cloudflare KV (for Workers deployment)
 * - Redis (for traditional deployment)
 * - In-memory (for development)
 *
 * Features:
 * - Per-IP rate limiting
 * - Per-endpoint rate limiting
 * - Per-tenant rate limiting (multi-tenant support)
 * - Configurable limits and windows
 * - Automatic cleanup of expired entries
 * - Standard rate limit headers (X-RateLimit-*)
 */

import type { Context, Next } from 'hono';
import { getClientIP, getTenantID } from '@cartae/network-utils';
import type { RateLimitBackend, RateLimitEntry } from '@cartae/types';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Storage backend to use
   */
  backend?: RateLimitBackend;

  /**
   * Cloudflare KV namespace (required if backend = 'kv')
   */
  kvNamespace?: KVNamespace;

  /**
   * Redis client (required if backend = 'redis')
   */
  redisClient?: any; // Type depends on redis library used

  /**
   * Default rate limit (requests per window)
   */
  limit?: number;

  /**
   * Time window in milliseconds
   */
  windowMs?: number;

  /**
   * Enable per-endpoint limits
   */
  perEndpoint?: boolean;

  /**
   * Enable per-tenant limits (from x-tenant-id header)
   */
  perTenant?: boolean;

  /**
   * Custom limits per endpoint
   * Example: { 'POST /api/v1/plugins': 10 }
   */
  endpointLimits?: Record<string, number>;

  /**
   * Custom limits per tenant
   * Example: { 'tenant-premium': 1000 }
   */
  tenantLimits?: Record<string, number>;

  /**
   * Skip rate limiting for certain IPs
   */
  skipIPs?: string[];

  /**
   * Handler called when rate limit is exceeded
   */
  onLimitExceeded?: (c: Context, key: string) => void;
}


/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<RateLimitConfig, 'kvNamespace' | 'redisClient'>> = {
  backend: 'memory',
  limit: 100,
  windowMs: 60 * 1000, // 1 minute
  perEndpoint: false,
  perTenant: false,
  endpointLimits: {},
  tenantLimits: {},
  skipIPs: [],
  onLimitExceeded: () => {},
};

/**
 * In-memory storage (for development)
 */
class MemoryStore {
  private store = new Map<string, RateLimitEntry>();

  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetAt) {
          this.store.delete(key);
        }
      }
    }, 60 * 1000);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.resetAt) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = await this.get(key);

    if (!existing) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      await this.set(key, newEntry);
      return newEntry;
    }

    existing.count++;
    await this.set(key, existing);
    return existing;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Cloudflare KV storage
 */
class KVStore {
  constructor(private kv: KVNamespace) {}

  async get(key: string): Promise<RateLimitEntry | null> {
    const value = await this.kv.get(key, 'json');
    if (!value) return null;

    const entry = value as RateLimitEntry;

    // Check if expired
    if (Date.now() > entry.resetAt) {
      await this.kv.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    // Calculate TTL in seconds
    const ttl = Math.ceil((entry.resetAt - Date.now()) / 1000);
    await this.kv.put(key, JSON.stringify(entry), {
      expirationTtl: Math.max(ttl, 60), // Minimum 60 seconds
    });
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = await this.get(key);

    if (!existing) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      await this.set(key, newEntry);
      return newEntry;
    }

    existing.count++;
    await this.set(key, existing);
    return existing;
  }
}

/**
 * Redis storage
 */
class RedisStore {
  constructor(private redis: any) {}

  async get(key: string): Promise<RateLimitEntry | null> {
    const value = await this.redis.get(key);
    if (!value) return null;

    const entry = JSON.parse(value) as RateLimitEntry;

    // Check if expired
    if (Date.now() > entry.resetAt) {
      await this.redis.del(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    // Calculate TTL in seconds
    const ttl = Math.ceil((entry.resetAt - Date.now()) / 1000);
    await this.redis.setex(key, Math.max(ttl, 60), JSON.stringify(entry));
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = await this.get(key);

    if (!existing) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      await this.set(key, newEntry);
      return newEntry;
    }

    existing.count++;
    await this.set(key, existing);
    return existing;
  }
}

/**
 * Create storage backend
 */
function createStore(config: RateLimitConfig) {
  switch (config.backend) {
    case 'kv':
      if (!config.kvNamespace) {
        throw new Error('KV namespace is required for KV backend');
      }
      return new KVStore(config.kvNamespace);

    case 'redis':
      if (!config.redisClient) {
        throw new Error('Redis client is required for Redis backend');
      }
      return new RedisStore(config.redisClient);

    case 'memory':
    default:
      return new MemoryStore();
  }
}


/**
 * Build rate limit key
 */
function buildKey(config: RateLimitConfig, c: Context, ip: string): string {
  const parts: string[] = ['ratelimit'];

  // Add IP
  parts.push(ip);

  // Add tenant if enabled
  if (config.perTenant) {
    const tenantID = getTenantID(c.req);
    if (tenantID) {
      parts.push(`tenant:${tenantID}`);
    }
  }

  // Add endpoint if enabled
  if (config.perEndpoint) {
    const { method } = c.req;
    const { path } = c.req;
    parts.push(`${method}:${path}`);
  }

  return parts.join(':');
}

/**
 * Get limit for current request
 */
function getLimit(config: RateLimitConfig, c: Context): number {
  // Check tenant-specific limits
  if (config.perTenant) {
    const tenantID = getTenantID(c.req);
    if (tenantID && config.tenantLimits?.[tenantID]) {
      return config.tenantLimits[tenantID];
    }
  }

  // Check endpoint-specific limits
  if (config.perEndpoint) {
    const endpoint = `${c.req.method} ${c.req.path}`;
    if (config.endpointLimits?.[endpoint]) {
      return config.endpointLimits[endpoint];
    }
  }

  // Default limit
  return config.limit || DEFAULT_CONFIG.limit;
}

/**
 * Advanced Rate Limiter Middleware
 *
 * Usage:
 * ```typescript
 * // Development (in-memory)
 * app.use('*', rateLimiterAdvanced({
 *   backend: 'memory',
 *   limit: 100,
 *   windowMs: 60 * 1000,
 * }));
 *
 * // Production (Cloudflare KV)
 * app.use('*', rateLimiterAdvanced({
 *   backend: 'kv',
 *   kvNamespace: env.RATE_LIMIT_KV,
 *   limit: 1000,
 *   perEndpoint: true,
 *   endpointLimits: {
 *     'POST /api/v1/plugins': 10, // 10 req/min for plugin creation
 *     'POST /api/v1/ratings': 5,  // 5 req/min for ratings
 *   },
 * }));
 *
 * // Multi-tenant
 * app.use('*', rateLimiterAdvanced({
 *   backend: 'kv',
 *   kvNamespace: env.RATE_LIMIT_KV,
 *   perTenant: true,
 *   tenantLimits: {
 *     'tenant-free': 100,
 *     'tenant-pro': 1000,
 *     'tenant-enterprise': 10000,
 *   },
 * }));
 * ```
 */
export const rateLimiterAdvanced = (userConfig: RateLimitConfig = {}) => {
  // Merge config with defaults
  const config: RateLimitConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  // Create storage backend
  const store = createStore(config);

  return async (c: Context, next: Next) => {
    const ip = getClientIP(c.req);

    // Skip whitelisted IPs
    if (config.skipIPs?.includes(ip)) {
      return next();
    }

    // Build rate limit key
    const key = buildKey(config, c, ip);

    // Get limit for this request
    const limit = getLimit(config, c);

    // Increment counter
    const entry = await store.increment(key, config.windowMs || DEFAULT_CONFIG.windowMs);

    // Set rate limit headers
    const remaining = Math.max(0, limit - entry.count);
    const resetDate = new Date(entry.resetAt);

    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetDate.toISOString());

    // Check if limit exceeded
    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);
      c.header('Retry-After', retryAfter.toString());

      // Call custom handler if provided
      if (config.onLimitExceeded) {
        config.onLimitExceeded(c, key);
      }

      return c.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            status: 429,
            retryAfter,
            limit,
            remaining: 0,
            resetAt: resetDate.toISOString(),
          },
        },
        429
      );
    }

    await next();
  };
};

/**
 * Preset configurations
 */
export const rateLimitPresets = {
  /**
   * Development - relaxed limits
   */
  development: (): RateLimitConfig => ({
    backend: 'memory',
    limit: 1000,
    windowMs: 60 * 1000,
    perEndpoint: false,
    perTenant: false,
  }),

  /**
   * Production - strict limits
   */
  production: (kvNamespace: KVNamespace): RateLimitConfig => ({
    backend: 'kv',
    kvNamespace,
    limit: 100,
    windowMs: 60 * 1000,
    perEndpoint: true,
    perTenant: true,
    endpointLimits: {
      'POST /api/v1/plugins': 10, // Plugin creation
      'POST /api/v1/ratings': 5, // Rating submission
      'POST /api/v1/plugins/:id/report': 3, // Abuse reports
      'DELETE /api/v1/admin/*': 20, // Admin operations
    },
  }),

  /**
   * Multi-tenant - per-tenant quotas
   */
  multiTenant: (kvNamespace: KVNamespace): RateLimitConfig => ({
    backend: 'kv',
    kvNamespace,
    limit: 100, // Default for free tier
    windowMs: 60 * 1000,
    perTenant: true,
    tenantLimits: {
      'tenant-free': 100,
      'tenant-starter': 500,
      'tenant-pro': 1000,
      'tenant-enterprise': 10000,
    },
  }),
};
