/**
 * Méthodes HTTP supportées par l'API Cartae
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Environnements d'exécution de l'application
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Rôles utilisateur dans le système RBAC
 */
export type UserRole = 'admin' | 'user' | 'guest';

/**
 * Actions d'audit pour le logging (format namespaced)
 *
 * Format: `category.action` pour faciliter le filtrage et l'analyse.
 *
 * @example
 * ```typescript
 * const action: AuditAction = 'auth.login';
 * const action2: AuditAction = 'admin.user.delete';
 * ```
 */
export type AuditAction =
  // Admin actions
  | 'admin.config.update'
  | 'admin.user.create'
  | 'admin.user.update'
  | 'admin.user.delete'
  | 'admin.user.role.change'
  | 'admin.tenant.create'
  | 'admin.tenant.delete'
  | 'admin.audit.view'
  | 'admin.audit.export'
  // Auth actions
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login.failed'
  | 'auth.mfa.enabled'
  | 'auth.mfa.disabled'
  | 'auth.password.reset'
  | 'auth.session.created'
  | 'auth.session.revoked'
  // Plugin actions
  | 'plugin.install'
  | 'plugin.uninstall'
  | 'plugin.enable'
  | 'plugin.disable'
  | 'plugin.config.update'
  // API actions
  | 'api.key.create'
  | 'api.key.revoke'
  | 'api.rate_limit.exceeded'
  // Data actions
  | 'data.create'
  | 'data.read'
  | 'data.update'
  | 'data.delete'
  | 'data.export'
  | 'data.import';

/**
 * Backend de stockage pour le rate limiting
 */
export type RateLimitBackend = 'memory' | 'kv' | 'redis';

/**
 * Codes d'erreur standardisés de l'API
 *
 * Utilisés pour identifier précisément les types d'erreurs côté client.
 */
export enum ErrorCode {
  // Auth errors (1000-1999)
  UNAUTHORIZED = 'AUTH_1000',
  FORBIDDEN = 'AUTH_1001',
  INVALID_TOKEN = 'AUTH_1002',
  TOKEN_EXPIRED = 'AUTH_1003',
  MFA_REQUIRED = 'AUTH_1004',
  INVALID_CREDENTIALS = 'AUTH_1005',
  SESSION_EXPIRED = 'AUTH_1006',

  // Rate limiting (2000-2999)
  RATE_LIMIT_EXCEEDED = 'RATE_2000',
  RATE_LIMIT_TIER_EXCEEDED = 'RATE_2001',

  // Validation errors (3000-3999)
  VALIDATION_ERROR = 'VAL_3000',
  INVALID_INPUT = 'VAL_3001',
  MISSING_FIELD = 'VAL_3002',
  INVALID_FORMAT = 'VAL_3003',

  // Resource errors (4000-4999)
  NOT_FOUND = 'RES_4000',
  ALREADY_EXISTS = 'RES_4001',
  CONFLICT = 'RES_4002',

  // Server errors (5000-5999)
  INTERNAL_ERROR = 'SRV_5000',
  DATABASE_ERROR = 'SRV_5001',
  EXTERNAL_SERVICE_ERROR = 'SRV_5002',

  // Plugin errors (6000-6999)
  PLUGIN_NOT_FOUND = 'PLG_6000',
  PLUGIN_LOAD_FAILED = 'PLG_6001',
  PLUGIN_DISABLED = 'PLG_6002',

  // Tenant errors (7000-7999)
  TENANT_NOT_FOUND = 'TNT_7000',
  TENANT_SUSPENDED = 'TNT_7001',
  TENANT_QUOTA_EXCEEDED = 'TNT_7002',
}

/**
 * Entrée de log d'audit complète
 *
 * Structure standardisée pour tous les événements d'audit du système.
 * Stockée en base de données pour traçabilité et conformité.
 *
 * @example
 * ```typescript
 * const auditLog: AuditLogEntry = {
 *   timestamp: new Date().toISOString(),
 *   action: 'auth.login',
 *   userId: 'user-123',
 *   tenantId: 'tenant-abc',
 *   ip: '203.0.113.50',
 *   userAgent: 'Mozilla/5.0...',
 *   resource: '/api/auth/login',
 *   metadata: { method: 'POST', success: true }
 * };
 * ```
 */
export interface AuditLogEntry {
  /** Timestamp ISO 8601 de l'événement */
  timestamp: string;

  /** Action effectuée (namespaced) */
  action: AuditAction;

  /** ID de l'utilisateur (null pour actions anonymes) */
  userId: string | null;

  /** ID du tenant (null pour actions globales) */
  tenantId: string | null;

  /** Adresse IP du client */
  ip: string;

  /** User-Agent du client */
  userAgent?: string;

  /** Ressource/endpoint affecté */
  resource: string;

  /** Métadonnées additionnelles (JSON flexible) */
  metadata?: Record<string, any>;

  /** Résultat de l'action (success/failure) */
  status?: 'success' | 'failure';

  /** Message d'erreur si status=failure */
  errorMessage?: string;
}

/**
 * Entrée de rate limiting (compteur)
 *
 * Stocke le nombre de requêtes effectuées et la date de reset du compteur.
 *
 * @example
 * ```typescript
 * const rateLimit: RateLimitEntry = {
 *   count: 45,
 *   resetAt: Date.now() + 60000 // Reset dans 1 minute
 * };
 * ```
 */
