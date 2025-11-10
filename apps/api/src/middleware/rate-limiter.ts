/**
 * Rate Limiter Middleware
 */

import type { Context, Next } from 'hono';

// Simple in-memory rate limiting (pour dev)
// TODO: Utiliser Redis ou KV pour production
const requestCounts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 100; // requests per window
const WINDOW_MS = 60 * 1000; // 1 minute

export const rateLimiter = () => {
  return async (c: Context, next: Next) => {
    // Obtenir IP du client
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

    const now = Date.now();
    const clientData = requestCounts.get(ip);

    if (!clientData || now > clientData.resetAt) {
      // Nouvelle fenêtre de rate limiting
      requestCounts.set(ip, {
        count: 1,
        resetAt: now + WINDOW_MS,
      });
    } else {
      // Incrémenter le compteur
      clientData.count++;

      if (clientData.count > RATE_LIMIT) {
        // Rate limit dépassée
        return c.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
              status: 429,
              retryAfter: Math.ceil((clientData.resetAt - now) / 1000),
            },
          },
          429
        );
      }
    }

    // Ajouter les headers de rate limiting
    c.header('X-RateLimit-Limit', RATE_LIMIT.toString());
    c.header(
      'X-RateLimit-Remaining',
      (RATE_LIMIT - (clientData?.count || 0)).toString()
    );
    c.header(
      'X-RateLimit-Reset',
      new Date(clientData?.resetAt || now + WINDOW_MS).toISOString()
    );

    await next();
  };
};
