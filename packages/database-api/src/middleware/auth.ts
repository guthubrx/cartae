/**
 * Auth Middleware - Authentification et autorisation
 */

import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthMiddleware');

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user';
  };
}

/**
 * Vérifie que la requête contient un token valide
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid Authorization header', {
      path: req.path,
      method: req.method,
    });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // TODO: Vérifier token avec @cartae/auth JWTService
  // Extract token: authHeader.substring(7) removes 'Bearer '
  // Pour l'instant, mock simple pour que ça compile
  try {
    // Mock user (en prod: décoder JWT)
    req.user = {
      id: 'mock-user-id',
      email: 'mock@example.com',
      role: 'user',
    };

    next();
  } catch (error) {
    logger.error('Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(401).json({ error: 'Invalid token' });
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
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Pas de token, mais on continue quand même
    next();
    return;
  }

  // TODO: Extract and verify token with @cartae/auth JWTService
  // Token would be: authHeader.substring(7)
  try {
    // Mock user
    req.user = {
      id: 'mock-user-id',
      email: 'mock@example.com',
      role: 'user',
    };
    next();
  } catch (error) {
    // Token invalide, mais optionalAuth ne bloque pas
    logger.debug('Optional auth failed, continuing anyway', {
      error: error instanceof Error ? error.message : String(error),
    });
    next();
  }
}
