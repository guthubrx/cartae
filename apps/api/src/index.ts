/**
 * Cartae Marketplace API - Main Entry Point
 *
 * Handles:
 * - Plugin discovery and metadata
 * - Download tracking and analytics
 * - Plugin ratings and reviews
 * - Admin operations
 * - Rate limiting and caching
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';
import { cache } from 'hono/cache';

import { pluginRoutes } from './routes/plugins';
import { ratingRoutes } from './routes/ratings';
import { adminRoutes } from './routes/admin';
import { healthRoute } from './routes/health';
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limiter';
import { requestLogger } from './middleware/request-logger';

// Initialize app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', timing());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposeHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Cache',
      'Age',
    ],
  })
);
app.use('*', requestLogger());
app.use('*', rateLimiter());
app.use('*', errorHandler());

// Routes
app.get('/api/v1/health', healthRoute);

// Plugin routes
app.route('/api/v1/plugins', pluginRoutes);

// Rating routes
app.route('/api/v1/ratings', ratingRoutes);

// Admin routes (protected)
app.route('/api/v1/admin', adminRoutes);

// 404 handler
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
