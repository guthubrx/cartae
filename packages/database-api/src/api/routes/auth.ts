/**
 * Auth Routes - Authentication + MFA
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Endpoints:
 * - POST /api/auth/register - Register new user
 * - POST /api/auth/login - Login (step 1: email/password)
 * - POST /api/auth/mfa/verify - Login (step 2: MFA token)
 * - POST /api/auth/mfa/enable - Enable MFA for current user
 * - POST /api/auth/mfa/confirm - Confirm MFA setup with first TOTP code
 * - POST /api/auth/mfa/disable - Disable MFA
 * - POST /api/auth/mfa/regenerate-backup-codes - Regenerate backup codes
 * - GET /api/auth/me - Get current user info
 *
 * @module api/routes/auth
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcrypt';
import { pool } from '../../db/client';
import { AuthenticatedRequest } from '../../middleware/permissions';
import { requireAuth } from '../../middleware/auth';
import {
  enableMFA,
  confirmMFASetup,
  disableMFA,
  verifyUserMFA,
  regenerateBackupCodes,
  getRemainingBackupCodesCount,
} from '../../services/mfa';
import { logAuditEvent } from '../../services/audit';
import { generateToken } from '../../services/jwt';
import { getUserRoles } from '../../middleware/permissions';

const router = Router();
const SALT_ROUNDS = 10;

/* ==================== Validation Schemas ==================== */

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const VerifyMFASchema = z.object({
  userId: z.string().uuid(),
  token: z.string().min(6).max(9),
});

const ConfirmMFASchema = z.object({
  token: z.string().length(6),
});

const DisableMFASchema = z.object({
  password: z.string(),
});

/* ==================== Routes ==================== */

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', async (req, res: Response) => {
  try {
    const data = RegisterSchema.parse(req.body);

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES (' + '1, ' + '2, ' + '3) RETURNING id, email, name, created_at',
      [data.email, hashedPassword, data.name || null]
    );

    const user = result.rows[0];

    res.status(201).json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to register user',
    });
  }
});

/**
 * POST /api/auth/login
 * Login step 1: verify email + password
 * Returns: user info + mfa_required boolean
 */
router.post('/login', async (req, res: Response) => {
  try {
    const data = LoginSchema.parse(req.body);

    const result = await pool.query(
      'SELECT id, email, password, mfa_enabled, is_active FROM users WHERE email = ' + '1',
      [data.email]
    );

    const user = result.rows[0];

    if (!user) {
      await logAuditEvent({
        userId: 'anonymous',
        userEmail: data.email,
        resource: 'auth',
        action: 'login_failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Account disabled' });
      return;
    }

    const passwordMatch = await bcrypt.compare(data.password, user.password);

    if (!passwordMatch) {
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        resource: 'auth',
        action: 'login_failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.mfa_enabled) {
      res.json({
        status: 'mfa_required',
        userId: user.id,
        message: 'Please provide MFA token',
      });
      return;
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ' + '1', [user.id]);

    // Generate JWT token
    const roles = await getUserRoles(user.id);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roles,
    });

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      resource: 'auth',
      action: 'login_success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        roles,
      },
      token,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to login',
    });
  }
});

/**
 * POST /api/auth/mfa/verify
 * Login step 2: verify MFA token (TOTP or backup code)
 */
router.post('/mfa/verify', async (req, res: Response) => {
  try {
    const data = VerifyMFASchema.parse(req.body);

    const isValid = await verifyUserMFA(data.userId, data.token);

    if (!isValid) {
      await logAuditEvent({
        userId: data.userId,
        userEmail: 'unknown',
        resource: 'auth',
        action: 'mfa_verify_failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(401).json({ error: 'Invalid MFA token' });
      return;
    }

    const result = await pool.query('SELECT id, email FROM users WHERE id = ' + '1', [data.userId]);
    const user = result.rows[0];

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ' + '1', [data.userId]);

    // Generate JWT token
    const roles = await getUserRoles(data.userId);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roles,
    });

    const remainingBackupCodes = await getRemainingBackupCodesCount(data.userId);

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      resource: 'auth',
      action: 'mfa_verify_success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        roles,
      },
      token,
      remainingBackupCodes,
    });
  } catch (error) {
    console.error('Error verifying MFA:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to verify MFA',
    });
  }
});

/**
 * POST /api/auth/mfa/enable
 * Enable MFA for current user (generates secret + QR code + backup codes)
 * Returns: secret, QR code, backup codes (show ONCE!)
 */
router.post('/mfa/enable', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await enableMFA(req.user.id, req.user.email);

    await logAuditEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      resource: 'auth',
      action: 'mfa_enabled',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      status: 'success',
      secret: result.secret,
      qrCode: result.qrCode,
      backupCodes: result.backupCodes,
      message: 'Scan QR code in authenticator app, then confirm with 6-digit code',
    });
  } catch (error) {
    console.error('Error enabling MFA:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to enable MFA',
    });
  }
});

/**
 * POST /api/auth/mfa/confirm
 * Confirm MFA setup by verifying first TOTP token
 */
router.post('/mfa/confirm', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = ConfirmMFASchema.parse(req.body);

    const isValid = await confirmMFASetup(req.user.id, data.token);

    if (!isValid) {
      res.status(400).json({ error: 'Invalid MFA token' });
      return;
    }

    await logAuditEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      resource: 'auth',
      action: 'mfa_confirmed',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      status: 'success',
      message: 'MFA confirmed and activated',
    });
  } catch (error) {
    console.error('Error confirming MFA:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to confirm MFA',
    });
  }
});

/**
 * POST /api/auth/mfa/disable
 * Disable MFA for current user (requires password confirmation)
 */
router.post('/mfa/disable', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = DisableMFASchema.parse(req.body);

    const result = await pool.query('SELECT password FROM users WHERE id = ' + '1', [req.user.id]);
    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(data.password, user.password);

    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    await disableMFA(req.user.id);

    await logAuditEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      resource: 'auth',
      action: 'mfa_disabled',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      status: 'success',
      message: 'MFA disabled',
    });
  } catch (error) {
    console.error('Error disabling MFA:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to disable MFA',
    });
  }
});

/**
 * POST /api/auth/mfa/regenerate-backup-codes
 * Regenerate backup codes (replaces all existing codes)
 */
router.post('/mfa/regenerate-backup-codes', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const backupCodes = await regenerateBackupCodes(req.user.id);

    await logAuditEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      resource: 'auth',
      action: 'backup_codes_regenerated',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      status: 'success',
      backupCodes,
      message: 'Save these codes in a secure location',
    });
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to regenerate backup codes',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      'SELECT id, email, name, mfa_enabled, created_at, last_login FROM users WHERE id = ' + '1',
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const remainingBackupCodes = await getRemainingBackupCodesCount(req.user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mfaEnabled: user.mfa_enabled,
        remainingBackupCodes,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    });
  }
});

export default router;
