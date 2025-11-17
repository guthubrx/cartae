/**
 * Security Headers Middleware
 *
 * Implements comprehensive security headers to protect against:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME sniffing
 * - Protocol downgrade attacks
 * - Information disclosure
 *
 * Based on OWASP recommendations and helmet.js patterns
 */

import type { Context, Next } from 'hono';

export interface SecurityHeadersOptions {
  /**
   * Content Security Policy
   * Prevents XSS and data injection attacks
   */
  contentSecurityPolicy?: {
    enabled?: boolean;
    directives?: Record<string, string[]>;
  };

  /**
   * HTTP Strict Transport Security
   * Forces HTTPS connections
   */
  hsts?: {
    enabled?: boolean;
    maxAge?: number; // seconds
    includeSubDomains?: boolean;
    preload?: boolean;
  };

  /**
   * X-Frame-Options
   * Prevents clickjacking
   */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM' | false;

  /**
   * X-Content-Type-Options
   * Prevents MIME sniffing
   */
  noSniff?: boolean;

  /**
   * X-XSS-Protection
   * Legacy XSS protection (modern browsers use CSP)
   */
  xssProtection?: boolean;

  /**
   * Referrer-Policy
   * Controls referrer information sent
   */
  referrerPolicy?: string;

  /**
   * Permissions-Policy (Feature-Policy)
   * Controls browser features
   */
  permissionsPolicy?: Record<string, string[]>;
}

/**
 * Default security headers configuration
 * Following OWASP best practices
 */
const DEFAULT_OPTIONS: Required<SecurityHeadersOptions> = {
  contentSecurityPolicy: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"], // Note: 'unsafe-inline' should be removed in production
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': [],
    },
  },
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameOptions: 'DENY',
  noSniff: true,
  xssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: ["'none'"],
    microphone: ["'none'"],
    geolocation: ["'none'"],
    payment: ["'none'"],
  },
};

/**
 * Build Content-Security-Policy header value
 */
function buildCSP(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key; // Directives like 'upgrade-insecure-requests'
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Build Permissions-Policy header value
 */
function buildPermissionsPolicy(policy: Record<string, string[]>): string {
  return Object.entries(policy)
    .map(([feature, allowlist]) => {
      if (allowlist.length === 0 || (allowlist.length === 1 && allowlist[0] === "'none'")) {
        return `${feature}=()`;
      }
      return `${feature}=(${allowlist.join(' ')})`;
    })
    .join(', ');
}

/**
 * Security Headers Middleware
 *
 * Usage:
 * ```typescript
 * app.use('*', securityHeaders());
 *
 * // Or with custom options
 * app.use('*', securityHeaders({
 *   hsts: {
 *     enabled: true,
 *     maxAge: 63072000, // 2 years
 *   },
 * }));
 * ```
 */
export const securityHeaders = (options: SecurityHeadersOptions = {}) => {
  // Merge options with defaults
  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
    contentSecurityPolicy: {
      ...DEFAULT_OPTIONS.contentSecurityPolicy,
      ...options.contentSecurityPolicy,
      directives: {
        ...DEFAULT_OPTIONS.contentSecurityPolicy.directives,
        ...options.contentSecurityPolicy?.directives,
      },
    },
    hsts: {
      ...DEFAULT_OPTIONS.hsts,
      ...options.hsts,
    },
    permissionsPolicy: {
      ...DEFAULT_OPTIONS.permissionsPolicy,
      ...options.permissionsPolicy,
    },
  };

  return async (c: Context, next: Next) => {
    // Content Security Policy
    if (config.contentSecurityPolicy.enabled) {
      const cspValue = buildCSP(config.contentSecurityPolicy.directives);
      c.header('Content-Security-Policy', cspValue);
    }

    // HTTP Strict Transport Security
    if (config.hsts.enabled) {
      let hstsValue = `max-age=${config.hsts.maxAge}`;
      if (config.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      if (config.hsts.preload) {
        hstsValue += '; preload';
      }
      c.header('Strict-Transport-Security', hstsValue);
    }

    // X-Frame-Options
    if (config.frameOptions) {
      c.header('X-Frame-Options', config.frameOptions);
    }

    // X-Content-Type-Options
    if (config.noSniff) {
      c.header('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection
    if (config.xssProtection) {
      c.header('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    if (config.referrerPolicy) {
      c.header('Referrer-Policy', config.referrerPolicy);
    }

    // Permissions-Policy
    if (config.permissionsPolicy) {
      const policyValue = buildPermissionsPolicy(config.permissionsPolicy);
      c.header('Permissions-Policy', policyValue);
    }

    // Additional security headers
    c.header('X-Powered-By', 'Cartae'); // Hide framework info
    c.header('X-DNS-Prefetch-Control', 'off'); // Disable DNS prefetching

    await next();
  };
};

/**
 * Preset configurations for common scenarios
 */
export const securityPresets = {
  /**
   * Maximum security - for production APIs
   */
  strict: (): SecurityHeadersOptions => ({
    contentSecurityPolicy: {
      enabled: true,
      directives: {
        'default-src': ["'none'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'"],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'none'"],
        'form-action': ["'none'"],
        'upgrade-insecure-requests': [],
      },
    },
    hsts: {
      enabled: true,
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    frameOptions: 'DENY',
    noSniff: true,
    xssProtection: true,
    referrerPolicy: 'no-referrer',
    permissionsPolicy: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
      usb: ["'none'"],
    },
  }),

  /**
   * Development - relaxed for easier debugging
   */
  development: (): SecurityHeadersOptions => ({
    contentSecurityPolicy: {
      enabled: false, // Disable CSP in dev for easier debugging
    },
    hsts: {
      enabled: false, // No HTTPS enforcement in dev
    },
    frameOptions: 'SAMEORIGIN',
    noSniff: true,
    xssProtection: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {},
  }),

  /**
   * API-only - optimized for REST APIs
   */
  api: (): SecurityHeadersOptions => ({
    contentSecurityPolicy: {
      enabled: true,
      directives: {
        'default-src': ["'none'"],
        'frame-ancestors': ["'none'"],
      },
    },
    hsts: {
      enabled: true,
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false,
    },
    frameOptions: 'DENY',
    noSniff: true,
    xssProtection: true,
    referrerPolicy: 'no-referrer',
    permissionsPolicy: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
    },
  }),
};
