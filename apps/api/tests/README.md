# API E2E Tests - Documentation

Tests end-to-end (bout en bout) pour valider multi-tenant + sécurité de l'API Cartae.

## Architecture

**Framework:** Playwright (tests HTTP API, pas de browser)
**Runner:** Playwright Test
**Assertions:** expect de Playwright

**Fichiers:**
```
tests/
├── e2e/
│   ├── multi-tenant.spec.ts    # Tests isolation + rate limits par tenant
│   └── security.spec.ts         # Tests sécurité (CORS, headers, audit logs)
└── README.md                    # Cette doc
```

## Prérequis

### 1. Installation

```bash
cd apps/api

# Installer Playwright
pnpm add -D @playwright/test

# Installer browsers (optionnel, pas utilisé pour tests API)
pnpm exec playwright install
```

### 2. Configuration Environnement

Copier `.env.test` et ajuster si nécessaire :

```bash
cp .env.test .env.test.local
```

**Variables importantes :**
- `API_BASE_URL` : URL de l'API (défaut: http://localhost:8787)
- `ADMIN_API_KEY` : Clé admin pour endpoints protégés
- `API_KEY` : Clé API standard pour tests auth
- `ALLOWED_ORIGINS` : Liste origins CORS whitelistées

### 3. Démarrer API Locale

Les tests nécessitent une API en cours d'exécution :

```bash
# Option 1: Dev server local
pnpm dev

# Option 2: Docker Compose (si configuré)
docker-compose up api

# Option 3: Wrangler (Cloudflare Workers local)
pnpm wrangler dev
```

**Note:** Playwright peut auto-démarrer l'API via `webServer` dans `playwright.config.ts`.

## Lancer Tests

### Commandes Principales

```bash
# Tous les tests E2E
pnpm test:e2e

# Tests multi-tenant seulement
pnpm test:e2e tests/e2e/multi-tenant.spec.ts

# Tests sécurité seulement
pnpm test:e2e tests/e2e/security.spec.ts

# Mode watch (développement, relance auto)
pnpm test:e2e --ui

# Mode debug (pause sur échecs)
pnpm test:e2e --debug

# Générer rapport HTML
pnpm test:e2e --reporter=html
```

### Commandes Avancées

```bash
# Lancer un test spécifique
pnpm test:e2e -g "should isolate data between tenants"

# Parallélisme (workers)
pnpm test:e2e --workers=4

# Retry sur échecs (CI)
pnpm test:e2e --retries=3

# Output verbose
pnpm test:e2e --reporter=list
```

## Tests Coverage

### Multi-Tenant (`multi-tenant.spec.ts`)

**8 tests couvrant :**

1. ✅ **Header x-tenant-id requis** : Endpoints protégés → 401 si header absent
2. ✅ **Isolation données** : Tenant A ne voit pas données Tenant B
3. ✅ **Rate limits Free tier** : 100 req/min (headers x-ratelimit-*)
4. ✅ **Rate limits Pro tier** : 1000 req/min (10x Free)
5. ✅ **Branding dynamique** : GET /tenants/{id}/config → Logo, couleurs, appName
6. ✅ **Switch tenant** : Changement x-tenant-id → Données différentes
7. ✅ **Tenant ID invalide** : Tenant inexistant → 404 ou 403
8. ✅ **Sanitization tenant ID** : Injection SQL/NoSQL rejetée

**Assertions totales :** ~45

### Sécurité (`security.spec.ts`)

**14 tests couvrant :**

1. ✅ **Rate limiting global** : 100 req/min par défaut → 429 + Retry-After
2. ✅ **Rate limiting per-endpoint** : POST /plugins 10 req/min → Headers x-ratelimit-*
3. ✅ **CORS - Origin bloquée** : Origin non whitelistée → 403 FORBIDDEN
4. ✅ **CORS - Origin autorisée** : Origin whitelistée → Access-Control-Allow-Origin
5. ✅ **CORS preflight** : OPTIONS → 204 + headers CORS
6. ✅ **Security headers** : CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
7. ✅ **Audit logging - Admin ops** : DELETE plugin → Log dans /admin/audit-logs
8. ✅ **Audit logging - Auth failed** : API key invalide → Log auth.failed
9. ✅ **Protection brute force** : 15 tentatives auth → Rate limit (429)
10. ✅ **Injection SQL/NoSQL** : Query params malicieux → Sanitized ou rejetés
11. ✅ **Path traversal** : ../../../etc/passwd → 400/403
12. ✅ **Header size limits** : Header > 8KB → 431 Request Header Fields Too Large
13. ✅ **Body size limits** : Body > 1MB → 413 Payload Too Large
14. ✅ **Security headers sur erreurs** : 404/500 → Headers sécurité présents

