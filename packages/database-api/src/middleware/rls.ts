/**
 * RLS Middleware - Row Level Security Context
 * Session 129 - Persistance Hybride
 *
 * Configure le context PostgreSQL pour RLS (app.current_user_id)
 * Chaque transaction PostgreSQL aura accès au user ID via:
 * current_setting('app.current_user_id')::UUID
 */

import type { Response, NextFunction } from 'express';
import { pool } from '../db/client';
import { createLogger } from '../utils/logger';
import type { AuthenticatedRequest } from './auth';

const logger = createLogger('RLSMiddleware');

/**
 * Middleware pour configurer le RLS context PostgreSQL
 * DOIT être utilisé APRÈS requireAuth (nécessite req.user.id)
 */
export async function setRLSContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.id) {
    logger.error('RLS middleware called without authenticated user', {
      path: req.path,
      method: req.method,
    });
    res.status(401).json({ error: 'Unauthorized - RLS context requires authentication' });
    return;
  }

  try {
    // Obtenir une connexion du pool
    const client = await pool.connect();

    try {
      // Configurer le context RLS pour cette transaction
      await client.query(`SET LOCAL app.current_user_id = '${req.user.id}'`);

      // Attacher le client à la requête pour réutilisation
      (req as any).pgClient = client;

      logger.debug('RLS context set successfully', {
        userId: req.user.id,
        path: req.path,
      });

      // Appeler le handler suivant
      next();
    } catch (error) {
      // Libérer la connexion en cas d'erreur
      client.release();
      throw error;
    }
  } catch (error) {
    logger.error('Failed to set RLS context', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user.id,
      path: req.path,
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to configure database security context',
    });
  }
}

/**
 * Middleware pour nettoyer le RLS context après la requête
 * Libère la connexion PostgreSQL
 */
export function cleanupRLSContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const client = (req as any).pgClient;

  if (client) {
    // Écouter la fin de la requête pour libérer la connexion
    res.on('finish', () => {
      client.release();
      logger.debug('RLS context cleaned up', {
        userId: req.user?.id,
        path: req.path,
      });
    });
  }

  next();
}

/**
 * Helper pour obtenir le client PostgreSQL avec RLS context
 * À utiliser dans les handlers de routes
 */
export function getRLSClient(req: AuthenticatedRequest) {
  const client = (req as any).pgClient;

  if (!client) {
    throw new Error('RLS client not found - ensure setRLSContext middleware is applied');
  }

  return client;
}