export interface RateLimitEntry {
  /** Nombre de requêtes dans la fenêtre actuelle */
  count: number;

  /** Timestamp (ms) de reset du compteur */
  resetAt: number;
}

/**
 * Requête HTTP authentifiée (extended request object)
 *
 * Ajoute des propriétés d'authentification/contexte à une requête HTTP standard.
 * Utilisé après passage du middleware d'authentification.
 *
 * @example
 * ```typescript
 * app.get('/protected', (req: AuthenticatedRequest, res) => {
 *   console.log(`User ${req.user.id} from tenant ${req.tenantId}`);
 * });
 * ```
 */
export interface AuthenticatedRequest {
  /** Utilisateur authentifié */
  user: {
    id: string;
    email: string;
    role: UserRole;
  };

  /** ID du tenant (multi-tenancy) */
  tenantId?: string;

  /** ID de session */
  sessionId?: string;

  /** Headers HTTP */
  headers: Record<string, string | string[] | undefined>;

  /** Méthode HTTP */
  method: HttpMethod;

  /** Path de la requête */
  path: string;
}

/**
 * Réponse API standardisée (generic wrapper)
 *
 * Enveloppe toutes les réponses API pour uniformiser le format.
 *
 * @example
 * ```typescript
 * // Success response
 * const response: ApiResponse<User> = {
 *   success: true,
 *   data: { id: '123', email: 'user@example.com' }
 * };
 *
 * // Error response
 * const errorResponse: ApiResponse<never> = {
 *   success: false,
 *   error: {
 *     code: ErrorCode.UNAUTHORIZED,
 *     message: 'Invalid token'
 *   }
 * };
 * ```
 */
export interface ApiResponse<T> {
  /** Statut de la requête */
  success: boolean;

  /** Données de la réponse (si success=true) */
  data?: T;

  /** Détails de l'erreur (si success=false) */
  error?: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
  };

  /** Métadonnées de pagination (si applicable) */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Tiers de tenant (pricing/quota)
 */
export type TenantTier = 'free' | 'starter' | 'professional' | 'enterprise';

/**
 * Configuration d'un tenant (multi-tenancy)
 *
 * Définit les limites, permissions et paramètres d'une organisation/compte.
 *
 * @example
 * ```typescript
 * const tenantConfig: TenantConfig = {
 *   id: 'tenant-abc',
 *   name: 'Acme Corp',
 *   tier: 'professional',
 *   maxUsers: 50,
 *   maxStorage: 100 * 1024 * 1024 * 1024, // 100 GB
 *   features: ['mfa', 'audit_logs', 'custom_branding'],
 *   rateLimit: {
 *     requestsPerMinute: 1000,
 *     requestsPerHour: 50000
 *   },
 *   createdAt: '2025-01-01T00:00:00Z',
 *   status: 'active'
 * };
 * ```
 */
export interface TenantConfig {
  /** ID unique du tenant */
  id: string;

  /** Nom de l'organisation */
  name: string;

  /** Tier de pricing */
  tier: TenantTier;

  /** Nombre max d'utilisateurs */
  maxUsers: number;

  /** Storage max en bytes */
  maxStorage: number;

  /** Features activées pour ce tenant */
  features: string[];

  /** Rate limits spécifiques au tenant */
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };

  /** Timestamp de création */
  createdAt: string;

  /** Timestamp de dernière mise à jour */
  updatedAt?: string;

  /** Statut du tenant */
  status: 'active' | 'suspended' | 'trial' | 'expired';

  /** Métadonnées personnalisées */
  metadata?: Record<string, any>;
}

/**
 * Configuration de sécurité globale
 */
export interface SecurityConfig {
  /** Origins CORS autorisées */
  corsOrigins: string[];

  /** Champs considérés comme sensibles (à redacter dans les logs) */
  sensitiveFields: string[];

  /** Timeout de session en secondes */
  sessionTimeout: number;

  /** Nombre max de tentatives de login avant blocage */
  maxLoginAttempts: number;

  /** Durée de blocage après max attempts (secondes) */
  loginBlockDuration: number;

  /** Activer MFA pour tous les admins */
  requireMfaForAdmins: boolean;

  /** Longueur minimale des mots de passe */
  minPasswordLength: number;

  /** Whitelist d'IPs (vide = pas de restriction) */
  ipWhitelist: string[];
}

/**
 * Configuration de rate limiting
 */
export interface RateLimitConfig {
  /** Backend de stockage */
  backend: RateLimitBackend;

  /** Limite par défaut (requêtes par minute) */
  defaultLimit: number;

  /** Limites par endpoint */
  endpointLimits: Record<string, number>;

  /** Limites par tier de tenant */
  tierLimits: Record<TenantTier, {
    requestsPerMinute: number;
    requestsPerHour: number;
  }>;

  /** Header HTTP pour communiquer le quota restant */
  headerName: string;
}

/**
 * Configuration complète de l'application
 */
export interface AppConfig {
  /** Environnement d'exécution */
  environment: Environment;

  /** Configuration de sécurité */
  security: SecurityConfig;

  /** Configuration de rate limiting */
  rateLimit: RateLimitConfig;

  /** URL de base de l'API */
  apiBaseUrl: string;

  /** Niveau de logging */
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  /** Activer les logs d'audit */
  enableAuditLogs: boolean;

  /** Activer les métriques */
  enableMetrics: boolean;
}
