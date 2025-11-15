/**
 * Cartae - Prometheus Middleware
 * Session 81d - Monitoring + Observability
 *
 * Express middleware pour tracker les métriques HTTP
 */

import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from './metrics';

/**
 * Middleware pour tracker les requêtes HTTP
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Track request completion
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const status = res.statusCode.toString();

    // Increment total requests
    httpRequestsTotal.inc({
      method,
      route,
      status,
    });

    // Record request duration
    httpRequestDuration.observe(
      {
        method,
        route,
        status,
      },
      duration
    );
  });

  next();
}
