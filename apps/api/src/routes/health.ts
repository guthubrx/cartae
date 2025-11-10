/**
 * Health Check Route
 */

import type { Context } from 'hono';

export const healthRoute = (c: Context) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
    },
  });
};
