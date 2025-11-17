/**
 * Cache Headers Middleware
 *
 * FR: Middleware pour configurer les headers HTTP de cache
 * EN: Middleware to configure HTTP cache headers
 *
 * Objectifs:
 * - Optimiser performance via cache navigateur/CDN
 * - Distinguer assets immutables vs données dynamiques
 * - Gérer revalidation avec ETag
 */

import type { Context, Next } from 'hono';

/**
 * Configuration cache
 */
export interface CacheConfig {
  /**
   * Durée maximale du cache (secondes)
   */
  maxAge?: number;

  /**
   * Cache partagé (CDN, proxy, etc.)
   * true = public, false = private (utilisateur uniquement)
   */
  public?: boolean;

  /**
   * Revalidation obligatoire après expiration
   */
  mustRevalidate?: boolean;

  /**
   * Asset immutable (jamais modifié après publication)
   */
  immutable?: boolean;
}

/**
 * Presets cache par type de contenu
 */
export const cachePresets = {
  /**
   * Données statiques (plugins metadata, configuration)
   * Cache: 1 heure, public CDN
   *
   * Utiliser pour: API /plugins, /marketplace/categories
   */
  static: (): CacheConfig => ({
    maxAge: 3600, // 1 hour
    public: true,
    mustRevalidate: false,
  }),

  /**
   * Assets immutables (bundles JS/CSS avec hash dans le nom)
   * Cache: 1 an, immutable
   *
   * Utiliser pour: /assets/*, /chunks/*, fichiers avec hash
   */
  immutable: (): CacheConfig => ({
    maxAge: 31536000, // 1 year
    public: true,
    immutable: true,
  }),

  /**
   * Données dynamiques (user data, sessions)
   * Cache: 5 min, private
   *
   * Utiliser pour: API /user/*, données changeantes
   */
  dynamic: (): CacheConfig => ({
    maxAge: 300, // 5 min
    public: false,
    mustRevalidate: true,
  }),

  /**
   * Pas de cache (auth, admin, write operations)
   *
   * Utiliser pour: /api/auth/*, /api/admin/*, POST/PUT/DELETE
   */
  noCache: (): CacheConfig => ({
    maxAge: 0,
    public: false,
    mustRevalidate: true,
  }),

  /**
   * Cache court (1 minute)
   * Pour données changeant fréquemment mais pas en temps réel
   *
   * Utiliser pour: Stats, compteurs, données quasi-temps-réel
   */
  short: (): CacheConfig => ({
    maxAge: 60, // 1 min
    public: true,
    mustRevalidate: true,
  }),
};

/**
 * Middleware cache headers
 *
 * @example
 * ```typescript
 * // Route statique (cache 1h)
 * app.get('/api/v1/plugins', cacheHeaders(cachePresets.static()), pluginRoutes);
 *
 * // Assets immutables (cache 1 an)
 * app.get('/assets/*', cacheHeaders(cachePresets.immutable()), serveStatic);
 *
 * // User data (cache 5 min, private)
 * app.get('/api/v1/user/profile', cacheHeaders(cachePresets.dynamic()), userRoutes);
 *
 * // Admin (no cache)
 * app.use('/api/v1/admin/*', cacheHeaders(cachePresets.noCache()));
 * ```
 */
export const cacheHeaders = (config: CacheConfig) => {
  return async (c: Context, next: Next) => {
    await next();

    // Construire Cache-Control header
    const parts: string[] = [];

    if (config.maxAge !== undefined) {
      parts.push(`max-age=${config.maxAge}`);
    }

    if (config.public) {
      parts.push('public');
    } else {
      parts.push('private');
    }

    if (config.mustRevalidate) {
      parts.push('must-revalidate');
    }

    if (config.immutable) {
      parts.push('immutable');
    }

    if (config.maxAge === 0) {
      parts.push('no-cache', 'no-store');
    }

    c.header('Cache-Control', parts.join(', '));

    // ETag pour revalidation conditionnelle
    // (navigateur envoie If-None-Match, serveur retourne 304 Not Modified si match)
    if (config.maxAge && config.maxAge > 0 && !config.immutable) {
      const etag = generateETag(c);
      c.header('ETag', etag);

      // Vérifier If-None-Match (requête conditionnelle)
      const ifNoneMatch = c.req.header('If-None-Match');
      if (ifNoneMatch === etag) {
        // Contenu inchangé, retourner 304 sans body
        return c.body(null, 304);
      }
    }
  };
};

/**
 * Générer ETag pour revalidation
 *
 * Stratégies possibles:
 * 1. Hash du contenu (lourd, précis)
 * 2. Timestamp + path (léger, moins précis)
 * 3. Version ID (optimal si disponible)
 *
 * Ici: Stratégie 2 (timestamp + path)
 */
function generateETag(c: Context): string {
  const path = c.req.path;
  const timestamp = new Date().toISOString().split('T')[0]; // Date uniquement (change quotidiennement)
  const hash = simpleHash(`${path}-${timestamp}`);
  return `"${hash}"`;
}

/**
 * Hash simple (non cryptographique)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Helper: Détecte si asset est immutable (hash dans le nom)
 *
 * @example
 * ```typescript
 * isImmutableAsset('/chunks/vendor-abc123.js') // true
 * isImmutableAsset('/assets/logo-456def.png') // true
 * isImmutableAsset('/index.html') // false
 * ```
 */
export function isImmutableAsset(path: string): boolean {
  // Pattern: /chunks/*, /assets/*, avec hash [a-f0-9]{6,}
  const hashPattern = /[a-f0-9]{6,}/;
  const immutableDirs = ['/chunks/', '/assets/', '/css/', '/img/', '/fonts/'];

  return immutableDirs.some((dir) => path.includes(dir)) && hashPattern.test(path);
}

/**
 * Middleware auto-cache (détection automatique du preset)
 *
 * @example
 * ```typescript
 * app.use('*', autoCacheHeaders());
 * ```
 */
export function autoCacheHeaders() {
  return async (c: Context, next: Next) => {
    const path = c.req.path;
    const method = c.req.method;

    // Pas de cache pour write operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return cacheHeaders(cachePresets.noCache())(c, next);
    }

    // Assets immutables
    if (isImmutableAsset(path)) {
      return cacheHeaders(cachePresets.immutable())(c, next);
    }

    // Admin/Auth: no cache
    if (path.includes('/admin/') || path.includes('/auth/')) {
      return cacheHeaders(cachePresets.noCache())(c, next);
    }

    // API publiques: cache court
    if (path.startsWith('/api/v1/plugins') || path.startsWith('/api/v1/marketplace')) {
      return cacheHeaders(cachePresets.static())(c, next);
    }

    // User data: cache dynamique
    if (path.includes('/user/')) {
      return cacheHeaders(cachePresets.dynamic())(c, next);
    }

    // Défaut: cache court
    return cacheHeaders(cachePresets.short())(c, next);
  };
}
