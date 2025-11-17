/**
 * Cartae Marketplace API - Main Entry Point (Production Hardened)
 *
 * Security Features:
 * - Comprehensive security headers (CSP, HSTS, X-Frame-Options)
 * - Advanced rate limiting (per-IP, per-endpoint, per-tenant)
 * - Restrictive CORS policy
 * - Audit logging for critical operations
 * - Admin endpoint protection
 *
 * Handles:
 * - Plugin discovery and metadata
 * - Download tracking and analytics
 * - Plugin ratings and reviews
 * - Admin operations (protected)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';

import { pluginRoutes } from './routes/plugins';
import { ratingRoutes } from './routes/ratings';
import { adminRoutes } from './routes/admin';
import { healthRoute } from './routes/health';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { securityHeaders, securityPresets } from './middleware/security-headers';
import { rateLimiterAdvanced, rateLimitPresets } from './middleware/rate-limiter-advanced';
import { auditLogger, auditPresets } from './middleware/audit-logger';
import type { WorkerEnv } from './types/worker-env';

// Initialize app with typed env
const app = new Hono<{ Bindings: WorkerEnv }>();

/**
 * Get allowed CORS origins from environment
 */
function getAllowedOrigins(env?: WorkerEnv): string[] {
  if (!env?.ALLOWED_ORIGINS) {
    // Default development origins
    return ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8787'];
  }

  return env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return false;

  // Exact match
  if (allowedOrigins.includes(origin)) return true;

  // Wildcard subdomain match (e.g., *.cartae.com)
  return allowedOrigins.some(allowed => {
    if (!allowed.startsWith('*.')) return false;
    const domain = allowed.substring(2); // Remove '*.'
    return origin.endsWith(`.${domain}`) || origin === `https://${domain}`;
  });
}

/**
 * Global middleware setup
 */
app.use('*', async (c, next) => {
  // Logger
  await logger()(c, next);
});

app.use('*', timing());

// Security headers - MUST be first for proper protection
app.use('*', securityHeaders(securityPresets.api()));

// CORS - Restrictive in production
app.use('*', async (c, next) => {
  const env = c.env as WorkerEnv;
  const origin = c.req.header('origin');
  const allowedOrigins = getAllowedOrigins(env);

  // Development mode - allow all origins
  if (env.ENVIRONMENT === 'development') {
    return cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID'],
      exposeHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Cache',
        'Age',
      ],
    })(c, next);
  }

  // Production mode - restrictive
  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    return cors({
      origin,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID'],
      exposeHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Cache',
        'Age',
      ],
      credentials: true,
    })(c, next);
  }

  // Origin not allowed
  return c.json(
    {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Origin not allowed',
        status: 403,
      },
    },
    403
  );
});

// Request logging
app.use('*', requestLogger());

// Audit logging for critical operations
app.use('*', async (c, next) => {
  const env = c.env as WorkerEnv;

  // Development - console logging
  if (env.ENVIRONMENT === 'development') {
    return auditLogger(auditPresets.development())(c, next);
  }

  // Production - structured logging (TODO: integrate with log aggregation service)
  return auditLogger(
    auditPresets.production(async entry => {
      // TODO: Send to log aggregation service (e.g., Datadog, Splunk, ELK)
      console.log(JSON.stringify(entry));
    })
  )(c, next);
});

// Advanced rate limiting
app.use('*', async (c, next) => {
  const env = c.env as WorkerEnv;

  // Development - relaxed limits
  if (env.ENVIRONMENT === 'development') {
    return rateLimiterAdvanced(rateLimitPresets.development())(c, next);
  }

  // Production - strict limits with KV
  if (env.RATE_LIMIT_KV) {
    return rateLimiterAdvanced(rateLimitPresets.production(env.RATE_LIMIT_KV))(c, next);
  }

  // Fallback to memory-based (not recommended for production)
  // eslint-disable-next-line no-console
  console.warn('⚠️ Rate limiting using memory store. Use KV for production!');
  return rateLimiterAdvanced(rateLimitPresets.development())(c, next);
});

// Error handler
app.use('*', errorHandler());

/**
 * Routes
 */

// Health check (no rate limiting on health endpoint)
app.get('/api/v1/health', healthRoute);

// Plugin routes
app.route('/api/v1/plugins', pluginRoutes);

// Rating routes
app.route('/api/v1/ratings', ratingRoutes);

// Admin routes (protected)
app.route('/api/v1/admin', adminRoutes);

/**
 * 404 handler
 */
app.all('*', c =>
  c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        status: 404,
        availableEndpoints: [
          'GET /api/v1/health',
          'GET /api/v1/plugins',
          'GET /api/v1/plugins/:id',
          'GET /api/v1/plugins/:id/download',
          'GET /api/v1/plugins/:id/ratings',
          'POST /api/v1/plugins/:id/ratings',
          'POST /api/v1/plugins/:id/report',
          'DELETE /api/v1/admin/plugins/:id (requires X-API-Key)',
        ],
      },
    },
    404
  )
);

export default app;
export type AppType = typeof app;

// Export for testing
export { app };
