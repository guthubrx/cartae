/**
 * Users Routes - User Management with RBAC
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Endpoints:
 * - GET /api/users - List all users (requires users:read)
 * - GET /api/users/:userId - Get user details (requires users:read)
 * - POST /api/users - Create user (requires users:create)
 * - PUT /api/users/:userId - Update user (requires users:update)
 * - PUT /api/users/:userId/roles - Update user roles (requires users:manage)
 * - DELETE /api/users/:userId - Soft delete user (requires users:delete)
 *
 * All mutations are logged to audit_logs
 *
 * @module api/routes/users
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcrypt';
import { pool } from '../../db/client';
import { AuthenticatedRequest } from '../../middleware/permissions';
import { requireAuth } from '../../middleware/auth';
import {
  requirePermission,
  getUserRoles,
  assignRole,
  removeRole,
} from '../../middleware/permissions';
import { logAuditEvent } from '../../services/audit';

const router = Router();
const SALT_ROUNDS = 10;

/* ==================== Validation Schemas ==================== */

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  roles: z.array(z.string()).optional(),
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

const UpdateRolesSchema = z.object({
  roles: z.array(z.string()).min(1),
});

/* ==================== Routes ==================== */

/**
 * GET /api/users
 * List all users with their roles
 * Requires: users:read permission
 */
router.get('/', requireAuth, requirePermission('users', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const search = (req.query.search as string) || '';

    let query = `
      SELECT u.id, u.email, u.name, u.is_active, u.mfa_enabled,
             u.created_at, u.last_login,
             COALESCE(json_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      query += ' WHERE u.email ILIKE ' + paramIndex + ' OR u.name ILIKE ' + paramIndex;
      params.push('%' + search + '%');
      paramIndex++;
    }

    query += ' GROUP BY u.id, u.email, u.name, u.is_active, u.mfa_enabled, u.created_at, u.last_login';
    query += ' ORDER BY u.created_at DESC';
    query += ' LIMIT ' + paramIndex++ + ' OFFSET ' + paramIndex++;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      users: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    });
  }
});

/**
 * GET /api/users/:userId
 * Get user details with roles
 * Requires: users:read permission
 */
router.get('/:userId', requireAuth, requirePermission('users', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'SELECT id, email, name, is_active, mfa_enabled, created_at, last_login FROM users WHERE id = ' + '1',
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const roles = await getUserRoles(userId);

    res.json({
      user: {
        ...user,
        roles,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    });
  }
});

/**
 * POST /api/users
 * Create new user with optional roles
 * Requires: users:create permission
 */
router.post('/', requireAuth, requirePermission('users', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = CreateUserSchema.parse(req.body);

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES (' + '1, ' + '2, ' + '3) RETURNING id, email, name, created_at',
      [data.email, hashedPassword, data.name || null]
    );

    const newUser = result.rows[0];

    if (data.roles && data.roles.length > 0) {
      for (const roleName of data.roles) {
        await assignRole(newUser.id, roleName, req.user.id);
      }
    }

    const roles = await getUserRoles(newUser.id);

    await logAuditEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      resource: 'users',
      action: 'create',
      resourceId: newUser.id,
      newValues: {
        email: newUser.email,
        name: newUser.name,
        roles,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      status: 'success',
      user: {
        ...newUser,
        roles,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create user',
    });
  }
});

/**
 * PUT /api/users/:userId
 * Update user details
 * Requires: users:update permission
 */
router.put('/:userId', requireAuth, requirePermission('users', 'update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { userId } = req.params;
    const data = UpdateUserSchema.parse(req.body);

    const oldUserResult = await pool.query('SELECT email, name, is_active FROM users WHERE id = ' + '1', [userId]);
    const oldUser = oldUserResult.rows[0];

    if (!oldUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.email) {
      updates.push('email = ' + paramIndex++);
      params.push(data.email);
    }

    if (data.name !== undefined) {
      updates.push('name = ' + paramIndex++);
      params.push(data.name);
    }

    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
      updates.push('password = ' + paramIndex++);
      params.push(hashedPassword);
    }

    if (data.isActive !== undefined) {
      updates.push('is_active = ' + paramIndex++);
      params.push(data.isActive);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push('updated_at = NOW()');
    params.push(userId);

    const query = 'UPDATE users SET ' + updates.join(', ') + ' WHERE id = ' + paramIndex + ' RETURNING id, email, name, is_active, updated_at';

    const result = await pool.query(query, params);
    const updatedUser = result.rows[0];

    await logAuditEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      resource: 'users',
      action: 'update',
      resourceId: userId,
      oldValues: oldUser,
      newValues: {
        email: updatedUser.email,
        name: updatedUser.name,
        is_active: updatedUser.is_active,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      status: 'success',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update user',
    });
  }
});

/**
 * PUT /api/users/:userId/roles
 * Update user roles (replaces all roles)
 * Requires: users:manage permission
 */
router.put('/:userId/roles', requireAuth, requirePermission('users', 'manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { userId } = req.params;
    const data = UpdateRolesSchema.parse(req.body);

    const oldRoles = await getUserRoles(userId);

    await pool.query('DELETE FROM user_roles WHERE user_id = ' + '1', [userId]);

    for (const roleName of data.roles) {
      await assignRole(userId, roleName, req.user.id);
    }

    const newRoles = await getUserRoles(userId);

    await logAuditEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      resource: 'users',
      action: 'update_roles',
      resourceId: userId,
      oldValues: { roles: oldRoles },
      newValues: { roles: newRoles },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      status: 'success',
      roles: newRoles,
    });
  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update user roles',
    });
  }
});

/**
 * DELETE /api/users/:userId
 * Soft delete user (set is_active = FALSE)
 * Requires: users:delete permission
 */
router.delete('/:userId', requireAuth, requirePermission('users', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { userId } = req.params;

    const oldUserResult = await pool.query('SELECT email, name FROM users WHERE id = ' + '1', [userId]);
    const oldUser = oldUserResult.rows[0];

    if (!oldUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await pool.query('UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ' + '1', [userId]);

    await logAuditEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      resource: 'users',
      action: 'delete',
      resourceId: userId,
      oldValues: oldUser,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      status: 'success',
      message: 'User deactivated',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete user',
    });
  }
});

export default router;
