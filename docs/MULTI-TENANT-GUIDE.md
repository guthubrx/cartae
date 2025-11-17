# Guide Multi-Tenant - Cartae Enterprise

**Version:** 1.0
**Date:** 2025-11-17
**Public:** Architectes, Développeurs, Administrateurs

---

## Concepts Multi-Tenant

### Qu'est-ce que le Multi-Tenant ?

**Définition :** Architecture où une seule instance de l'application sert plusieurs clients (tenants / locataires) tout en garantissant l'isolation complète des données.

**Analogie :** Un immeuble avec plusieurs appartements. Chaque appartement (tenant) est isolé, mais partage l'infrastructure commune (électricité, ascenseur = base de données, API).

### Avantages

**Pour les fournisseurs SaaS (vous) :**

- ✅ **Coûts réduits** : Une seule infrastructure pour tous les clients
- ✅ **Maintenance simplifiée** : Un seul codebase, un seul déploiement
- ✅ **Scalabilité** : Ajouter un nouveau client = créer un tenant (pas de nouveau serveur)
- ✅ **Monitoring centralisé** : Une seule stack Prometheus/Grafana pour tous

**Pour les clients (tenants) :**

- ✅ **Isolation des données** : Tenant A ne voit jamais les données de Tenant B
- ✅ **Branding personnalisé** : Logo, couleurs, nom d'application par tenant
- ✅ **Quotas flexibles** : Rate limits et features selon le tier (free, pro, enterprise)
- ✅ **SSO & Multi-user** : Support de plusieurs utilisateurs par tenant

### Architecture Cartae Multi-Tenant

**3 niveaux d'isolation :**

1. **Database Level** : Colonne `tenant_id` sur toutes les tables
2. **Application Level** : Middleware détecte tenant et filtre queries
3. **Network Level** : Sous-domaines optionnels (ex: `acme.cartae.com`)

**Schéma simplifié :**

```
Request → Middleware Tenant Detection → Database Query avec tenant_id filter
```

---

## Isolation des Données

### Database Schema

**Toutes les tables sensibles ont une colonne `tenant_id` :**

```sql
-- Table plugins (exemple)
CREATE TABLE plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,     -- ← Clé d'isolation
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Index pour performance
  INDEX idx_tenant_plugins (tenant_id, created_at DESC),

  -- Foreign key vers table tenants
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Table users (multi-user support)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,     -- ← Appartient à un tenant
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,           -- admin, user, guest

  UNIQUE (tenant_id, email),           -- Email unique par tenant
  INDEX idx_tenant_users (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Table tenants (master table)
CREATE TABLE tenants (
  id VARCHAR(255) PRIMARY KEY,         -- tenant-acme-corp
  name VARCHAR(255) NOT NULL,          -- ACME Corporation
  tier VARCHAR(50) NOT NULL,           -- free, starter, pro, enterprise
  status VARCHAR(50) DEFAULT 'active', -- active, suspended, deleted
  features JSONB DEFAULT '{}',         -- {multiUser: true, sso: true}
  branding JSONB DEFAULT '{}',         -- {appName: "ACME Tools", logoUrl: "..."}
  quotas JSONB DEFAULT '{}',           -- {maxUsers: 100, rateLimitPerMinute: 1000}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Migration SQL (ajouter support multi-tenant) :**

```sql
-- /Users/moi/Nextcloud/10.Scripts/02.Cartae/cartae-session-87-polish/infra/database/migrations/001_add_tenant_support.sql

-- 1. Créer table tenants
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  features JSONB DEFAULT '{"multiUser": false, "analytics": false}',
  branding JSONB DEFAULT '{}',
  quotas JSONB DEFAULT '{"maxUsers": 10, "maxPlugins": 100, "rateLimitPerMinute": 100}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Ajouter colonne tenant_id aux tables existantes
ALTER TABLE plugins ADD COLUMN tenant_id VARCHAR(255);
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(255);
ALTER TABLE ratings ADD COLUMN tenant_id VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN tenant_id VARCHAR(255);

