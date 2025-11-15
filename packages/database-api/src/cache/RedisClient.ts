/**
 * Cartae - Redis Client Wrapper
 * Session 81c - Redis Cache + Queue
 *
 * Wrapper autour de ioredis avec:
 * - Connection pooling
 * - Retry logic
 * - Namespacing keys
 * - Serialization/deserialization auto
 * - Type-safe operations
 * - Health checks
 */

import Redis, { RedisOptions, Cluster } from 'ioredis';

export interface CacheConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number | void;
  enableOfflineQueue?: boolean;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

/**
 * Redis Client Wrapper avec cache-aside pattern
 */
export class RedisClient {
  private client: Redis | Cluster;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
  };

  constructor(config: CacheConfig = {}) {
    const options: RedisOptions = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: config.keyPrefix || 'cartae:',

      // Retry strategy
      retryStrategy: config.retryStrategy || ((times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }),

      // Connection options
      enableOfflineQueue: config.enableOfflineQueue ?? true,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      lazyConnect: config.lazyConnect ?? false,

      // Timeouts
      connectTimeout: 10000,
      commandTimeout: 5000,
    };

    // Parse REDIS_URL si fourni
    if (config.url || process.env.REDIS_URL) {
      this.client = new Redis(config.url || process.env.REDIS_URL!);
    } else {
      this.client = new Redis(options);
    }

    // Event listeners
    this.client.on('connect', () => {
      console.log('[RedisClient] Connected to Redis');
    });

    this.client.on('ready', () => {
      console.log('[RedisClient] Redis ready');
    });

    this.client.on('error', (err) => {
      console.error('[RedisClient] Error:', err);
      this.stats.errors++;
    });

    this.client.on('close', () => {
      console.log('[RedisClient] Connection closed');
    });

    this.client.on('reconnecting', () => {
      console.log('[RedisClient] Reconnecting to Redis');
    });
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);

      if (value === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      // Deserialize JSON
      try {
        return JSON.parse(value) as T;
      } catch {
        // Si pas JSON, retourner tel quel
        return value as unknown as T;
      }
    } catch (error) {
      console.error('[RedisClient] get() error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache avec TTL optionnel
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      // Serialize JSON si objet
      const serialized = typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('[RedisClient] set() error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete key(s)
   */
  async del(...keys: string[]): Promise<number> {
    try {
      const deleted = await this.client.del(...keys);
      this.stats.deletes += deleted;
      return deleted;
    } catch (error) {
      console.error('[RedisClient] del() error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(...keys: string[]): Promise<number> {
    try {
      return await this.client.exists(...keys);
    } catch (error) {
      console.error('[RedisClient] exists() error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('[RedisClient] expire() error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('[RedisClient] ttl() error:', error);
      this.stats.errors++;
      return -1;
    }
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error('[RedisClient] incr() error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      console.error('[RedisClient] decr() error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get multiple keys (MGET)
   */
  async mget<T = any>(...keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(...keys);

      return values.map((value) => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }

        this.stats.hits++;

        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      });
    } catch (error) {
      console.error('[RedisClient] mget() error:', error);
      this.stats.errors++;
      return keys.map(() => null);
    } finally {
      this.updateHitRate();
    }
  }

  /**
   * Set multiple keys (MSET)
   */
  async mset(keyValues: Record<string, any>): Promise<boolean> {
    try {
      const serialized: string[] = [];

      for (const [key, value] of Object.entries(keyValues)) {
        serialized.push(key);
        serialized.push(
          typeof value === 'object' ? JSON.stringify(value) : String(value)
        );
      }

      await this.client.mset(...serialized);
      this.stats.sets += Object.keys(keyValues).length;
      return true;
    } catch (error) {
      console.error('[RedisClient] mset() error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      return await this.del(...keys);
    } catch (error) {
      console.error('[RedisClient] delPattern() error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Flush current database (DANGER!)
   */
  async flushdb(): Promise<boolean> {
    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      console.error('[RedisClient] flushdb() error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Ping Redis
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('[RedisClient] ping() error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
  }

  /**
   * Update hit rate percentage
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Get raw Redis client (pour opérations avancées)
   */
  getRawClient(): Redis | Cluster {
    return this.client;
  }
}

/**
 * Singleton instance (optionnel, pour usage global)
 */
let redisInstance: RedisClient | null = null;

export function getRedisClient(config?: CacheConfig): RedisClient {
  if (!redisInstance) {
    redisInstance = new RedisClient(config);
  }
  return redisInstance;
}

export function closeRedisClient(): Promise<void> {
  if (redisInstance) {
    const promise = redisInstance.close();
    redisInstance = null;
    return promise;
  }
  return Promise.resolve();
}
