/**
 * Global Error Handler Middleware
 */

import type { Context, Next } from 'hono';

export const errorHandler = () => {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      console.error('[Error Handler]', error);

      const err = error as Error;

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: err.message || 'An unexpected error occurred',
            status: 500,
          },
        },
        500
      );
    }
  };
};
