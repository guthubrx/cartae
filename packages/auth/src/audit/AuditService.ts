/**
 * @cartae/auth - Audit Service
 * Logging automatique de toutes les opérations sensibles
 * Stockage dans PostgreSQL avec retention 90 jours
 */

import type { AuditLog, CreateAuditLogParams } from '../types';

export interface AuditStorage {
  createLog(params: CreateAuditLogParams): Promise<AuditLog>;
  getLogs(filters?: AuditLogFilters): Promise<AuditLog[]>;
  getLogById(id: string): Promise<AuditLog | null>;
  deleteOldLogs(retentionDays: number): Promise<number>;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  constructor(private storage: AuditStorage) {}

  /**
   * Log une action (opération sensible)
   */
  async logAction(params: CreateAuditLogParams): Promise<AuditLog> {
    return this.storage.createLog({
      ...params,
      success: params.success ?? true,
    });
  }

  /**
   * Log login réussi
   */
  async logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<AuditLog> {
    return this.logAction({
      userId,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * Log login échoué
   */
  async logLoginFailed(
    email: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    return this.logAction({
      action: 'auth.login_failed',
      resourceType: 'user',
      resourceId: email,
      ipAddress,
      userAgent,
      success: false,
      errorMessage: reason,
      metadata: { email },
    });
  }

  /**
   * Log logout
   */
  async logLogout(userId: string, ipAddress?: string): Promise<AuditLog> {
    return this.logAction({
      userId,
      action: 'auth.logout',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      success: true,
    });
  }

  /**
   * Log changement de role
   */
  async logRoleChange(
    userId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    ipAddress?: string
  ): Promise<AuditLog> {
    return this.logAction({
      userId,
      action: 'user.role_changed',
      resourceType: 'user',
      resourceId: targetUserId,
      ipAddress,
      metadata: { oldRole, newRole },
      success: true,
    });
  }

  /**
   * Log création user
   */
  async logUserCreated(
    creatorId: string,
    newUserId: string,
    email: string,
    role: string,
    ipAddress?: string
  ): Promise<AuditLog> {
    return this.logAction({
      userId: creatorId,
      action: 'user.created',
      resourceType: 'user',
      resourceId: newUserId,
      ipAddress,
      metadata: { email, role },
      success: true,
    });
  }

  /**
   * Log suppression user
   */
  async logUserDeleted(
    deleterId: string,
    deletedUserId: string,
    email: string,
    ipAddress?: string
  ): Promise<AuditLog> {
    return this.logAction({
      userId: deleterId,
      action: 'user.deleted',
      resourceType: 'user',
      resourceId: deletedUserId,
      ipAddress,
      metadata: { email },
      success: true,
    });
  }

  /**
   * Log accès à un secret Vault
   */
  async logVaultAccess(
    userId: string,
    secretPath: string,
    operation: 'read' | 'write' | 'delete',
    ipAddress?: string
  ): Promise<AuditLog> {
    return this.logAction({
      userId,
      action: `vault.${operation}_secret`,
      resourceType: 'vault_secret',
      resourceId: secretPath,
      ipAddress,
      metadata: { secretPath, operation },
      success: true,
    });
  }

  /**
   * Log installation plugin
   */
  async logPluginInstall(
    userId: string,
    pluginId: string,
    ipAddress?: string
  ): Promise<AuditLog> {
    return this.logAction({
      userId,
      action: 'plugin.installed',
      resourceType: 'plugin',
      resourceId: pluginId,
      ipAddress,
      metadata: { pluginId },
      success: true,
    });
  }

  /**
   * Log désinstallation plugin
   */
  async logPluginUninstall(
    userId: string,
    pluginId: string,
    ipAddress?: string
  ): Promise<AuditLog> {
    return this.logAction({
      userId,
      action: 'plugin.uninstalled',
      resourceType: 'plugin',
      resourceId: pluginId,
      ipAddress,
      metadata: { pluginId },
      success: true,
    });
  }

  /**
   * Log permission granted à un plugin
   */
  async logPluginPermissionGranted(
    userId: string,
    pluginId: string,
    permission: string,
    ipAddress?: string
  ): Promise<AuditLog> {
    return this.logAction({
      userId,
      action: 'plugin.permission_granted',
      resourceType: 'plugin_permission',
      resourceId: `${pluginId}:${permission}`,
      ipAddress,
      metadata: { pluginId, permission },
      success: true,
    });
  }

  /**
   * Log permission révoquée d'un plugin
   */
  async logPluginPermissionRevoked(
    userId: string,
    pluginId: string,
    permission: string,
    ipAddress?: string
  ): Promise<AuditLog> {
    return this.logAction({
      userId,
      action: 'plugin.permission_revoked',
      resourceType: 'plugin_permission',
      resourceId: `${pluginId}:${permission}`,
      ipAddress,
      metadata: { pluginId, permission },
      success: true,
    });
  }

  /**
   * Récupérer les logs avec filtres
   */
  async getLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
    return this.storage.getLogs(filters);
  }

  /**
   * Récupérer un log par ID
   */
  async getLogById(id: string): Promise<AuditLog | null> {
    return this.storage.getLogById(id);
  }

  /**
   * Récupérer les logs d'un user spécifique
   */
  async getUserLogs(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.getLogs({ userId, limit });
  }

  /**
   * Récupérer les logs d'une action spécifique
   */
  async getActionLogs(action: string, limit = 100): Promise<AuditLog[]> {
    return this.getLogs({ action, limit });
  }

  /**
   * Récupérer les logs d'échec
   */
  async getFailedLogs(limit = 100): Promise<AuditLog[]> {
    return this.getLogs({ success: false, limit });
  }

  /**
   * Nettoyer les vieux logs (retention 90 jours par défaut)
   */
  async cleanupOldLogs(retentionDays = 90): Promise<number> {
    return this.storage.deleteOldLogs(retentionDays);
  }

  /**
   * Log opération système (backup, restore, etc.)
   */
  async logSystemOperation(
    userId: string,
    operation: string,
    metadata?: Record<string, any>,
    success = true,
    errorMessage?: string
  ): Promise<AuditLog> {
    return this.logAction({
      userId,
      action: `system.${operation}`,
      resourceType: 'system',
      metadata,
      success,
      errorMessage,
    });
  }
}
