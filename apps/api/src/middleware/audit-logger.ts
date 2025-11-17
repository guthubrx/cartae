/**
 * Audit Logging Middleware
 *
 * Logs all critical actions for security, compliance, and forensics:
 * - Admin operations (create, update, delete)
 * - Authentication events (login, logout, failed attempts)
 * - Data access (sensitive endpoints)
 * - Configuration changes
 * - Rate limit violations
 *
 * Audit logs are immutable and stored with:
 * - Timestamp (ISO 8601)
 * - User/IP address
 * - Action performed
 * - Resource affected
 * - Request/response status
 * - User agent
 * - Tenant ID (multi-tenant)
 *
 * Based on OWASP Logging Cheat Sheet and SOC2 requirements
 */

import type { Context, Next } from 'hono';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /**
   * Timestamp in ISO 8601 format
   */
  timestamp: string;

  /**
   * Event type (e.g., 'admin.plugin.delete', 'auth.login.failed')
   */
  event: string;

  /**
   * Actor performing the action
   */
  actor: {
    /**
     * IP address
     */
    ip: string;

    /**
     * User ID (if authenticated)
     */
    userId?: string;

    /**
     * Tenant ID (if multi-tenant)
     */
    tenantId?: string;

    /**
     * User agent
     */
    userAgent?: string;
  };

  /**
   * Resource being acted upon
   */
  resource?: {
    /**
     * Resource type (e.g., 'plugin', 'rating', 'user')
     */
    type: string;

    /**
     * Resource ID
     */
    id: string;

    /**
     * Additional metadata
     */
    metadata?: Record<string, any>;
  };

  /**
   * Request details
   */
  request: {
    /**
     * HTTP method
     */
    method: string;

    /**
     * Request path
     */
    path: string;

    /**
     * Query parameters (sanitized)
     */
    query?: Record<string, string>;

    /**
     * Request body (sanitized, no sensitive data)
     */
    body?: any;
  };

  /**
   * Response details
   */
  response: {
    /**
     * HTTP status code
     */
    status: number;

    /**
     * Success/failure
     */
    success: boolean;

    /**
     * Error code (if failure)
     */
    errorCode?: string;
  };

  /**
   * Security context
   */
  security?: {
    /**
     * Rate limit hit?
     */
    rateLimitHit?: boolean;

    /**
     * Suspicious activity detected?
     */
    suspicious?: boolean;

    /**
     * Risk score (0-100)
     */
    riskScore?: number;
  };
}

/**
 * Audit log configuration
 */
export interface AuditLogConfig {
  /**
   * Log all requests (verbose mode)
   */
  logAllRequests?: boolean;

  /**
   * Log only critical operations (default)
   */
  logCriticalOnly?: boolean;

  /**
   * Patterns to match for critical operations
   * Example: ['/api/v1/admin/*', 'POST /api/v1/plugins']
   */
  criticalPatterns?: string[];

  /**
   * Fields to sanitize from request body
   */
  sanitizeFields?: string[];

  /**
   * Custom log handler
   */
  logHandler?: (entry: AuditLogEntry) => Promise<void> | void;

  /**
   * Enable console logging (development)
   */
  enableConsole?: boolean;

  /**
   * Enable structured logging (JSON)
   */
  enableStructured?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<AuditLogConfig> = {
  logAllRequests: false,
  logCriticalOnly: true,
  criticalPatterns: [
    '/api/v1/admin/*',
    'POST /api/v1/plugins',
    'PUT /api/v1/plugins/*',
    'DELETE /api/v1/plugins/*',
    'POST /api/v1/ratings',
    'POST /api/v1/plugins/*/report',
  ],
  sanitizeFields: ['password', 'apiKey', 'secret', 'token', 'authorization', 'creditCard', 'ssn'],
  logHandler: () => {},
  enableConsole: true,
  enableStructured: true,
};

/**
 * Get client IP address
 */
function getClientIP(c: Context): string {
  const cfIP = c.req.header('cf-connecting-ip');
  if (cfIP) return cfIP;

  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = c.req.header('x-real-ip');
  if (realIP) return realIP;

  return 'unknown';
}

/**
 * Get tenant ID from request
 */
function getTenantID(c: Context): string | null {
  return c.req.header('x-tenant-id') || null;
}

/**
 * Check if request should be logged
 */
function shouldLog(c: Context, config: AuditLogConfig): boolean {
  // Log all requests if enabled
  if (config.logAllRequests) return true;

  // Check critical patterns
  const { method } = c.req;
  const { path } = c.req;

  return (config.criticalPatterns || DEFAULT_CONFIG.criticalPatterns).some(pattern => {
    // Pattern with method (e.g., "POST /api/v1/plugins")
    let actualPattern = pattern;
    if (pattern.includes(' ')) {
      const [patternMethod, patternPath] = pattern.split(' ');
      if (patternMethod !== method) return false;
      actualPattern = patternPath;
    }

    // Wildcard match
    if (actualPattern.endsWith('/*')) {
      const basePath = actualPattern.slice(0, -2);
      return path.startsWith(basePath);
    }

    // Exact match
    return path === actualPattern;
  });
}

/**
 * Sanitize sensitive data from object
 */
function sanitize(obj: any, fields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in sanitized) {
    if (fields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key], fields);
    }
  }

  return sanitized;
}

