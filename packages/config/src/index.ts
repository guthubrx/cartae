import type {
  AppConfig,
  RateLimitConfig,
  SecurityConfig,
  TenantTier,
  Environment,
  HttpMethod,
} from '@cartae/types';

/**
 * Configuration par défaut des rate limits
 *
 * Définit les quotas de requêtes pour l'ensemble du système.
 * Peut être overridé par tenant ou par endpoint.
 */
export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  backend: 'memory',
  defaultLimit: 100, // 100 req/min par défaut

  /**
   * Rate limits spécifiques par endpoint
   *
   * Format: `METHOD /path` → limite (req/min)
   *
   * @example
   * ```typescript
   * 'POST /api/auth/login' → 5 req/min (prévention brute force)
   * 'GET /api/data' → 200 req/min (lecture intensive)
   * ```
   */
  endpointLimits: {
    'POST /api/auth/login': 5,
    'POST /api/auth/register': 3,
    'POST /api/auth/reset-password': 3,
    'POST /api/admin/users': 10,
    'DELETE /api/admin/users/*': 5,
    'GET /api/data': 200,
    'POST /api/data': 50,
    'PUT /api/data/*': 50,
    'DELETE /api/data/*': 20,
    'POST /api/plugins/install': 5,
    'GET /api/audit/logs': 30,
    'POST /api/audit/export': 2,
  },

  /**
   * Rate limits par tier de tenant (pricing)
   *
   * Chaque tier a des quotas minute/heure différents.
   *
   * @example
   * ```typescript
   * free: 60 req/min, 1000 req/h
   * enterprise: 10000 req/min, 500000 req/h
   * ```
   */
  tierLimits: {
    free: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
    starter: {
      requestsPerMinute: 300,
      requestsPerHour: 10000,
    },
    professional: {
      requestsPerMinute: 1000,
      requestsPerHour: 50000,
    },
    enterprise: {
      requestsPerMinute: 10000,
      requestsPerHour: 500000,
    },
  },

  headerName: 'X-RateLimit-Remaining',
};

/**
 * Configuration par défaut de la sécurité
 *
 * Paramètres CORS, champs sensibles, sessions, MFA, etc.
 */
export const DEFAULT_SECURITY: SecurityConfig = {
  /**
   * Origins CORS autorisées
   *
   * Liste des domaines pouvant faire des requêtes cross-origin.
   * Utiliser '*' uniquement en dev (jamais en prod !).
   */
  corsOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://app.cartae.io',
    'https://admin.cartae.io',
  ],

  /**
   * Champs sensibles à redacter dans les logs
   *
   * Ces champs seront remplacés par '[REDACTED]' dans les logs d'audit
   * pour respecter la vie privée et la sécurité.
   *
   * @example
   * ```typescript
   * { password: 'secret123' } → { password: '[REDACTED]' }
   * ```
   */
  sensitiveFields: [
    'password',
    'passwordHash',
    'secret',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'privateKey',
    'creditCard',
    'ssn',
    'bankAccount',
  ],

  /** Timeout de session en secondes (30 minutes par défaut) */
  sessionTimeout: 1800,

  /** Nombre max de tentatives de login avant blocage */
  maxLoginAttempts: 5,

  /** Durée de blocage après échecs (15 minutes) */
  loginBlockDuration: 900,

  /** MFA obligatoire pour les admins */
  requireMfaForAdmins: true,

  /** Longueur minimale des mots de passe */
  minPasswordLength: 12,

  /**
   * Whitelist d'IPs autorisées
   *
   * Si vide, toutes les IPs sont autorisées.
   * Sinon, seules les IPs listées peuvent accéder au système.
   *
   * @example
   * ```typescript
   * ['192.168.1.*', '10.0.0.5'] → Uniquement réseau local
   * ```
   */
  ipWhitelist: [],
};

/**
 * Configurations par environnement
 *
 * Chaque environnement (dev/test/staging/prod) a des paramètres adaptés.
 */