-- 3. Créer tenant par défaut (pour données existantes)
INSERT INTO tenants (id, name, tier, status) VALUES
  ('tenant-default', 'Default Organization', 'enterprise', 'active')
ON CONFLICT (id) DO NOTHING;

-- 4. Migrer données existantes vers tenant par défaut
UPDATE plugins SET tenant_id = 'tenant-default' WHERE tenant_id IS NULL;
UPDATE users SET tenant_id = 'tenant-default' WHERE tenant_id IS NULL;
UPDATE ratings SET tenant_id = 'tenant-default' WHERE tenant_id IS NULL;
UPDATE audit_logs SET tenant_id = 'tenant-default' WHERE tenant_id IS NULL;

-- 5. Rendre tenant_id obligatoire (NOT NULL)
ALTER TABLE plugins ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ratings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;

-- 6. Ajouter foreign keys
ALTER TABLE plugins ADD CONSTRAINT fk_plugins_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE users ADD CONSTRAINT fk_users_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ratings ADD CONSTRAINT fk_ratings_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 7. Créer indexes pour performance
CREATE INDEX idx_plugins_tenant ON plugins(tenant_id, created_at DESC);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_ratings_tenant ON ratings(tenant_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);

-- 8. Ajouter contraintes unicité par tenant
ALTER TABLE users ADD CONSTRAINT unique_email_per_tenant
  UNIQUE (tenant_id, email);
```

**Exécuter la migration :**

```bash
# Via Prisma
pnpm --filter @cartae/database-api prisma migrate deploy

# Ou manuellement via psql
psql -U cartae -d cartae_production -f infra/database/migrations/001_add_tenant_support.sql
```

### Row-Level Security (RLS)

**PostgreSQL RLS garantit l'isolation même en cas d'erreur applicative :**

```sql
-- Activer RLS sur table plugins
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;

-- Policy : Utilisateur voit uniquement son tenant
CREATE POLICY tenant_isolation ON plugins
  USING (tenant_id = current_setting('app.current_tenant_id')::VARCHAR);

-- Policy : Admin peut voir tous les tenants
CREATE POLICY admin_access ON plugins
  USING (
    current_setting('app.current_user_role')::VARCHAR = 'admin'
    OR tenant_id = current_setting('app.current_tenant_id')::VARCHAR
  );
```

**Configuration session PostgreSQL (depuis l'application) :**

```typescript
// Avant chaque query, définir tenant_id dans session
await prisma.$executeRaw`
  SET app.current_tenant_id = ${tenantId};
  SET app.current_user_role = ${userRole};
`;

// Toutes les queries suivantes sont automatiquement filtrées par RLS
const plugins = await prisma.plugin.findMany(); // Retourne uniquement plugins du tenant
```

---

## Rate Limits par Tier

### Tiers d'Abonnement

**Cartae Enterprise propose 4 tiers :**

| Tier         | Prix/mois | Users | Plugins | Rate Limit (req/min) | Features                                      |
| ------------ | --------- | ----- | ------- | -------------------- | --------------------------------------------- |
| Free         | $0        | 5     | 50      | 100                  | Base features                                 |
| Starter      | $29       | 20    | 200     | 500                  | + Analytics, Priority support                 |
| Pro          | $99       | 100   | 1000    | 1000                 | + Custom branding, SSO                        |
| Enterprise   | Custom    | ∞     | ∞       | 10000                | + Dedicated instance, SLA 99.9%, Multi-region |

### Configuration Tier par Tenant

**Créer tenant avec tier spécifique :**

```bash
curl -X POST https://api.cartae.com/api/v1/admin/tenants \
  -H "X-API-Key: VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "tenant-acme-corp",
    "name": "ACME Corporation",
    "tier": "enterprise",
    "quotas": {
      "maxUsers": 500,
      "maxPlugins": 5000,
      "rateLimitPerMinute": 10000
    }
  }'
