/**
 * Cartae - Cache Decorator
 * Session 81c - Redis Cache + Queue
 *
 * Décorateur TypeScript pour automatiser le caching de méthodes
 * Pattern: Cache-Aside (Read-Through + Write-Through)
 *
 * Usage:
 *   @Cacheable({ ttl: 300, keyPrefix: 'user' })
 *   async getUser(id: string) { ... }
 */

import { RedisClient, getRedisClient } from './RedisClient';

export interface CacheOptions {
  /**
   * TTL en secondes (default: 300 = 5 min)
   */
  ttl?: number;

  /**
   * Préfixe pour la clé cache
   * Clé finale: `${keyPrefix}:${...args}`
   */
  keyPrefix?: string;

  /**
   * Custom key generator (override default)
   */
  keyGenerator?: (...args: any[]) => string;

  /**
   * Condition pour mettre en cache (default: always true)
   */
  condition?: (...args: any[]) => boolean;

  /**
   * Custom Redis client (default: singleton)
   */
  client?: RedisClient;
}

/**
 * Décorateur @Cacheable pour méthodes async
 *
 * Exemple:
 *   @Cacheable({ ttl: 600, keyPrefix: 'product' })
 *   async getProduct(id: string): Promise<Product> {
 *     return await db.products.findOne({ id });
 *   }
 *
 *   // 1er appel → DB query + cache write
 *   // 2ème appel → cache hit (no DB)
 */
export function Cacheable(options: CacheOptions = {}) {
  const {
    ttl = 300,
    keyPrefix = '',
    keyGenerator,
    condition,
    client,
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Check condition (si false, skip cache)
      if (condition && !condition(...args)) {
        return await originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = keyGenerator
        ? keyGenerator(...args)
        : generateKey(keyPrefix, propertyKey, args);

      // Get Redis client
      const redis = client || getRedisClient();

      try {
        // Try cache first (cache-aside read)
        const cached = await redis.get(cacheKey);

        if (cached !== null) {
          console.log(`[Cache] HIT: ${cacheKey}`);
          return cached;
        }

        console.log(`[Cache] MISS: ${cacheKey}`);

        // Cache miss → execute original method
        const result = await originalMethod.apply(this, args);

        // Write to cache (fire-and-forget)
        redis.set(cacheKey, result, ttl).catch((err) => {
          console.error(`[Cache] Write error for ${cacheKey}:`, err);
        });

        return result;
      } catch (error) {
        console.error(`[Cache] Error for ${cacheKey}:`, error);
        // Fallback to original method on error
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Décorateur @CacheEvict pour invalider cache
 *
 * Exemple:
 *   @CacheEvict({ keyPrefix: 'user' })
 *   async updateUser(id: string, data: UserData) {
 *     await db.users.update({ id }, data);
 *   }
 *
 *   // Après update → cache invalidé automatiquement
 */
export function CacheEvict(options: CacheOptions = {}) {
  const {
    keyPrefix = '',
    keyGenerator,
    client,
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Execute original method first
      const result = await originalMethod.apply(this, args);

      // Evict cache after success
      const cacheKey = keyGenerator
        ? keyGenerator(...args)
        : generateKey(keyPrefix, propertyKey, args);

      const redis = client || getRedisClient();

      redis.del(cacheKey).catch((err) => {
        console.error(`[Cache] Evict error for ${cacheKey}:`, err);
      });

      console.log(`[Cache] EVICT: ${cacheKey}`);

      return result;
    };

    return descriptor;
  };
}

/**
 * Décorateur @CachePut pour forcer écriture cache
 *
 * Exemple:
 *   @CachePut({ ttl: 600, keyPrefix: 'user' })
 *   async createUser(data: UserData): Promise<User> {
 *     const user = await db.users.create(data);
 *     return user; // Cached automatiquement
 *   }
 */
export function CachePut(options: CacheOptions = {}) {
  const {
    ttl = 300,
    keyPrefix = '',
    keyGenerator,
    client,
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Write to cache (fire-and-forget)
      const cacheKey = keyGenerator
        ? keyGenerator(...args)
        : generateKey(keyPrefix, propertyKey, args);

      const redis = client || getRedisClient();

      redis.set(cacheKey, result, ttl).catch((err) => {
        console.error(`[Cache] Put error for ${cacheKey}:`, err);
      });

      console.log(`[Cache] PUT: ${cacheKey}`);

      return result;
    };

    return descriptor;
  };
}

/**
 * Generate cache key from method name + args
 */
function generateKey(prefix: string, method: string, args: any[]): string {
  // Serialize args to stable string
  const argsKey = args
    .map((arg) => {
      if (typeof arg === 'object') {
        // Sort object keys for stable serialization
        return JSON.stringify(arg, Object.keys(arg).sort());
      }
      return String(arg);
    })
    .join(':');

  const parts = [prefix, method, argsKey].filter(Boolean);
  return parts.join(':');
}

/**
 * Helper function pour générer clé custom
 */
export function createKeyGenerator(
  template: string,
  ...paramNames: string[]
): (...args: any[]) => string {
  return (...args: any[]) => {
    let key = template;

    paramNames.forEach((name, index) => {
      const placeholder = `{${name}}`;
      const value = args[index];

      key = key.replace(
        placeholder,
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      );
    });

    return key;
  };
}

/**
 * Exemple usage avec custom key generator:
 *
 * const userKeyGen = createKeyGenerator('user:{id}', 'id');
 *
 * @Cacheable({ ttl: 600, keyGenerator: userKeyGen })
 * async getUser(id: string) {
 *   // Key sera: "user:123"
 * }
 */
