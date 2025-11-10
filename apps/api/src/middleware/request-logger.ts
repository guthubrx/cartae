/**
 * Request Logger Middleware
 */

import type { Context, Next } from 'hono';

export const requestLogger = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const { method, url } = c.req;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    // Log format simple
    console.log(
      `[${new Date().toISOString()}] ${method} ${url} ${status} ${duration}ms`
    );
  };
};
