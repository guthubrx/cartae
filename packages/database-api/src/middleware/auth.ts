/**
 * Auth Middleware - Authentification et autorisation
 * Session 88 - JWT Integration
 */

import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';
import { verifyToken, extractTokenFromHeader } from '../services/jwt';
import { getUserRoles } from './permissions';

const logger = createLogger('AuthMiddleware');

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user'; // Legacy field (kept for compatibility)
    roles?: string[]; // RBAC roles from Session 88
  };
}

/**
 * Vérifie que la requête contient un token valide
 * Extrait et vérifie le JWT, puis charge les rôles utilisateur
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid Authorization header', {
      path: req.path,
      method: req.method,
    });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Extract and verify JWT token
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      logger.warn('Invalid Authorization header format', {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Verify JWT and extract payload
    const payload = verifyToken(token);

    // Load user's roles from database (fresh lookup)
    const roles = await getUserRoles(payload.userId);

    // Populate req.user with decoded JWT payload + roles
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: roles.includes('admin') ? 'admin' : 'user', // Legacy compatibility
      roles, // RBAC roles
    };

    logger.debug('User authenticated successfully', {
      userId: req.user.id,
      email: req.user.email,
      roles: req.user.roles,
    });

    next();
  } catch (error) {
    logger.error('Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method,
    });
    res.status(401).json({
      error: 'Invalid or expired token',
      message: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
}

/**
 * Vérifie que l'utilisateur a le rôle requis
 */
export function requireRole(role: 'admin' | 'user') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      logger.warn('Insufficient permissions', {
        requiredRole: role,
        userRole: req.user.role,
        userId: req.user.id,
      });
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}

/**
 * Auth optionnel (ne bloque pas si pas de token)
 * Extrait et vérifie le JWT si présent, sinon continue sans user
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Pas de token, mais on continue quand même
    next();
    return;
  }

  try {
    // Extract and verify token
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      next();
      return;
    }

    // Verify JWT
    const payload = verifyToken(token);

    // Load user's roles from database
    const roles = await getUserRoles(payload.userId);

    // Populate req.user
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: roles.includes('admin') ? 'admin' : 'user',
      roles,
    };

    logger.debug('Optional auth succeeded', {
      userId: req.user.id,
      email: req.user.email,
    });

    next();
  } catch (error) {
    // Token invalide, mais optionalAuth ne bloque pas
    logger.debug('Optional auth failed, continuing anyway', {
      error: error instanceof Error ? error.message : String(error),
    });
    next();
  }
}
