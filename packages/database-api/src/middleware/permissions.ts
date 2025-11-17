/**
 * RBAC Permissions Middleware
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Middleware functions to check user permissions and roles.
 * Works in conjunction with authenticate middleware (JWT verification).
 *
 * Usage:
 * - requirePermission('items', 'create') → Check specific permission
 * - requireRole('admin') → Check specific role
 * - requireAnyPermission([...]) → Check if user has ANY of the permissions
 * - requireAllPermissions([...]) → Check if user has ALL permissions
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { pool } from '../db/client';

/**
 * Extended Request interface with user
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles?: string[];
    permissions?: Array<{ resource: string; action: string }>;
  };
}

/**
 * Interface for permission check result
 */
interface PermissionCheck {
  hasPermission: boolean;
  missingPermission?: string;
}

/**
 * Service: Check if user has a specific permission
 * Queries PostgreSQL to verify permission via user roles
 */
export async function checkUserPermission(
  userId: string,
  resource: string,
  action: string,
  dbPool: Pool = pool
): Promise<boolean> {
  try {
    const result = await dbPool.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1
          AND p.resource = $2
          AND p.action = $3
      ) AS has_permission
      `,
      [userId, resource, action]
    );

    return result.rows[0]?.has_permission || false;
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Service: Check if user has a specific role
 */
export async function checkUserRole(
  userId: string,
  roleName: string,
  dbPool: Pool = pool
): Promise<boolean> {
  try {
    const result = await dbPool.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND r.name = $2
      ) AS has_role
      `,
      [userId, roleName]
    );

    return result.rows[0]?.has_role || false;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

/**
 * Service: Get all roles for a user
 */
export async function getUserRoles(
  userId: string,
  dbPool: Pool = pool
): Promise<string[]> {
  try {
    const result = await dbPool.query(
      `
      SELECT r.name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
      ORDER BY r.name
      `,
      [userId]
    );

    return result.rows.map((row) => row.name);
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
}

/**
 * Service: Get all permissions for a user (via their roles)
 */
export async function getUserPermissions(
  userId: string,
  dbPool: Pool = pool
): Promise<Array<{ resource: string; action: string }>> {
  try {
    const result = await dbPool.query(
      `
      SELECT DISTINCT p.resource, p.action
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
      ORDER BY p.resource, p.action
      `,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Service: Assign role to user
 */
export async function assignRole(
  userId: string,
  roleName: string,
  assignedBy: string,
  dbPool: Pool = pool
): Promise<void> {
  try {
    await dbPool.query(
      `
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      SELECT $1, r.id, $3
      FROM roles r
      WHERE r.name = $2
      ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [userId, roleName, assignedBy]
    );
  } catch (error) {
    console.error('Error assigning role:', error);
    throw new Error(`Failed to assign role "${roleName}"`);
  }
}

/**
 * Service: Remove role from user
 */
export async function removeRole(
  userId: string,
  roleName: string,
  dbPool: Pool = pool
): Promise<void> {
  try {
    await dbPool.query(
      `
      DELETE FROM user_roles
      WHERE user_id = $1
        AND role_id = (SELECT id FROM roles WHERE name = $2)
      `,
      [userId, roleName]
    );
  } catch (error) {
    console.error('Error removing role:', error);
    throw new Error(`Failed to remove role "${roleName}"`);
  }
}

/**
 * Middleware: Require specific permission
 * Usage: router.post('/items', requirePermission('items', 'create'), createItem)
 */
export function requirePermission(resource: string, action: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Check authentication
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // Check permission
    const hasPermission = await checkUserPermission(req.user.id, resource, action);

    if (!hasPermission) {
      // Log audit event (access denied)
      await logAccessDenied(req, resource, action);

      res.status(403).json({
        error: 'Permission insuffisante',
        required: `${resource}:${action}`,
      });
      return;
    }

    // Permission granted
    next();
  };
}

/**
 * Middleware: Require specific role
 * Usage: router.get('/admin', requireRole('admin'), adminPanel)
 */
export function requireRole(roleName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const hasRole = await checkUserRole(req.user.id, roleName);

    if (!hasRole) {
      await logAccessDenied(req, 'role', roleName);

      res.status(403).json({
        error: 'Rôle insuffisant',
        required: roleName,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware: Require ANY of the specified permissions
 * Usage: requireAnyPermission([['items', 'read'], ['items', 'update']])
 */
export function requireAnyPermission(permissions: Array<[string, string]>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // Check each permission
    for (const [resource, action] of permissions) {
      const hasPermission = await checkUserPermission(req.user.id, resource, action);
      if (hasPermission) {
        // Has at least one permission → grant access
        next();
        return;
      }
    }

    // No permissions matched
    await logAccessDenied(req, 'any_permission', JSON.stringify(permissions));

    res.status(403).json({
      error: 'Permission insuffisante',
      required: permissions.map(([r, a]) => `${r}:${a}`),
    });
  };
}

/**
 * Middleware: Require ALL of the specified permissions
 * Usage: requireAllPermissions([['items', 'read'], ['items', 'update']])
 */
export function requireAllPermissions(permissions: Array<[string, string]>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // Check all permissions
    for (const [resource, action] of permissions) {
      const hasPermission = await checkUserPermission(req.user.id, resource, action);
      if (!hasPermission) {
        // Missing at least one permission → deny
        await logAccessDenied(req, `${resource}:${action}`, 'all_permissions_required');

        res.status(403).json({
          error: 'Permissions insuffisantes',
          required: permissions.map(([r, a]) => `${r}:${a}`),
          missing: `${resource}:${action}`,
        });
        return;
      }
    }

    // Has all permissions
    next();
  };
}

/**
 * Helper: Log access denied event to audit_logs
 * (Minimal implementation - full audit service in Phase 4)
 */
async function logAccessDenied(
  req: AuthenticatedRequest,
  resource: string,
  action: string
): Promise<void> {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs (
        user_id,
        user_email,
        resource,
        action,
        ip_address,
        user_agent
      )
      SELECT
        $1,
        u.email,
        $2,
        'access_denied',
        $3,
        $4
      FROM users u
      WHERE u.id = $1
      `,
      [
        req.user?.id,
        `${resource}:${action}`,
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent'],
      ]
    );
  } catch (error) {
    console.error('Error logging access denied:', error);
    // Don't throw - logging failure shouldn't block response
  }
}

/**
 * Middleware: Attach user roles and permissions to request
 * Call this AFTER authenticate middleware to enrich req.user
 * Usage: router.use(authenticate, attachUserPermissions)
 */
export async function attachUserPermissions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    // No user authenticated, skip
    next();
    return;
  }

  try {
    // Fetch roles and permissions in parallel
    const [roles, permissions] = await Promise.all([
      getUserRoles(req.user.id),
      getUserPermissions(req.user.id),
    ]);

    // Attach to req.user
    req.user.roles = roles;
    req.user.permissions = permissions;

    next();
  } catch (error) {
    console.error('Error attaching user permissions:', error);
    // Don't fail request, just proceed without enrichment
    next();
  }
}