**Assertions totales :** ~70

## Coverage Total

**Tests créés :** 22
**Assertions :** ~115
**Coverage :**

- ✅ Multi-tenant : Isolation données, rate limits par tier, branding
- ✅ Sécurité : Rate limiting, CORS, headers, audit logs, injection protection
- ✅ Edge cases : Tenant invalide, injection, path traversal, size limits

## Workflow CI/CD

### GitHub Actions

```yaml
# .github/workflows/api-tests.yml
name: API E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    paths:
      - 'apps/api/**'

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: cartae_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run E2E Tests
        run: |
          cd apps/api
          pnpm test:e2e
        env:
          API_BASE_URL: http://localhost:8787
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/cartae_test
          REDIS_URL: redis://localhost:6379/1

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/api/playwright-report/
```

## Bonnes Pratiques

### 1. Isolation Tests

Chaque test est **indépendant** :
- Utilise timestamp pour données uniques (`Plugin ${Date.now()}`)
- Cleanup automatique via tenants séparés
- Pas de side effects entre tests

### 2. Assertions Explicites

Toujours vérifier **status + body** :

```typescript
// ✅ Bon
expect(response.status()).toBe(200);
const body = await response.json();
expect(body.success).toBe(true);

// ❌ Mauvais (assume body sans vérifier status)
const body = await response.json();
expect(body.data).toBeDefined();
```

### 3. Headers Pertinents

Toujours inclure headers requis :

```typescript
// ✅ Bon (headers complets)
await request.post('/api/v1/plugins', {
  headers: {
    'x-tenant-id': 'tenant-test',
    'x-api-key': process.env.API_KEY,
  },
  data: { ... },
});

// ❌ Mauvais (headers manquants → erreur confuse)
await request.post('/api/v1/plugins', {
  data: { ... },
});
```

### 4. Test Data Unique

Utiliser timestamps pour éviter collisions :

```typescript
// ✅ Bon (unique)
const name = `Test Plugin ${Date.now()}`;

// ❌ Mauvais (collision possible en parallel)
const name = 'Test Plugin';
```

### 5. Retry Logic

Tests peuvent échouer en CI (timing, réseau) :
- Configurer `retries: 2` dans `playwright.config.ts`
- Utiliser `expect.poll()` pour attentes asynchrones
- Tolérance sur rate limits (90% success au lieu de 100%)

## Debugging

### Échec Test

```bash
# Mode UI (voir requêtes HTTP)
pnpm test:e2e --ui

# Mode debug (pause sur échec)
pnpm test:e2e --debug

# Output verbose
pnpm test:e2e --reporter=list
```

### Vérifier API Locale

```bash
# Health check
curl http://localhost:8787/api/v1/health

# Test avec header
curl -H "x-tenant-id: tenant-test" \
     http://localhost:8787/api/v1/plugins
```

### Logs API

Activer logs détaillés dans `.env.test` :

```bash
LOG_LEVEL=debug
LOG_FORMAT=json
```

## Maintenance

### Ajouter Nouveau Test

1. Créer test dans `tests/e2e/*.spec.ts`
2. Suivre pattern existant (describe/test/expect)
3. Ajouter JSDoc avec description claire
4. Vérifier isolation (pas de side effects)
5. Update ce README si nouveau coverage

### Update Dependencies

```bash
# Update Playwright
pnpm update @playwright/test

# Re-install browsers (si nécessaire)
pnpm exec playwright install
```

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Hono Testing Guide](https://hono.dev/docs/guides/testing)

## Support

**Questions ?** Ouvrir issue dans repo avec label `api-tests`.

**Problème CI ?** Vérifier logs GitHub Actions → Upload artifact `playwright-report`.

**Échec local ?** Vérifier API démarre bien (`pnpm dev`) + `.env.test` configuré.
