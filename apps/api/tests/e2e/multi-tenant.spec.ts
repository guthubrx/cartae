import { test, expect } from '@playwright/test';

/**
 * Tests E2E Multi-Tenant API
 *
 * Valide :
 * - Isolation stricte des données entre tenants
 * - Header x-tenant-id requis pour endpoints protégés
 * - Rate limiting par tier (Free/Pro/Enterprise)
 * - Configuration branding dynamique par tenant
 * - Switch tenant via header x-tenant-id
 */
test.describe('Multi-Tenant API', () => {
  /**
   * Test header x-tenant-id obligatoire pour endpoints protégés
   *
   * Sans header → 401 UNAUTHORIZED
   */
  test('should require x-tenant-id header for protected endpoints', async ({ request }) => {
    const response = await request.get('/api/v1/plugins');

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: expect.stringMatching(/tenant.*required/i),
      },
    });
  });

  /**
   * Test isolation stricte des données entre tenants
   *
   * Tenant A et B créent chacun un plugin
   * → Chaque tenant ne voit QUE ses propres plugins
   */
  test('should isolate data between tenants', async ({ request }) => {
    const timestamp = Date.now();

    // Créer plugin pour tenant A
    const resA = await request.post('/api/v1/plugins', {
      headers: {
        'x-tenant-id': 'tenant-a',
        'x-api-key': process.env.API_KEY || 'test-api-key',
      },
      data: {
        name: `Plugin A ${timestamp}`,
        version: '1.0.0',
        description: 'Plugin exclusive à tenant A',
      },
    });
    expect(resA.status()).toBe(201);
    const pluginA = await resA.json();
    expect(pluginA.success).toBe(true);

    // Créer plugin pour tenant B
    const resB = await request.post('/api/v1/plugins', {
      headers: {
        'x-tenant-id': 'tenant-b',
        'x-api-key': process.env.API_KEY || 'test-api-key',
      },
      data: {
        name: `Plugin B ${timestamp}`,
        version: '1.0.0',
        description: 'Plugin exclusive à tenant B',
      },
    });
    expect(resB.status()).toBe(201);
    const pluginB = await resB.json();
    expect(pluginB.success).toBe(true);

    // Tenant A ne doit voir QUE Plugin A
    const listA = await request.get('/api/v1/plugins', {
      headers: { 'x-tenant-id': 'tenant-a' },
    });
    expect(listA.status()).toBe(200);
    const dataA = await listA.json();
    expect(dataA.success).toBe(true);
    expect(dataA.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: `Plugin A ${timestamp}` }),
      ])
    );
    expect(dataA.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: `Plugin B ${timestamp}` }),
      ])
    );

    // Tenant B ne doit voir QUE Plugin B
    const listB = await request.get('/api/v1/plugins', {
      headers: { 'x-tenant-id': 'tenant-b' },
    });
    expect(listB.status()).toBe(200);
    const dataB = await listB.json();
    expect(dataB.success).toBe(true);
    expect(dataB.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: `Plugin B ${timestamp}` }),
      ])
    );
    expect(dataB.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: `Plugin A ${timestamp}` }),
      ])
    );
  });

  /**
   * Test rate limiting par tier
   *
   * Free tier : 100 req/min
   * Pro tier : 1000 req/min
   * Enterprise tier : 10000 req/min
   *
   * Valide headers x-ratelimit-* présents
   */
  test('should enforce rate limits per tenant tier - Free tier', async ({ request }) => {
    // Simuler Free tier (100 req/min)
    const requests: Promise<any>[] = [];
    const numRequests = 110;

    for (let i = 0; i < numRequests; i++) {
      requests.push(
        request.get('/api/v1/plugins', {
          headers: { 'x-tenant-id': 'tenant-free' },
        })
      );
    }

    const responses = await Promise.all(requests);

    // Les 100 premières doivent passer (200 OK)
    const successResponses = responses.filter((r) => r.status() === 200);
    expect(successResponses.length).toBeGreaterThanOrEqual(90); // Tolérance 10%

    // Au moins quelques doivent être rate limitées (429)
    const rateLimitedResponses = responses.filter((r) => r.status() === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);

    // Vérifier headers rate limit sur dernière réponse
    const last = responses[responses.length - 1];
    const headers = last.headers();
    expect(headers['x-ratelimit-limit']).toBeDefined();
    expect(headers['x-ratelimit-remaining']).toBeDefined();
    expect(headers['x-ratelimit-reset']).toBeDefined();

    // Si rate limitée, vérifier body erreur
    if (last.status() === 429) {
      const body = await last.json();
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
   * Test rate limiting Pro tier
   *
   * Pro tier : 1000 req/min (10x Free tier)
   * → Peut faire 500 requêtes sans rate limit
   */
  test('should allow higher limits for Pro tier', async ({ request }) => {
    const requests: Promise<any>[] = [];
    const numRequests = 500;

    for (let i = 0; i < numRequests; i++) {
      requests.push(
        request.get('/api/v1/plugins', {
          headers: { 'x-tenant-id': 'tenant-pro' },
        })
      );
    }

    const responses = await Promise.all(requests);

    // La majorité doivent passer (Pro tier = 1000 req/min)
    const successResponses = responses.filter((r) => r.status() === 200);
    expect(successResponses.length).toBeGreaterThan(450); // Au moins 90%

    // Vérifier header limit indique 1000
    const first = responses[0];
    const headers = first.headers();
    expect(headers['x-ratelimit-limit']).toBe('1000');
  });

  /**
   * Test configuration branding dynamique par tenant
   *
   * GET /api/v1/tenants/{tenantId}/config
   * → Retourne branding (appName, logoUrl, primaryColor)
   */
  test('should return tenant branding configuration', async ({ request }) => {
    const response = await request.get('/api/v1/tenants/tenant-a/config', {
      headers: { 'x-tenant-id': 'tenant-a' },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.branding).toMatchObject({
      appName: expect.any(String),
      logoUrl: expect.stringMatching(/^https?:\/\//),
      primaryColor: expect.stringMatching(/^#[0-9a-f]{6}$/i),
    });

    // Vérifier propriétés additionnelles attendues
    expect(body.data.features).toBeDefined();
    expect(body.data.tier).toMatch(/free|pro|enterprise/i);
  });

  /**
   * Test switch tenant via header x-tenant-id
   *
   * Même API key, mais tenant différent
   * → Données différentes retournées
   */
  test('should switch context when x-tenant-id header changes', async ({ request }) => {
    const timestamp = Date.now();

    // Créer plugin pour tenant X
    await request.post('/api/v1/plugins', {
      headers: {
        'x-tenant-id': 'tenant-x',
        'x-api-key': process.env.API_KEY || 'test-api-key',
      },
      data: {
        name: `Plugin X ${timestamp}`,
        version: '1.0.0',
      },
    });

    // Créer plugin pour tenant Y
    await request.post('/api/v1/plugins', {
      headers: {
        'x-tenant-id': 'tenant-y',
        'x-api-key': process.env.API_KEY || 'test-api-key',
      },
      data: {
        name: `Plugin Y ${timestamp}`,
        version: '1.0.0',
      },
    });

    // Lister avec tenant X
    const listX = await request.get('/api/v1/plugins', {
      headers: { 'x-tenant-id': 'tenant-x' },
    });
    const dataX = await listX.json();
    const pluginNamesX = dataX.data.map((p: any) => p.name);

    // Lister avec tenant Y
    const listY = await request.get('/api/v1/plugins', {
      headers: { 'x-tenant-id': 'tenant-y' },
    });
    const dataY = await listY.json();
    const pluginNamesY = dataY.data.map((p: any) => p.name);

    // Vérifier isolation
    expect(pluginNamesX).toContain(`Plugin X ${timestamp}`);
    expect(pluginNamesX).not.toContain(`Plugin Y ${timestamp}`);

    expect(pluginNamesY).toContain(`Plugin Y ${timestamp}`);
    expect(pluginNamesY).not.toContain(`Plugin X ${timestamp}`);
  });

  /**
   * Test tenant ID invalide
   *
   * Tenant inexistant → 404 NOT_FOUND ou 403 FORBIDDEN
   */
  test('should reject invalid tenant IDs', async ({ request }) => {
    const response = await request.get('/api/v1/plugins', {
      headers: {
        'x-tenant-id': 'tenant-does-not-exist-12345',
      },
    });

    // Peut être 404 (tenant introuvable) ou 403 (accès refusé)
    expect([403, 404]).toContain(response.status());

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toMatch(/FORBIDDEN|NOT_FOUND/);
  });

  /**
   * Test tenant ID malformé (injection attempt)
   *
   * Tenant ID avec caractères spéciaux SQL/NoSQL
   * → Rejeté avec 400 BAD_REQUEST
   */
  test('should sanitize tenant IDs against injection attacks', async ({ request }) => {
    const maliciousTenantIds = [
      "tenant'; DROP TABLE plugins;--",
      'tenant" OR 1=1--',
      'tenant{$ne:null}',
      '../../../etc/passwd',
      'tenant<script>alert(1)</script>',
    ];

    for (const tenantId of maliciousTenantIds) {
      const response = await request.get('/api/v1/plugins', {
        headers: { 'x-tenant-id': tenantId },
      });

      // Doit rejeter (400 ou 403)
      expect([400, 403]).toContain(response.status());

      const body = await response.json();
      expect(body.success).toBe(false);
    }
  });
});
