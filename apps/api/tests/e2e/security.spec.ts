import { test, expect } from '@playwright/test';

/**
 * Tests E2E Sécurité API
 *
 * Valide :
 * - Rate limiting global (100 req/min par défaut)
 * - Rate limiting per-endpoint (ex: POST /plugins 10 req/min)
 * - CORS restrictif (origin whitelist)
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Audit logging pour actions critiques
 */
test.describe('API Security', () => {
  /**
   * Test rate limiting global
   *
   * Par défaut : 100 req/min
   * Faire 110 requêtes → Au moins 10 doivent être rate limitées (429)
   */
  test('should enforce global rate limiting', async ({ request }) => {
    const requests: Promise<any>[] = [];
    const numRequests = 110;

    // Health check = endpoint public sans auth
    for (let i = 0; i < numRequests; i++) {
      requests.push(request.get('/api/v1/health'));
    }

    const responses = await Promise.all(requests);

    // Vérifier au moins quelques 429 (rate limited)
    const rateLimited = responses.filter((r) => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);

    // Vérifier headers sur une réponse rate limitée
    if (rateLimited.length > 0) {
      const limited = rateLimited[0];
      const headers = limited.headers();
      expect(headers['retry-after']).toBeDefined();
      expect(headers['x-ratelimit-limit']).toBeDefined();
      expect(headers['x-ratelimit-remaining']).toBe('0');
      expect(headers['x-ratelimit-reset']).toBeDefined();

      // Vérifier body erreur
      const body = await limited.json();
      expect(body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: expect.stringMatching(/too many requests/i),
        },
      });
    }
  });

  /**
   * Test rate limiting per-endpoint
   *
   * POST /plugins : 10 req/min (plus strict que global)
   * Faire 15 requêtes → Au moins 5 doivent être rate limitées
   */
  test('should enforce endpoint-specific rate limits', async ({ request }) => {
    const requests: Promise<any>[] = [];
    const numRequests = 15;
    const timestamp = Date.now();

    for (let i = 0; i < numRequests; i++) {
      requests.push(
        request.post('/api/v1/plugins', {
          headers: {
            'x-tenant-id': 'tenant-rate-test',
            'x-api-key': process.env.API_KEY || 'test-api-key',
          },
          data: {
            name: `Rate Test Plugin ${timestamp}-${i}`,
            version: '1.0.0',
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // Au moins 5 doivent être rate limitées (15 - 10)
    const rateLimited = responses.filter((r) => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThanOrEqual(5);

    // Vérifier header limit spécifique à cet endpoint
    const limited = rateLimited[0];
    const headers = limited.headers();
    expect(headers['x-ratelimit-limit']).toBe('10');
  });

  /**
   * Test CORS - Origin non whitelistée
   *
   * Origin malicieuse → 403 FORBIDDEN
   * Header Access-Control-Allow-Origin absent
   */
  test('should block requests from non-whitelisted origins', async ({ request }) => {
    const maliciousOrigins = [
      'https://malicious-site.com',
      'http://evil.example.com',
      'https://phishing-cartae.io',
    ];

    for (const origin of maliciousOrigins) {
      const response = await request.get('/api/v1/plugins', {
        headers: {
          origin,
          'x-tenant-id': 'tenant-test',
        },
      });

      expect(response.status()).toBe(403);

      const body = await response.json();
      expect(body).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: expect.stringMatching(/origin.*not allowed/i),
        },
      });

      // Header CORS ne doit PAS être présent
      const headers = response.headers();
      expect(headers['access-control-allow-origin']).toBeUndefined();
    }
  });

  /**
   * Test CORS - Origin whitelistée
   *
   * Origin autorisée → 200 OK
   * Header Access-Control-Allow-Origin présent avec origin exacte
   */
  test('should allow requests from whitelisted origins', async ({ request }) => {
    const allowedOrigins = [
      'https://app.cartae.io',
      'http://localhost:3000',
      'https://admin.cartae.io',
    ];

    for (const origin of allowedOrigins) {
      const response = await request.get('/api/v1/health', {
        headers: { origin },
      });

      expect(response.status()).toBe(200);

      // Vérifier headers CORS
      const headers = response.headers();
      expect(headers['access-control-allow-origin']).toBe(origin);
      expect(headers['access-control-allow-credentials']).toBe('true');
      expect(headers['access-control-allow-methods']).toMatch(/GET|POST|PUT|DELETE/);
    }
  });

  /**
   * Test CORS preflight (OPTIONS)
   *
   * OPTIONS avec origin whitelistée + headers custom
   * → 204 NO CONTENT avec headers CORS appropriés
   */
  test('should handle CORS preflight requests', async ({ request }) => {
    const response = await request.fetch('/api/v1/plugins', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://app.cartae.io',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'x-tenant-id,x-api-key,content-type',
      },
    });

    expect(response.status()).toBe(204);

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBe('https://app.cartae.io');
    expect(headers['access-control-allow-methods']).toContain('POST');
    expect(headers['access-control-allow-headers']).toMatch(/x-tenant-id/i);
    expect(headers['access-control-allow-headers']).toMatch(/x-api-key/i);
    expect(headers['access-control-max-age']).toBeDefined();
  });

  /**
   * Test security headers
   *
   * Tous les endpoints doivent retourner headers sécurité :
   * - Content-Security-Policy
   * - Strict-Transport-Security (HSTS)
   * - X-Frame-Options
   * - X-Content-Type-Options
   * - X-XSS-Protection
   * - Referrer-Policy
   */
  test('should include security headers', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    expect(response.status()).toBe(200);

    const headers = response.headers();

    // CSP (Content Security Policy)
    expect(headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(headers['content-security-policy']).toMatch(/script-src/);

    // HSTS (HTTP Strict Transport Security)
    expect(headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(headers['strict-transport-security']).toMatch(/includeSubDomains/);

    // X-Frame-Options (clickjacking protection)
    expect(headers['x-frame-options']).toBe('DENY');

    // X-Content-Type-Options (MIME sniffing protection)
    expect(headers['x-content-type-options']).toBe('nosniff');

    // X-XSS-Protection (XSS filter)
    expect(headers['x-xss-protection']).toBe('1; mode=block');

    // Referrer-Policy
    expect(headers['referrer-policy']).toMatch(/no-referrer|strict-origin-when-cross-origin/);

    // Permissions-Policy (anciennement Feature-Policy)
    expect(headers['permissions-policy']).toBeDefined();
  });

  /**
   * Test audit logging - Admin operations
   *
   * Actions admin critiques doivent créer audit logs :
   * - DELETE plugin
   * - UPDATE tenant config
   * - CREATE API key
   *
   * Logs accessibles via GET /api/v1/admin/audit-logs
   */
  test('should create audit logs for critical operations', async ({ request }) => {
    const timestamp = Date.now();

    // 1. Créer un plugin (pour avoir quelque chose à supprimer)
    const createRes = await request.post('/api/v1/plugins', {
      headers: {
        'x-api-key': process.env.ADMIN_API_KEY || 'test-admin-key',
        'x-tenant-id': 'tenant-audit-test',
      },
      data: {
        name: `Audit Test Plugin ${timestamp}`,
        version: '1.0.0',
      },
    });
    expect(createRes.status()).toBe(201);
    const plugin = await createRes.json();
    const pluginId = plugin.data.id;

    // 2. Supprimer le plugin (admin operation)
    const deleteRes = await request.delete(`/api/v1/admin/plugins/${pluginId}`, {
      headers: {
        'x-api-key': process.env.ADMIN_API_KEY || 'test-admin-key',
        'x-tenant-id': 'tenant-audit-test',
      },
    });
    expect(deleteRes.status()).toBe(200);

    // 3. Récupérer audit logs
    const logsRes = await request.get('/api/v1/admin/audit-logs', {
      headers: {
        'x-api-key': process.env.ADMIN_API_KEY || 'test-admin-key',
        'x-tenant-id': 'tenant-audit-test',
      },
      params: {
        action: 'admin.operation.delete',
        resource_type: 'plugin',
        limit: '10',
      },
    });

    expect(logsRes.status()).toBe(200);
    const logs = await logsRes.json();
    expect(logs.success).toBe(true);

    // 4. Vérifier log de suppression présent
    expect(logs.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'admin.operation.delete',
          resource: expect.objectContaining({
            type: 'plugin',
            id: pluginId,
          }),
          timestamp: expect.any(Number),
          actor: expect.objectContaining({
            type: 'admin',
          }),
        }),
      ])
    );
  });

  /**
   * Test audit logging - Authentication attempts
   *
   * Tentatives auth échouées doivent être loggées
   * → Détection brute force
   */
  test('should log failed authentication attempts', async ({ request }) => {
    // Tentative avec API key invalide
    const response = await request.get('/api/v1/plugins', {
      headers: {
        'x-api-key': 'invalid-api-key-12345',
        'x-tenant-id': 'tenant-test',
      },
    });

    expect(response.status()).toBe(401);

    // Récupérer logs d'auth
    const logsRes = await request.get('/api/v1/admin/audit-logs', {
      headers: {
        'x-api-key': process.env.ADMIN_API_KEY || 'test-admin-key',
        'x-tenant-id': 'tenant-test',
      },
      params: {
        event: 'auth.failed',
        limit: '10',
      },
    });

    expect(logsRes.status()).toBe(200);
    const logs = await logsRes.json();

    // Au moins un log auth.failed
    expect(logs.data.length).toBeGreaterThan(0);
    expect(logs.data[0]).toMatchObject({
      event: 'auth.failed',
      metadata: expect.objectContaining({
        reason: expect.stringMatching(/invalid.*key/i),
      }),
    });
  });

  /**
   * Test protection contre brute force
   *
   * 10 tentatives auth échouées en 1 minute
   * → Temporairement bloqué (429 + Retry-After)
   */
  test('should rate limit authentication attempts', async ({ request }) => {
    const requests: Promise<any>[] = [];

    // 15 tentatives avec API key invalide
    for (let i = 0; i < 15; i++) {
      requests.push(
        request.get('/api/v1/plugins', {
          headers: {
            'x-api-key': `invalid-key-${i}`,
            'x-tenant-id': 'tenant-bruteforce-test',
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // Les premières doivent être 401 (auth failed)
    const authFailed = responses.filter((r) => r.status() === 401);
    expect(authFailed.length).toBeGreaterThan(0);

    // Après N tentatives, doit rate limit (429)
    const rateLimited = responses.filter((r) => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);

    // Vérifier message spécifique brute force
    if (rateLimited.length > 0) {
      const body = await rateLimited[0].json();
      expect(body.error.message).toMatch(/too many.*authentication.*attempts/i);
    }
  });

  /**
   * Test injection SQL/NoSQL dans query params
   *
   * Paramètres malicieux → Sanitized ou rejetés
   * Pas d'erreur 500 (leak stack trace)
   */
  test('should sanitize query parameters against injection', async ({ request }) => {
    const maliciousParams = [
      { search: "'; DROP TABLE plugins;--" },
      { filter: '" OR 1=1--' },
      { id: '{$ne:null}' },
      { sort: '<script>alert(1)</script>' },
    ];

    for (const params of maliciousParams) {
      const response = await request.get('/api/v1/plugins', {
        headers: {
          'x-tenant-id': 'tenant-test',
        },
        params,
      });

      // Doit retourner 400 (bad request) ou 200 (sanitized)
      // JAMAIS 500 (internal error qui leak stack trace)
      expect(response.status()).not.toBe(500);

      if (response.status() === 400) {
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('BAD_REQUEST');
      }
    }
  });

  /**
   * Test protection contre path traversal
   *
   * Tentative accès fichiers système via path traversal
   * → Rejeté avec 400 ou 403
   */
  test('should prevent path traversal attacks', async ({ request }) => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    ];

    for (const path of maliciousPaths) {
      const response = await request.get(`/api/v1/plugins/${path}`, {
        headers: {
          'x-tenant-id': 'tenant-test',
        },
      });

      // Doit rejeter (400, 403, ou 404)
      expect([400, 403, 404]).toContain(response.status());
      expect(response.status()).not.toBe(200);
    }
  });

  /**
   * Test header size limits
   *
   * Headers excessivement longs (> 8KB)
   * → Rejeté avec 431 (Request Header Fields Too Large)
   */
  test('should enforce header size limits', async ({ request }) => {
    const hugeHeader = 'A'.repeat(10000); // 10KB header

    const response = await request.get('/api/v1/health', {
      headers: {
        'x-custom-huge-header': hugeHeader,
      },
    });

    // Peut être rejeté par Cloudflare (431) ou par app (400)
    expect([400, 431]).toContain(response.status());
  });

  /**
   * Test body size limits
   *
   * POST avec body > 1MB (limite Cloudflare Workers)
   * → Rejeté avec 413 (Payload Too Large)
   */
  test('should enforce request body size limits', async ({ request }) => {
    const hugePayload = {
      name: 'Test Plugin',
      version: '1.0.0',
      data: 'A'.repeat(2 * 1024 * 1024), // 2MB
    };

    const response = await request.post('/api/v1/plugins', {
      headers: {
        'x-tenant-id': 'tenant-test',
        'x-api-key': process.env.API_KEY || 'test-api-key',
      },
      data: hugePayload,
    });

    // Doit rejeter (413 ou 400)
    expect([400, 413]).toContain(response.status());

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toMatch(/payload.*too.*large|request.*too.*large/i);
  });

  /**
   * Test security headers sur erreurs
   *
   * Même les réponses erreur (4xx, 5xx) doivent avoir headers sécurité
   */
  test('should include security headers on error responses', async ({ request }) => {
    const response = await request.get('/api/v1/plugins/non-existent-id', {
      headers: {
        'x-tenant-id': 'tenant-test',
      },
    });

    expect(response.status()).toBe(404);

    // Headers sécurité doivent être présents même sur 404
    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-security-policy']).toBeDefined();
  });
});