export const ENV_CONFIGS: Record<Environment, Partial<AppConfig>> = {
  development: {
    environment: 'development',
    apiBaseUrl: 'http://localhost:8787',
    logLevel: 'debug',
    enableAuditLogs: false,
    enableMetrics: false,
    security: {
      ...DEFAULT_SECURITY,
      corsOrigins: ['*'], // Permissif en dev
      requireMfaForAdmins: false, // Facultatif en dev
      minPasswordLength: 8, // Plus court en dev
    },
    rateLimit: {
      ...DEFAULT_RATE_LIMITS,
      defaultLimit: 1000, // Très permissif en dev
    },
  },

  test: {
    environment: 'test',
    apiBaseUrl: 'http://localhost:8788',
    logLevel: 'warn',
    enableAuditLogs: false,
    enableMetrics: false,
    security: {
      ...DEFAULT_SECURITY,
      sessionTimeout: 300, // 5 min pour tests rapides
      maxLoginAttempts: 10, // Permissif pour tests
    },
    rateLimit: {
      ...DEFAULT_RATE_LIMITS,
      defaultLimit: 10000, // Pas de limitation en tests
    },
  },

  staging: {
    environment: 'staging',
    apiBaseUrl: 'https://api-staging.cartae.io',
    logLevel: 'info',
    enableAuditLogs: true,
    enableMetrics: true,
    security: DEFAULT_SECURITY,
    rateLimit: DEFAULT_RATE_LIMITS,
  },

  production: {
    environment: 'production',
    apiBaseUrl: 'https://api.cartae.io',
    logLevel: 'warn',
    enableAuditLogs: true,
    enableMetrics: true,
    security: {
      ...DEFAULT_SECURITY,
      requireMfaForAdmins: true, // MFA obligatoire en prod
    },
    rateLimit: DEFAULT_RATE_LIMITS,
  },
};

/**
 * Récupère la configuration complète pour un environnement donné
 *
 * Fusionne la config par défaut avec les overrides spécifiques à l'environnement,
 * puis applique les variables d'environnement (env vars).
 *
 * Ordre de priorité (du moins au plus prioritaire):
 * 1. Configs par défaut (DEFAULT_*)
 * 2. Config spécifique environnement (ENV_CONFIGS)
 * 3. Variables d'environnement (process.env / Cloudflare env)
 *
 * @param env - Nom de l'environnement (défaut: NODE_ENV ou 'development')
 * @returns Configuration complète de l'application
 *
 * @example
 * ```typescript
 * // En dev
 * const config = getConfig('development');
 * console.log(config.logLevel); // 'debug'
 *
 * // En prod avec override env var
 * process.env.CARTAE_LOG_LEVEL = 'error';
 * const prodConfig = getConfig('production');
 * console.log(prodConfig.logLevel); // 'error' (override)
 * ```
 */
export function getConfig(env?: string): AppConfig {
  const environment = (env || process.env.NODE_ENV || 'development') as Environment;
  const envConfig = ENV_CONFIGS[environment] || ENV_CONFIGS.development;

  // Base config (fusion defaults + env-specific)
  const baseConfig: AppConfig = {
    environment,
    apiBaseUrl: envConfig.apiBaseUrl || 'http://localhost:8787',
    logLevel: envConfig.logLevel || 'info',
    enableAuditLogs: envConfig.enableAuditLogs ?? true,
    enableMetrics: envConfig.enableMetrics ?? true,
    security: envConfig.security || DEFAULT_SECURITY,
    rateLimit: envConfig.rateLimit || DEFAULT_RATE_LIMITS,
  };

  // Apply env var overrides
  if (process.env.CARTAE_API_BASE_URL) {
    baseConfig.apiBaseUrl = process.env.CARTAE_API_BASE_URL;
  }
  if (process.env.CARTAE_LOG_LEVEL) {
    baseConfig.logLevel = process.env.CARTAE_LOG_LEVEL as any;
  }
  if (process.env.CARTAE_ENABLE_AUDIT_LOGS !== undefined) {
    baseConfig.enableAuditLogs = process.env.CARTAE_ENABLE_AUDIT_LOGS === 'true';
  }
  if (process.env.CARTAE_ENABLE_METRICS !== undefined) {
    baseConfig.enableMetrics = process.env.CARTAE_ENABLE_METRICS === 'true';
  }

  return baseConfig;
}

