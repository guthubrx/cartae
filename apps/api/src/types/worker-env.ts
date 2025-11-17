/**
 * Cloudflare Workers Environment Bindings
 *
 * Type definitions for KV namespaces, R2 buckets, Durable Objects, etc.
 */

/**
 * Worker environment bindings
 */
export interface WorkerEnv {
  /**
   * Rate limiting KV namespace
   */
  RATE_LIMIT_KV?: KVNamespace;

  /**
   * Environment (development, staging, production)
   */
  ENVIRONMENT?: string;

  /**
   * Admin API key (for protected endpoints)
   */
  ADMIN_API_KEY?: string;

  /**
   * Allowed CORS origins (comma-separated)
   */
  ALLOWED_ORIGINS?: string;
}