```

**Middleware vérifie automatiquement le tier :**

```typescript
// apps/api/src/middleware/rate-limiter-advanced.ts
import { rateLimiterAdvanced } from './rate-limiter-advanced';

app.use('*', rateLimiterAdvanced({
  backend: 'redis',
  redisClient: redisClient,
  perTenant: true,

  // Limites par tier (défaut)
  tenantLimits: {
    'tenant-free': 100,
    'tenant-starter': 500,
    'tenant-pro': 1000,
    'tenant-enterprise': 10000,
  },

  // Fonction personnalisée pour lookup du tenant
  async getTenantLimit(tenantId: string): Promise<number> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tier: true, quotas: true },
    });

    if (!tenant) return 100; // Défaut si tenant inconnu

    // Utiliser quota custom si défini
    if (tenant.quotas?.rateLimitPerMinute) {
      return tenant.quotas.rateLimitPerMinute;
    }

    // Sinon utiliser limite par tier
    const tierLimits = {
      'free': 100,
      'starter': 500,
      'pro': 1000,
      'enterprise': 10000,
    };

    return tierLimits[tenant.tier] || 100;
  },
}));
```

### Enforcement des Quotas

**Vérifier quotas avant opérations critiques :**

```typescript
// apps/api/src/middleware/quota-enforcer.ts
export const enforceQuota = (resource: 'users' | 'plugins') => {
  return async (c: Context, next: Next) => {
    const tenantId = getTenantID(c.req);

    // Récupérer tenant avec quotas
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { quotas: true },
    });

    // Compter ressources existantes
    const count = await prisma[resource].count({
      where: { tenant_id: tenantId },
    });

    // Vérifier quota
    const quota = tenant.quotas?.[`max${capitalize(resource)}`] || 100;

    if (count >= quota) {
      return c.json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: `Your plan allows maximum ${quota} ${resource}. Upgrade to increase limit.`,
          quota,
          current: count,
          upgradeUrl: 'https://cartae.com/pricing',
        },
      }, 403);
    }

    await next();
  };
};

// Utilisation
app.post('/api/v1/plugins', enforceQuota('plugins'), async (c) => {
  // Créer plugin uniquement si quota OK
});
```

---

## Branding Dynamique par Tenant

### Variables Branding

**Chaque tenant peut personnaliser :**

| Variable         | Type   | Exemple                                 |
| ---------------- | ------ | --------------------------------------- |
| `appName`        | string | "ACME Internal Tools"                   |
| `logoUrl`        | string | "https://cdn.acme.com/logo.png"         |
| `faviconUrl`     | string | "https://cdn.acme.com/favicon.ico"      |
| `primaryColor`   | string | "#FF6600"                               |
| `secondaryColor` | string | "#333333"                               |
| `fontFamily`     | string | "Roboto, sans-serif"                    |
| `customCSS`      | string | ".navbar { background: red; }"          |
| `supportEmail`   | string | "support@acme.com"                      |

### Configuration Branding via API

**Mettre à jour branding d'un tenant :**

```bash
curl -X PATCH https://api.cartae.com/api/v1/admin/tenants/tenant-acme-corp \
  -H "X-API-Key: VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "branding": {
      "appName": "ACME Plugin Marketplace",
      "logoUrl": "https://cdn.acme.com/marketplace-logo.svg",
      "faviconUrl": "https://cdn.acme.com/favicon.ico",
      "primaryColor": "#CC0000",
      "secondaryColor": "#666666",
      "fontFamily": "Inter, system-ui, sans-serif",
      "supportEmail": "marketplace-support@acme.com"
    }
  }'
```

### Frontend Branding Injection

**Le frontend charge dynamiquement le branding :**

```typescript
// apps/web/src/hooks/useTenantBranding.ts
import { useEffect, useState } from 'react';

interface TenantBranding {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export function useTenantBranding() {
  const [branding, setBranding] = useState<TenantBranding | null>(null);

