/**
 * @cartae/auth
 * Security Layer pour Cartae
 * - JWT Authentication (RS256)
 * - RBAC (4 roles: admin, power_user, user, guest)
 * - Audit Trail (logging opérations sensibles)
 * - Plugin Permissions (isolation & quotas)
 */

// Types
export * from './types';

// JWT
export { JWTService, generateRSAKeyPair } from './jwt/JWTService';

// RBAC
export { RBACService } from './rbac/RBACService';

// Audit
export { AuditService } from './audit/AuditService';
export type { AuditStorage, AuditLogFilters } from './audit/AuditService';
