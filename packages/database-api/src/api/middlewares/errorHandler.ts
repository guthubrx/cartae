/**
 * Middlewares - Gestion d'erreurs globale
 *
 * Catch toutes les erreurs non gérées et retourne JSON propre
 * Évite d'exposer stack traces en production
 *
 * @module api/middlewares/errorHandler
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Error handler global Express
 *
 * Doit être le dernier middleware enregistré (après toutes les routes)
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('❌ Unhandled error:', err);

  // Status code par défaut
  const status = (err as any).status || 500;

  // Response JSON
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack, // Stack trace seulement en dev
    }),
  });
}

/**
 * Handler pour routes 404
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
}