  useEffect(() => {
    async function loadBranding() {
      // 1. Détecter tenant depuis URL ou header
      const tenantId = detectTenantId();

      // 2. Fetch branding depuis API
      const response = await fetch(
        `https://api.cartae.com/api/v1/tenants/${tenantId}/branding`
      );
      const data = await response.json();

      // 3. Appliquer branding
      setBranding(data.branding);

      // 4. Injecter CSS variables
      if (data.branding) {
        document.documentElement.style.setProperty(
          '--color-primary',
          data.branding.primaryColor
        );
        document.documentElement.style.setProperty(
          '--color-secondary',
          data.branding.secondaryColor
        );
        document.documentElement.style.setProperty(
          '--font-family',
          data.branding.fontFamily
        );

        // 5. Mettre à jour title et favicon
        document.title = data.branding.appName;
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
          favicon.setAttribute('href', data.branding.faviconUrl);
        }
      }
    }

    loadBranding();
  }, []);

  return branding;
}

// Détecter tenant_id depuis plusieurs sources
function detectTenantId(): string {
  // 1. Header X-Tenant-ID (priorité haute)
  const headerTenant = /* récupérer depuis request */;
  if (headerTenant) return headerTenant;

  // 2. Sous-domaine (ex: acme.cartae.com → tenant-acme)
  const subdomain = window.location.hostname.split('.')[0];
  if (subdomain !== 'app' && subdomain !== 'www') {
    return `tenant-${subdomain}`;
  }

  // 3. Query parameter (?tenant=tenant-acme)
  const params = new URLSearchParams(window.location.search);
  const queryTenant = params.get('tenant');
  if (queryTenant) return queryTenant;

  // 4. LocalStorage (fallback)
  return localStorage.getItem('tenantId') || 'tenant-default';
}
```

**Utilisation dans composant React :**

```tsx
// apps/web/src/components/Header.tsx
import { useTenantBranding } from '../hooks/useTenantBranding';

export function Header() {
  const branding = useTenantBranding();

  if (!branding) {
    return <div>Loading...</div>;
  }

  return (
    <header className="navbar">
      <img src={branding.logoUrl} alt={branding.appName} />
      <h1 style={{ fontFamily: branding.fontFamily }}>
        {branding.appName}
      </h1>
    </header>
  );
}
```

---

## API Tenant

### Header `X-Tenant-ID` Requis

**Toutes les requêtes API doivent inclure le header `X-Tenant-ID` :**

```bash
# Exemple : Lister plugins d'un tenant
curl https://api.cartae.com/api/v1/plugins \
  -H "X-Tenant-ID: tenant-acme-corp" \
  -H "Authorization: Bearer VOTRE_JWT_TOKEN"

# Réponse : Uniquement plugins du tenant-acme-corp
{
  "success": true,
  "data": [
    {
      "id": "plugin-123",
      "tenant_id": "tenant-acme-corp",
      "name": "ACME Plugin",
      "version": "1.0.0"
    }
  ]
}
```

**Erreur si header manquant :**

```json
{
  "success": false,
  "error": {
    "code": "TENANT_ID_REQUIRED",
    "message": "Header X-Tenant-ID is required for this endpoint",
    "status": 400
  }
}
```

### Endpoints Tenant

**GET /api/v1/tenants/:tenantId (Détails d'un tenant)**

```bash
curl https://api.cartae.com/api/v1/tenants/tenant-acme-corp \
  -H "X-Tenant-ID: tenant-acme-corp" \
  -H "Authorization: Bearer TOKEN"
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "id": "tenant-acme-corp",
    "name": "ACME Corporation",
    "tier": "enterprise",
    "status": "active",
    "features": {
      "multiUser": true,
      "analytics": true,
      "customBranding": true,
      "sso": true
    },
    "branding": {
      "appName": "ACME Marketplace",
      "logoUrl": "https://cdn.acme.com/logo.png",
      "primaryColor": "#CC0000"
    },
    "quotas": {
      "maxUsers": 500,
      "maxPlugins": 5000,
      "rateLimitPerMinute": 10000
    },
    "usage": {
      "currentUsers": 42,
      "currentPlugins": 237,
      "apiCallsThisMonth": 1250000
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-11-17T08:45:00Z"
  }
}
```

**GET /api/v1/tenants/:tenantId/branding (Branding public)**

```bash
# Endpoint public (pas d'auth requis) pour charger branding au démarrage
curl https://api.cartae.com/api/v1/tenants/tenant-acme-corp/branding
```

**POST /api/v1/admin/tenants (Créer tenant - Admin seulement)**

```bash
curl -X POST https://api.cartae.com/api/v1/admin/tenants \
  -H "X-API-Key: ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "tenant-new-company",
    "name": "New Company Inc.",
    "tier": "pro",
    "features": {
      "multiUser": true,
      "analytics": true,
      "customBranding": true
    }
  }'