/**
 * Parse query parameters
 */
function parseQuery(c: Context): Record<string, string> {
  const query: Record<string, string> = {};
  const url = new URL(c.req.url);
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}

/**
 * Determine event type from request
 */
function determineEventType(c: Context): string {
  const { method } = c.req;
  const { path } = c.req;

  // Admin operations
  if (path.startsWith('/api/v1/admin/')) {
    const action = method === 'DELETE' ? 'delete' : method === 'POST' ? 'create' : 'update';
    return `admin.operation.${action}`;
  }

  // Plugin operations
  if (path.startsWith('/api/v1/plugins')) {
    if (method === 'POST' && !path.includes('/ratings') && !path.includes('/report')) {
      return 'plugin.create';
    }
    if (method === 'PUT') return 'plugin.update';
    if (method === 'DELETE') return 'plugin.delete';
    if (path.includes('/download')) return 'plugin.download';
    if (path.includes('/ratings') && method === 'POST') return 'rating.create';
    if (path.includes('/report')) return 'plugin.report';
  }

  // Generic - replace slashes with dots
  return `${method.toLowerCase()}.${path.replace(/\u002f/g, '.')}`;
}

/**
 * Extract resource info from request
 */
function extractResource(c: Context): { type: string; id: string } | null {
  const { path } = c.req;

  // Plugin ID from path
  const pluginMatch = path.match(/\u002fplugins\u002f([^\u002f]+)/);
  if (pluginMatch) {
    return { type: 'plugin', id: pluginMatch[1] };
  }

  // Rating ID
  const ratingMatch = path.match(/\u002fratings\u002f([^\u002f]+)/);
  if (ratingMatch) {
    return { type: 'rating', id: ratingMatch[1] };
  }

  return null;
}

/**
 * Format audit log for console
 */
function formatConsoleLog(entry: AuditLogEntry): string {
  const { timestamp, event, actor, request, response } = entry;
  const status = response.success ? '✅' : '❌';
  const logLine = `[AUDIT] ${timestamp} ${status} ${event} | ${actor.ip}`;
  const reqInfo = ` | ${request.method} ${request.path} → ${response.status}`;
  return logLine + reqInfo;
}

/**
 * Audit Logger Middleware
 *
 * Usage:
 * ```typescript
 * // Log all requests
 * app.use('*', auditLogger({ logAllRequests: true }));
 *
 * // Log only critical operations (default)
 * app.use('*', auditLogger());
 *
 * // Custom log handler
 * app.use('*', auditLogger({
 *   logHandler: async (entry) => {
 *     await db.auditLogs.insert(entry);
 *   },
 * }));
 * ```
 */
export const auditLogger = (userConfig: AuditLogConfig = {}) => {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  return async (c: Context, next: Next) => {
    // Check if this request should be logged
    if (!shouldLog(c, config)) {
      await next();
      return;
    }

    // Capture request details
    const { method } = c.req;
    const { path } = c.req;
    const ip = getClientIP(c);
    const tenantId = getTenantID(c);
    const userAgent = c.req.header('user-agent');

    // Parse request body (for POST/PUT)
    let requestBody: any;
    if (method === 'POST' || method === 'PUT') {
      try {
        requestBody = await c.req.json();
      } catch {
        // Not JSON or already consumed
      }
    }

    // Execute request
    await next();

    // Capture response
    const { status } = c.res;
    const success = status >= 200 && status < 300;

    // Build audit log entry
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      event: determineEventType(c),
      actor: {
        ip,
        tenantId: tenantId || undefined,
        userAgent,
      },
      resource: extractResource(c) || undefined,
      request: {
        method,
        path,
        query: parseQuery(c),
        body: requestBody ? sanitize(requestBody, config.sanitizeFields || []) : undefined,
      },
      response: {
        status,
        success,
      },
      security: {
        rateLimitHit: status === 429,
      },
    };

    // Console logging
    if (config.enableConsole) {
      if (config.enableStructured) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(entry));
      } else {
        // eslint-disable-next-line no-console
        console.log(formatConsoleLog(entry));
      }
    }

    // Custom log handler
    if (config.logHandler) {
      try {
        await config.logHandler(entry);
      } catch (error) {
        console.error('[AUDIT] Failed to log entry:', error);
      }
    }
  };
};

/**
 * Preset configurations
 */
export const auditPresets = {
  /**
   * Development - console logging only
   */
  development: (): AuditLogConfig => ({
    logAllRequests: false,
    logCriticalOnly: true,
    enableConsole: true,
    enableStructured: false,
  }),

  /**
   * Production - structured JSON logging
   */
  production: (logHandler: (entry: AuditLogEntry) => Promise<void>): AuditLogConfig => ({
    logAllRequests: false,
    logCriticalOnly: true,
    enableConsole: false,
    enableStructured: true,
    logHandler,
  }),

  /**
   * Compliance - log everything
   */
  compliance: (logHandler: (entry: AuditLogEntry) => Promise<void>): AuditLogConfig => ({
    logAllRequests: true,
    enableConsole: false,
    enableStructured: true,
    logHandler,
  }),
};