/**
 * Récupère le rate limit pour un endpoint spécifique
 *
 * Recherche dans l'ordre:
 * 1. Match exact: `METHOD /path/exact`
 * 2. Match wildcard: `METHOD /path/*`
 * 3. Fallback: `config.rateLimit.defaultLimit`
 *
 * @param method - Méthode HTTP (GET, POST, etc.)
 * @param path - Path de l'endpoint (/api/users/123)
 * @param config - Configuration de l'application
 * @returns Nombre de requêtes autorisées par minute
 *
 * @example
 * ```typescript
 * const limit = getEndpointRateLimit('POST', '/api/auth/login', config);
 * // → 5 req/min (endpoint sensible)
 *
 * const limit2 = getEndpointRateLimit('GET', '/api/data', config);
 * // → 200 req/min (lecture intensive)
 *
 * const limit3 = getEndpointRateLimit('GET', '/api/unknown', config);
 * // → 100 req/min (default fallback)
 * ```
 */
export function getEndpointRateLimit(
  method: HttpMethod,
  path: string,
  config: AppConfig
): number {
  const key = `${method} ${path}`;

  // 1. Match exact
  if (config.rateLimit.endpointLimits[key]) {
    return config.rateLimit.endpointLimits[key];
  }

  // 2. Match wildcard (ex: DELETE /api/users/*)
  const wildcardKey = Object.keys(config.rateLimit.endpointLimits).find((pattern) => {
    if (!pattern.includes('*')) return false;

    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '[^/]+').replace(/\//g, '\\/') + '$'
    );
    return regex.test(key);
  });

  if (wildcardKey) {
    return config.rateLimit.endpointLimits[wildcardKey];
  }

  // 3. Fallback default
  return config.rateLimit.defaultLimit;
}

/**
 * Récupère les rate limits pour un tier de tenant
 *
 * Utilisé pour appliquer des quotas différents selon le plan tarifaire.
 *
 * @param tier - Tier du tenant (free, starter, professional, enterprise)
 * @param config - Configuration de l'application
 * @returns Quotas minute/heure pour ce tier
 *
 * @example
 * ```typescript
 * const limits = getTenantRateLimit('free', config);
 * // → { requestsPerMinute: 60, requestsPerHour: 1000 }
 *
 * const enterpriseLimits = getTenantRateLimit('enterprise', config);
 * // → { requestsPerMinute: 10000, requestsPerHour: 500000 }
 * ```
 */
export function getTenantRateLimit(
  tier: TenantTier,
  config: AppConfig
): { requestsPerMinute: number; requestsPerHour: number } {
  return (
    config.rateLimit.tierLimits[tier] || {
      requestsPerMinute: config.rateLimit.defaultLimit,
      requestsPerHour: config.rateLimit.defaultLimit * 60,
    }
  );
}

/**
 * Vérifie si un nom de champ est considéré comme sensible
 *
 * Utilisé pour décider si un champ doit être redacté dans les logs.
 * La comparaison est case-insensitive.
 *
 * @param fieldName - Nom du champ à vérifier
 * @param config - Configuration de l'application
 * @returns `true` si le champ est sensible, `false` sinon
 *
 * @example
 * ```typescript
 * isSensitiveField('password', config); // true
 * isSensitiveField('PASSWORD', config); // true (case-insensitive)
 * isSensitiveField('username', config); // false
 * ```
 */
export function isSensitiveField(fieldName: string, config: AppConfig): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  return config.security.sensitiveFields.some(
    (sensitive) => sensitive.toLowerCase() === lowerFieldName
  );
}

/**
 * Redacte les champs sensibles dans un objet
 *
 * Parcourt récursivement un objet et remplace les valeurs des champs
 * sensibles par '[REDACTED]' pour les logs/audit.
 *
 * Note: Créé une copie de l'objet, ne modifie pas l'original.
 *
 * @param obj - Objet à redacter
 * @param config - Configuration de l'application
 * @returns Nouvel objet avec champs sensibles redactés
 *
 * @example
 * ```typescript
 * const user = {
 *   email: 'user@example.com',
 *   password: 'secret123',
 *   profile: {
 *     name: 'John Doe',
 *     apiKey: 'sk-1234567890'
 *   }
 * };
 *
 * const redacted = redactSensitiveFields(user, config);
 * // {
 * //   email: 'user@example.com',
 * //   password: '[REDACTED]',
 * //   profile: {
 * //     name: 'John Doe',
 * //     apiKey: '[REDACTED]'
 * //   }
 * // }
 * ```
 */
export function redactSensitiveFields(
  obj: Record<string, any>,
  config: AppConfig
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key, config)) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursion pour objets nested
      result[key] = redactSensitiveFields(value, config);
    } else if (Array.isArray(value)) {
      // Recursion pour arrays d'objets
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? redactSensitiveFields(item, config)
          : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}
