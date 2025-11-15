/**
 * @cartae/auth - RBAC Service
 * Role-Based Access Control
 * Gère les permissions et vérifie les autorisations
 */

import type { User, UserRole, Permission, RolePermissions } from '../types';
import { AuthorizationError } from '../types';

// Définition complète des permissions par role (copie de la DB seed)
const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  admin: [
    // Database
    'database.read',
    'database.write',
    'database.delete',
    'database.admin',
    // Vault
    'vault.read',
    'vault.write',
    'vault.delete',
    'vault.admin',
    'vault.secrets.*',
    // Plugins
    'plugin.install',
    'plugin.uninstall',
    'plugin.configure',
    'plugin.view',
    'plugin.permissions.grant',
    'plugin.permissions.revoke',
    // Users
    'user.create',
    'user.delete',
    'user.assign_role',
    'user.view',
    'user.deactivate',
    // System
    'system.settings',
    'system.backup',
    'system.restore',
    'system.logs',
    'system.monitoring',
  ],
  power_user: [
    // Database
    'database.read',
    'database.write',
    // Vault
    'vault.read',
    'vault.write',
    // Plugins
    'plugin.install',
    'plugin.uninstall',
    'plugin.configure',
    'plugin.view',
    // Users
    'user.view',
    // System
    'system.logs',
    'system.monitoring',
  ],
  user: [
    // Database
    'database.read',
    'database.write',
    // Vault
    'vault.read',
    // Plugins
    'plugin.view',
    'plugin.configure',
  ],
  guest: [
    // Database
    'database.read',
    // Plugins
    'plugin.view',
  ],
};

export class RBACService {
  /**
   * Vérifie si un user a une permission spécifique
   */
  hasPermission(user: User, permission: Permission): boolean {
    if (!user.active) {
      return false;
    }

    const rolePermissions = ROLE_PERMISSIONS_MAP[user.role];
    return rolePermissions.includes(permission);
  }

  /**
   * Vérifie si un user a AU MOINS UNE des permissions
   */
  hasAnyPermission(user: User, permissions: Permission[]): boolean {
    return permissions.some((permission) => this.hasPermission(user, permission));
  }

  /**
   * Vérifie si un user a TOUTES les permissions
   */
  hasAllPermissions(user: User, permissions: Permission[]): boolean {
    return permissions.every((permission) => this.hasPermission(user, permission));
  }

  /**
   * Vérifie une permission et throw si refusé
   */
  requirePermission(user: User, permission: Permission): void {
    if (!this.hasPermission(user, permission)) {
      throw new AuthorizationError(
        `User ${user.email} does not have permission: ${permission}`
      );
    }
  }

  /**
   * Vérifie AU MOINS UNE permission et throw si refusé
   */
  requireAnyPermission(user: User, permissions: Permission[]): void {
    if (!this.hasAnyPermission(user, permissions)) {
      throw new AuthorizationError(
        `User ${user.email} does not have any of permissions: ${permissions.join(', ')}`
      );
    }
  }

  /**
   * Vérifie TOUTES les permissions et throw si refusé
   */
  requireAllPermissions(user: User, permissions: Permission[]): void {
    if (!this.hasAllPermissions(user, permissions)) {
      throw new AuthorizationError(
        `User ${user.email} does not have all permissions: ${permissions.join(', ')}`
      );
    }
  }

  /**
   * Retourne toutes les permissions d'un role
   */
  getRolePermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS_MAP[role];
  }

  /**
   * Retourne toutes les permissions d'un user
   */
  getUserPermissions(user: User): Permission[] {
    return this.getRolePermissions(user.role);
  }

  /**
   * Vérifie si un role A peut assigner le role B
   * Règle: Un user peut assigner uniquement des roles <= son role
   */
  canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      guest: 0,
      user: 1,
      power_user: 2,
      admin: 3,
    };

    return roleHierarchy[assignerRole] >= roleHierarchy[targetRole];
  }

  /**
   * Vérifie si un user peut assigner un role spécifique
   */
  requireCanAssignRole(user: User, targetRole: UserRole): void {
    // D'abord vérifier permission user.assign_role
    this.requirePermission(user, 'user.assign_role');

    // Ensuite vérifier hiérarchie
    if (!this.canAssignRole(user.role, targetRole)) {
      throw new AuthorizationError(
        `Role ${user.role} cannot assign role ${targetRole} (hierarchy violation)`
      );
    }
  }

  /**
   * Vérifie si une permission matche un pattern wildcard
   * Ex: 'vault.secrets.*' matche 'vault.secrets.database.postgres'
   */
  private matchesWildcard(permission: string, pattern: string): boolean {
    if (!pattern.includes('*')) {
      return permission === pattern;
    }

    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(permission);
  }

  /**
   * Vérifie si un user a une permission (avec support wildcards)
   */
  hasPermissionWildcard(user: User, permission: string): boolean {
    if (!user.active) {
      return false;
    }

    const rolePermissions = ROLE_PERMISSIONS_MAP[user.role];

    return rolePermissions.some((rolePermission) =>
      this.matchesWildcard(permission, rolePermission)
    );
  }

  /**
   * Retourne un objet avec toutes les permissions par role
   */
  getAllRolePermissions(): RolePermissions[] {
    return Object.entries(ROLE_PERMISSIONS_MAP).map(([role, permissions]) => ({
      role: role as UserRole,
      permissions,
    }));
  }

  /**
   * Vérifie si un user est admin
   */
  isAdmin(user: User): boolean {
    return user.role === 'admin';
  }

  /**
   * Require admin role
   */
  requireAdmin(user: User): void {
    if (!this.isAdmin(user)) {
      throw new AuthorizationError('Admin role required');
    }
  }
}