```

**PATCH /api/v1/admin/tenants/:tenantId (Modifier tenant - Admin seulement)**

```bash
curl -X PATCH https://api.cartae.com/api/v1/admin/tenants/tenant-acme-corp \
  -H "X-API-Key: ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "enterprise",
    "quotas": {
      "maxUsers": 1000,
      "rateLimitPerMinute": 20000
    }
  }'
```

**DELETE /api/v1/admin/tenants/:tenantId (Supprimer tenant - Admin seulement)**

```bash
curl -X DELETE https://api.cartae.com/api/v1/admin/tenants/tenant-acme-corp \
  -H "X-API-Key: ADMIN_API_KEY"

# ⚠️ ATTENTION : Supprime TOUTES les données du tenant (CASCADE)
```

### Permissions (Admin Only)

**Endpoints `/api/v1/admin/tenants/*` nécessitent :**

1. **Header `X-API-Key`** : Clé API admin (définie dans `.env.local`)
2. **IP Whitelist** : IP autorisée (optionnel mais recommandé)
3. **Audit Logging** : Toutes les opérations sont loggées

**Middleware de protection :**

```typescript
// apps/api/src/middleware/admin-auth.ts
export const requireAdminAuth = () => {
  return async (c: Context, next: Next) => {
    const apiKey = c.req.header('X-API-Key');

    // Vérifier API key
    if (!apiKey || apiKey !== process.env.API_KEY_ADMIN) {
      return c.json({ error: 'Unauthorized: Invalid API key' }, 401);
    }

    // Logger opération admin
    await auditLog({
      event: 'admin.operation',
      userId: 'admin',
      ip: getClientIP(c.req),
      path: c.req.path,
      method: c.req.method,
    });

    await next();
  };
};

// Appliquer à toutes les routes admin
app.use('/api/v1/admin/*', requireAdminAuth());
```

---

## Testing Isolation

### Test 1 : Isolation des Données

**Objectif :** Vérifier que Tenant A ne voit pas les données de Tenant B.

```bash
# 1. Créer plugin pour Tenant A
curl -X POST https://api.cartae.com/api/v1/plugins \
  -H "X-Tenant-ID: tenant-a" \
  -H "Authorization: Bearer TOKEN_TENANT_A" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plugin A",
    "version": "1.0.0",
    "description": "Plugin confidentiel pour Tenant A"
  }'

# Réponse : Plugin créé avec tenant_id = tenant-a

# 2. Créer plugin pour Tenant B
curl -X POST https://api.cartae.com/api/v1/plugins \
  -H "X-Tenant-ID: tenant-b" \
  -H "Authorization: Bearer TOKEN_TENANT_B" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plugin B",
    "version": "2.0.0",
    "description": "Plugin confidentiel pour Tenant B"
  }'

# 3. Tenant A liste ses plugins
curl https://api.cartae.com/api/v1/plugins \
  -H "X-Tenant-ID: tenant-a" \
  -H "Authorization: Bearer TOKEN_TENANT_A"

# Réponse attendue : Seulement "Plugin A" (pas "Plugin B")
{
  "success": true,
  "data": [
    {
      "id": "plugin-xxx",
      "tenant_id": "tenant-a",
      "name": "Plugin A",
      "version": "1.0.0"
    }
  ],
  "meta": { "total": 1 }
}

# 4. Tenant B liste ses plugins
curl https://api.cartae.com/api/v1/plugins \
  -H "X-Tenant-ID: tenant-b" \
  -H "Authorization: Bearer TOKEN_TENANT_B"

# Réponse attendue : Seulement "Plugin B" (pas "Plugin A")
{
  "success": true,
  "data": [
    {
      "id": "plugin-yyy",
      "tenant_id": "tenant-b",
      "name": "Plugin B",
      "version": "2.0.0"
    }
  ],
  "meta": { "total": 1 }
}
```

**✅ SUCCÈS :** Isolation complète des données.

### Test 2 : Rate Limiting par Tier

**Objectif :** Vérifier que les rate limits sont appliqués selon le tier.

```bash
# 1. Créer tenant Free (100 req/min)
curl -X POST https://api.cartae.com/api/v1/admin/tenants \
  -H "X-API-Key: ADMIN_KEY" \
  -d '{"id": "tenant-free", "tier": "free"}'

# 2. Créer tenant Enterprise (10k req/min)
curl -X POST https://api.cartae.com/api/v1/admin/tenants \
  -H "X-API-Key: ADMIN_KEY" \
  -d '{"id": "tenant-enterprise", "tier": "enterprise"}'

# 3. Tester tenant Free (doit être limité à 100/min)
for i in {1..150}; do
  curl https://api.cartae.com/api/v1/plugins \
    -H "X-Tenant-ID: tenant-free" \
    -w "%{http_code}\n" -o /dev/null -s
done

# Sortie attendue :
# 200 (requêtes 1-100)
# 429 (requêtes 101-150) ← Rate limit exceeded

# 4. Tester tenant Enterprise (150 req OK sur quota 10k)
for i in {1..150}; do
  curl https://api.cartae.com/api/v1/plugins \
    -H "X-Tenant-ID: tenant-enterprise" \
    -w "%{http_code}\n" -o /dev/null -s
done

# Sortie attendue :
# 200 (toutes les 150 requêtes passent)
```

**✅ SUCCÈS :** Rate limits différenciés par tier.

### Test 3 : Branding Dynamique

**Objectif :** Vérifier que chaque tenant voit son propre branding.

```bash
# 1. Configurer branding Tenant A
curl -X PATCH https://api.cartae.com/api/v1/admin/tenants/tenant-a \
  -H "X-API-Key: ADMIN_KEY" \
  -d '{
    "branding": {
      "appName": "Tenant A Marketplace",
      "primaryColor": "#FF0000"
    }
  }'

# 2. Configurer branding Tenant B
curl -X PATCH https://api.cartae.com/api/v1/admin/tenants/tenant-b \
  -H "X-API-Key: ADMIN_KEY" \
  -d '{
    "branding": {
      "appName": "Tenant B Portal",
      "primaryColor": "#0000FF"
    }
  }'

# 3. Fetch branding Tenant A
curl https://api.cartae.com/api/v1/tenants/tenant-a/branding

# Réponse :
{
  "success": true,
  "data": {
    "appName": "Tenant A Marketplace",
    "primaryColor": "#FF0000"
  }
}

# 4. Fetch branding Tenant B
curl https://api.cartae.com/api/v1/tenants/tenant-b/branding

# Réponse :
{
  "success": true,
  "data": {
    "appName": "Tenant B Portal",
    "primaryColor": "#0000FF"
  }
}
```

**✅ SUCCÈS :** Branding isolé par tenant.

---

## Best Practices

### 1. Toujours Valider le Header `X-Tenant-ID`

**Middleware de validation :**

```typescript
export const validateTenantHeader = () => {
  return async (c: Context, next: Next) => {
    const tenantId = c.req.header('X-Tenant-ID');

    if (!tenantId) {
      return c.json({
        error: 'Header X-Tenant-ID is required',
      }, 400);
    }

    // Vérifier que le tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return c.json({
        error: 'Invalid tenant ID',
      }, 404);
    }

    // Vérifier que le tenant est actif
    if (tenant.status !== 'active') {
      return c.json({
        error: 'Tenant account is suspended',
      }, 403);
    }

    // Stocker tenant dans context
    c.set('tenant', tenant);

    await next();
  };
};

// Appliquer globalement
app.use('/api/v1/*', validateTenantHeader());
```

### 2. Index Database sur `tenant_id`

**Performance critique pour queries multi-tenant :**

```sql
-- Index composé (tenant_id + date)
CREATE INDEX idx_plugins_tenant_date ON plugins(tenant_id, created_at DESC);

-- Query optimisée
EXPLAIN ANALYZE
SELECT * FROM plugins
WHERE tenant_id = 'tenant-acme-corp'
ORDER BY created_at DESC
LIMIT 20;

-- Doit utiliser idx_plugins_tenant_date (Index Scan)
```

### 3. Audit Logging Obligatoire

**Logger toutes les opérations critiques avec tenant_id :**

```typescript
await auditLog({
  event: 'plugin.created',
  tenantId: 'tenant-acme-corp',
  userId: 'user-123',
  resourceId: 'plugin-456',
  metadata: { name: 'New Plugin', version: '1.0.0' },
});
```

### 4. Testing Automatisé

**Tests d'intégration pour isolation :**

```typescript
// tests/integration/tenant-isolation.test.ts
import { describe, it, expect } from 'vitest';

describe('Tenant Isolation', () => {
  it('should isolate data between tenants', async () => {
    // Créer plugin pour tenant A
    const pluginA = await createPlugin({
      tenantId: 'tenant-a',
      name: 'Plugin A',
    });

    // Créer plugin pour tenant B
    const pluginB = await createPlugin({
      tenantId: 'tenant-b',
      name: 'Plugin B',
    });

    // Fetch plugins tenant A
    const pluginsA = await fetchPlugins({ tenantId: 'tenant-a' });
    expect(pluginsA).toHaveLength(1);
    expect(pluginsA[0].id).toBe(pluginA.id);

    // Fetch plugins tenant B
    const pluginsB = await fetchPlugins({ tenantId: 'tenant-b' });
    expect(pluginsB).toHaveLength(1);
    expect(pluginsB[0].id).toBe(pluginB.id);
  });
});
```

---

## Checklist Multi-Tenant Production

**Database :**

- [ ] ✅ Colonne `tenant_id` ajoutée à toutes les tables sensibles
- [ ] ✅ Foreign keys vers `tenants` table avec `ON DELETE CASCADE`
- [ ] ✅ Indexes sur `(tenant_id, created_at)` pour performance
- [ ] ✅ Row-Level Security (RLS) activée (optionnel mais recommandé)

**Application :**

- [ ] ✅ Middleware validation `X-Tenant-ID` activé
- [ ] ✅ Rate limiting configuré par tier
- [ ] ✅ Quota enforcement activé (users, plugins)
- [ ] ✅ Branding dynamique fonctionnel

**Testing :**

- [ ] ✅ Tests isolation données (Tenant A vs Tenant B)
- [ ] ✅ Tests rate limiting par tier
- [ ] ✅ Tests branding dynamique
- [ ] ✅ Tests quota enforcement

**Monitoring :**

- [ ] ✅ Métriques par tenant (Prometheus labels `tenant_id`)
- [ ] ✅ Audit logs incluent `tenant_id`
- [ ] ✅ Dashboards Grafana par tenant

---

**Références :**

- **Quickstart :** [ENTERPRISE-QUICKSTART.md](./ENTERPRISE-QUICKSTART.md)
- **Sécurité :** [SECURITY-CONFIGURATION.md](./SECURITY-CONFIGURATION.md)
- **Monitoring :** [MONITORING-GUIDE.md](./MONITORING-GUIDE.md)
