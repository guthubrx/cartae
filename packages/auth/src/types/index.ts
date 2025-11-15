/**
 * @cartae/auth - Types
 * Définit tous les types TypeScript pour le système de sécurité
 */

import { z } from 'zod';

// ============================================================================
// User & Authentication Types
// ============================================================================

export type UserRole = 'admin' | 'power_user' | 'user' | 'guest';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

// ============================================================================
// JWT Token Types
// ============================================================================

export interface JWTPayload {
  sub: string;        // User ID
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat: number;        // Issued at
  exp: number;        // Expires at
  jti: string;        // JWT ID (pour blacklist)
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // Secondes avant expiration access token
}

export interface JWTConfig {
  accessTokenExpiry: string;   // Ex: '15m'
  refreshTokenExpiry: string;  // Ex: '7d'
  issuer: string;
  audience: string;
}

// ============================================================================
// RBAC Permission Types
// ============================================================================

export type Permission =
  // Database
  | 'database.read'
  | 'database.write'
  | 'database.delete'
  | 'database.admin'
  // Vault
  | 'vault.read'
  | 'vault.write'
  | 'vault.delete'
  | 'vault.admin'
  | 'vault.secrets.*'
  // Plugins
  | 'plugin.install'
  | 'plugin.uninstall'
  | 'plugin.configure'
  | 'plugin.view'
  | 'plugin.permissions.grant'
  | 'plugin.permissions.revoke'
  // Users
  | 'user.create'
  | 'user.delete'
  | 'user.assign_role'
  | 'user.view'
  | 'user.deactivate'
  // System
  | 'system.settings'
  | 'system.backup'
  | 'system.restore'
  | 'system.logs'
  | 'system.monitoring';

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

// ============================================================================
// Audit Log Types
// ============================================================================

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

export interface CreateAuditLogParams {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

// ============================================================================
// Plugin Permission Types
// ============================================================================

export type PluginPermissionType = 'storage' | 'network' | 'vault' | 'system';

export interface PluginPermission {
  pluginId: string;
  permission: string;
  permissionType: PluginPermissionType;
  description?: string;
}

export interface UserPluginPermission {
  userId: string;
  pluginId: string;
  permission: string;
  granted: boolean;
  grantedAt: Date;
  grantedBy?: string;
  revokedAt?: Date;
}

export interface PluginQuota {
  userId: string;
  pluginId: string;
  storageMb: number;
  apiCallsHour: number;
  maxStorageMb: number;
  maxApiCallsHour: number;
  lastReset: Date;
  updatedAt: Date;
}

// ============================================================================
// Zod Schemas (validation runtime)
// ============================================================================

export const UserRoleSchema = z.enum(['admin', 'power_user', 'user', 'guest']);

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: UserRoleSchema.optional().default('user'),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const ChangeRoleRequestSchema = z.object({
  role: UserRoleSchema,
});

export const CreateAuditLogSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  success: z.boolean().optional().default(true),
  errorMessage: z.string().optional(),
});

// ============================================================================
// Request Context (Express middleware)
// ============================================================================

export interface AuthenticatedRequest {
  user: User;
  jti: string; // JWT ID pour révocation
}

// ============================================================================
// Error Types
// ============================================================================

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTokenError';
  }
}
