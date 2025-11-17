# Guide de Configuration Sécurité - Cartae Enterprise

**Version:** 1.0
**Date:** 2025-11-17
**Public:** Administrateurs sécurité et DevSecOps

---

## Vue d'Ensemble

Cartae Enterprise implémente une approche **Defense in Depth** (défense en profondeur) avec plusieurs couches de sécurité :

1. **Network Security** : Segmentation réseau, CORS restrictif, TLS 1.3
2. **Application Security** : Rate limiting, input validation, OWASP Top 10 compliance
3. **Data Security** : Encryption at rest/in transit, secrets management (Vault)
4. **Access Control** : RBAC, MFA, JWT validation
5. **Monitoring & Response** : Audit logging, real-time alerts, automated blocking

**Statut Compliance :**

- ✅ OWASP Top 10:2021 (10/10)
- ✅ SOC 2 Type II ready
- ✅ GDPR compliant (data isolation par tenant)
- ✅ ISO 27001 aligned

---

## Rate Limiting (Limitation de Débit)

### Architecture

Le rate limiting protège contre :

- **Brute force attacks** : Tentatives de connexion répétées
- **DDoS** : Déni de service distribué
- **API abuse** : Scraping, spam, utilisation excessive

**Implémentation :** Middleware `rate-limiter-advanced.ts` avec 3 backends supportés :

1. **Memory** : In-memory cache (développement)
2. **Redis** : Distributed cache (production recommandé)
3. **Cloudflare KV** : Edge cache (pour Workers deployment)

### Configuration par Défaut

**Fichier `.env.local` :**

```bash
# Backend de stockage
RATE_LIMIT_BACKEND="redis"          # Options: memory, redis, kv

# Limites globales par défaut
RATE_LIMIT_DEFAULT=100              # Requêtes par fenêtre
RATE_LIMIT_WINDOW_MS=60000          # Fenêtre de 1 minute (60000ms)

# Whitelisting d'IPs (jamais limitées)
RATE_LIMIT_SKIP_IPS="127.0.0.1,::1,10.0.0.0/8"
```

**Code TypeScript (configuration automatique) :**

```typescript
// apps/api/src/index.ts
import { rateLimiterAdvanced, rateLimitPresets } from './middleware/rate-limiter-advanced';

// Option 1 : Preset production (recommandé)
app.use('*', rateLimiterAdvanced(
  rateLimitPresets.production(env.RATE_LIMIT_KV)
));

// Option 2 : Configuration manuelle
app.use('*', rateLimiterAdvanced({
  backend: 'redis',
  redisClient: redisClient,
  limit: 100,
  windowMs: 60 * 1000, // 1 minute
  perEndpoint: true,
  perTenant: true,
}));
```

### Personnalisation par Endpoint

Certains endpoints nécessitent des limites plus strictes (ex: création de comptes, opérations critiques).

**Configuration via `endpointLimits` :**

```typescript
app.use('*', rateLimiterAdvanced({
  backend: 'redis',
  redisClient: redisClient,
  limit: 100, // Limite par défaut
  windowMs: 60 * 1000,
  perEndpoint: true,

  // Limites spécifiques par endpoint
  endpointLimits: {
    // Endpoints critiques (strictes)
    'POST /api/v1/auth/login': 5,           // 5 tentatives/min
    'POST /api/v1/auth/register': 3,        // 3 créations/min
    'POST /api/v1/plugins': 10,             // 10 créations/min
    'POST /api/v1/ratings': 5,              // 5 votes/min
    'POST /api/v1/plugins/:id/report': 3,   // 3 signalements/min

    // Endpoints admin (modérées)
    'DELETE /api/v1/admin/plugins/:id': 20, // 20 suppressions/min
    'POST /api/v1/admin/tenants': 10,       // 10 créations tenant/min

    // Endpoints publics (relaxées)
    'GET /api/v1/plugins': 200,             // 200 lectures/min
    'GET /api/v1/plugins/:id': 500,         // 500 détails/min
  },
}));
```

### Personnalisation par Tenant Tier

Les tenants Enterprise bénéficient de quotas plus élevés que les tenants Free.

**Configuration via `tenantLimits` :**

```typescript
app.use('*', rateLimiterAdvanced({
  backend: 'redis',
  redisClient: redisClient,
  perTenant: true,

  // Limites par tier (niveau d'abonnement)
  tenantLimits: {
    'tenant-free': 100,          // Free tier : 100 req/min
    'tenant-starter': 500,       // Starter : 500 req/min
    'tenant-pro': 1000,          // Pro : 1000 req/min
    'tenant-enterprise': 10000,  // Enterprise : 10k req/min
  },
}));
```

**Le tenant est détecté automatiquement via :**

1. Header `X-Tenant-ID` (priorité haute)
2. Token JWT claim `tenant_id`
3. Sous-domaine (ex: `acme.cartae.com`)

### Variables d'Environnement

**Résumé des variables configurables :**

| Variable                    | Type     | Défaut   | Description                                    |
| --------------------------- | -------- | -------- | ---------------------------------------------- |
| `RATE_LIMIT_BACKEND`        | string   | `memory` | Backend : `memory`, `redis`, `kv`              |
| `RATE_LIMIT_DEFAULT`        | number   | `100`    | Requêtes par fenêtre (par défaut)              |
| `RATE_LIMIT_WINDOW_MS`      | number   | `60000`  | Fenêtre en millisecondes (60s = 1 min)         |
| `RATE_LIMIT_SKIP_IPS`       | string   | `""`     | IPs whitelistées (séparées par virgule)        |
| `RATE_LIMIT_PER_ENDPOINT`   | boolean  | `true`   | Activer limites spécifiques par endpoint       |
| `RATE_LIMIT_PER_TENANT`     | boolean  | `true`   | Activer limites spécifiques par tenant         |

### Headers de Réponse

Chaque réponse inclut des headers standard pour informer le client :

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 2025-11-17T10:45:00Z
```

**En cas de dépassement (HTTP 429) :**

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-11-17T10:45:00Z
Retry-After: 45

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "status": 429,
    "retryAfter": 45,
    "limit": 100,
    "remaining": 0,
    "resetAt": "2025-11-17T10:45:00Z"
  }
}
```

### Backend Redis (Production)

**Configuration Docker Compose :**

```yaml
# infra/docker/docker-compose.redis.yml
version: '3.8'

services:
  redis:
    image: redis:7.2-alpine
    container_name: cartae-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --appendonly yes
      --appendfsync everysec
      --maxmemory 2gb
      --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    networks:
      - cartae-network

volumes:
  redis-data:

networks:
  cartae-network:
    external: true
```

**Variables d'environnement :**

```bash
REDIS_URL="redis://:PASSWORD@redis:6379/0"
REDIS_PASSWORD="GENERER_AVEC_openssl_rand_base64_32"
RATE_LIMIT_BACKEND="redis"
```

### Backend Cloudflare KV (Workers)

**Configuration `wrangler.jsonc` :**

```jsonc
{
  "name": "cartae-api",
  "kv_namespaces": [
    {
      "binding": "RATE_LIMIT_KV",
      "id": "VOTRE_KV_NAMESPACE_ID",
      "preview_id": "VOTRE_KV_PREVIEW_ID"
    }
  ]
}
```

**Code TypeScript :**

```typescript
// apps/api/src/index.ts
export default {
  async fetch(request: Request, env: Env) {
    const app = new Hono();

    app.use('*', rateLimiterAdvanced({
      backend: 'kv',
      kvNamespace: env.RATE_LIMIT_KV,
      limit: 1000,
      windowMs: 60 * 1000,
    }));

    return app.fetch(request, env);
  },
};
```

---

## CORS (Cross-Origin Resource Sharing)

### Configuration Restrictive Production

**POURQUOI :** Empêcher des sites malveillants de faire des requêtes à votre API depuis le navigateur.

**Fichier `.env.local` :**

```bash
# Liste blanche d'origines autorisées (séparées par virgule)
ALLOWED_ORIGINS="https://app.cartae.com,https://admin.cartae.com"

# Wildcard pour sous-domaines (attention : moins sécurisé)
ALLOWED_ORIGINS="https://*.cartae.com"

# Développement local (jamais en production)
# ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:5173"
```

**Code TypeScript (middleware CORS) :**

```typescript
// apps/api/src/middleware/cors-handler.ts
import { cors } from 'hono/cors';

export const corsMiddleware = (allowedOrigins: string[]) => {
  return cors({
    origin: (origin) => {
      // Autoriser uniquement les origines whitelistées
      if (!origin) return null; // Pas d'origine (ex: Postman)

      // Vérifier si l'origine est exactement dans la whitelist
      if (allowedOrigins.includes(origin)) {
        return origin;
      }

      // Vérifier les wildcards (ex: *.cartae.com)
      for (const allowed of allowedOrigins) {
        if (allowed.includes('*')) {
          const regex = new RegExp(
            '^' + allowed.replace(/\*/g, '.*') + '$'
          );
          if (regex.test(origin)) {
            return origin;
          }
        }
      }

      // Origine non autorisée
      return null;
    },
    credentials: true, // Autoriser cookies/auth headers
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-API-Key'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // Cache preflight pendant 24h
  });
};
```

**Utilisation :**

```typescript
// apps/api/src/index.ts
import { corsMiddleware } from './middleware/cors-handler';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
app.use('*', corsMiddleware(allowedOrigins));
```

### Tester CORS

```bash
# Test avec origine autorisée (doit réussir)
curl -X OPTIONS https://api.cartae.com/api/v1/plugins \
  -H "Origin: https://app.cartae.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Vérifier header dans réponse :
# Access-Control-Allow-Origin: https://app.cartae.com

# Test avec origine non autorisée (doit échouer)
curl -X OPTIONS https://api.cartae.com/api/v1/plugins \
  -H "Origin: https://malicious-site.com" \
  -v

# Pas de header Access-Control-Allow-Origin dans la réponse
```

⚠️ **Attention :** Ne jamais utiliser `Access-Control-Allow-Origin: *` en production avec credentials activés.

---

## Audit Logging (Journalisation d'Audit)

### Que Log-t-on ?

Les audit logs enregistrent **toutes les opérations critiques** pour traçabilité et forensics :

**Catégories loggées :**

1. **Authentification** : Login, logout, échecs MFA, changement password
2. **Admin Operations** : Création/suppression tenant, modification RBAC, suppression plugin
3. **Critical Actions** : Upload fichier, export données, modification settings sécurité
4. **Security Events** : Rate limit dépassé, CORS blocked, IP bloquée (Fail2ban)

**Exemple de log structuré (JSON) :**

```json
{
  "timestamp": "2025-11-17T10:30:45.123Z",
  "level": "info",
  "event": "admin.plugin.deleted",
  "actor": {
    "userId": "user-123",
    "email": "admin@acme.com",
    "ip": "203.0.113.42",
    "userAgent": "Mozilla/5.0 ..."
  },
  "tenant": {
    "id": "tenant-acme-corp",
    "name": "ACME Corporation"
  },
  "resource": {
    "type": "plugin",
    "id": "plugin-old-version",
    "name": "Old Plugin v1.0"
  },
  "action": "delete",
  "result": "success",
  "metadata": {
    "reason": "security vulnerability",
    "ticketId": "SEC-2024-042"
  }
}
```

### Configuration

**Variables d'environnement :**

```bash
# Activer audit logging
AUDIT_LOG_ENABLED=true

# Niveau minimum (debug, info, warn, error)
AUDIT_LOG_LEVEL="info"

# Destination des logs
AUDIT_LOG_DESTINATION="stdout"   # Options: stdout, file, siem

# Si file :
AUDIT_LOG_FILE_PATH="/var/log/cartae/audit.log"
AUDIT_LOG_MAX_SIZE="100M"
AUDIT_LOG_RETENTION_DAYS=365      # 1 an minimum

# Si SIEM (Datadog, Splunk, etc.) :
AUDIT_LOG_SIEM_URL="https://http-intake.logs.datadoghq.com/v1/input"
AUDIT_LOG_SIEM_API_KEY="VOTRE_CLE_API_DATADOG"
```

**Code TypeScript (middleware) :**

```typescript
// apps/api/src/middleware/audit-logger.ts
export const auditLogger = () => {
  return async (c: Context, next: Next) => {
    const startTime = Date.now();

    // Capturer infos requête
    const requestData = {
      method: c.req.method,
      path: c.req.path,
      ip: getClientIP(c.req),
      userAgent: c.req.header('User-Agent'),
      tenantId: getTenantID(c.req),
      userId: c.get('userId'), // Depuis JWT
    };

    await next();

    // Logger après réponse
    const duration = Date.now() - startTime;
    const statusCode = c.res.status;

    // Logger uniquement les opérations critiques
    const criticalPaths = [
      '/api/v1/admin/',
      '/api/v1/auth/',
      '/api/v1/plugins',  // POST/DELETE uniquement
    ];

    const isCritical = criticalPaths.some(path =>
      c.req.path.startsWith(path)
    );

    if (isCritical || statusCode >= 400) {
      await writeAuditLog({
        ...requestData,
        statusCode,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
  };
};
```

### Format Logs (JSON Structuré)

**Avantages du JSON :**

- Parsing automatique par SIEM (Datadog, Splunk, ELK)
- Recherche facile avec `jq` ou Loki LogQL
- Intégration native avec Prometheus/Grafana

**Exemple de parsing avec `jq` :**

```bash
# Tous les échecs de login dans la dernière heure
cat /var/log/cartae/audit.log | \
  jq 'select(.event == "auth.login.failed" and .timestamp > "2025-11-17T09:00:00Z")'

# Top 10 IPs avec le plus d'échecs
cat /var/log/cartae/audit.log | \
  jq -r 'select(.result == "failure") | .actor.ip' | \
  sort | uniq -c | sort -rn | head -10
```

### Intégration SIEM

**Exemple : Datadog**

```typescript
// apps/api/src/utils/siem-logger.ts
export async function sendToDatadog(log: AuditLog) {
  await fetch(process.env.AUDIT_LOG_SIEM_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': process.env.AUDIT_LOG_SIEM_API_KEY!,
    },
    body: JSON.stringify({
      ddsource: 'cartae-api',
      ddtags: `env:production,tenant:${log.tenant.id}`,
      hostname: 'api.cartae.com',
      message: JSON.stringify(log),
      service: 'cartae-audit',
    }),
  });
}
```

**Exemple : Splunk**

```bash
# Configurer Splunk HTTP Event Collector
AUDIT_LOG_SIEM_URL="https://splunk.acme.com:8088/services/collector"
AUDIT_LOG_SIEM_API_KEY="VOTRE_HEC_TOKEN"
```

```typescript
export async function sendToSplunk(log: AuditLog) {
  await fetch(process.env.AUDIT_LOG_SIEM_URL!, {
    method: 'POST',
    headers: {
      'Authorization': `Splunk ${process.env.AUDIT_LOG_SIEM_API_KEY}`,
    },
    body: JSON.stringify({
      event: log,
      sourcetype: 'cartae:audit',
      index: 'security',
    }),
  });
}
```

---

## Security Headers (En-têtes de Sécurité)

### CSP (Content Security Policy)

**POURQUOI :** Prévenir XSS (Cross-Site Scripting) en contrôlant quelles ressources peuvent être chargées.

**Configuration stricte (API) :**

```typescript
// apps/api/src/middleware/security-headers.ts
export const securityHeadersAPI = () => {
  return async (c: Context, next: Next) => {
    // CSP stricte pour API (pas de scripts, pas d'images)
    c.header('Content-Security-Policy', [
      "default-src 'none'",
      "frame-ancestors 'none'",
    ].join('; '));

    await next();
  };
};
```

**Configuration modérée (Frontend) :**

```typescript
export const securityHeadersFrontend = () => {
  return async (c: Context, next: Next) => {
    c.header('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.cartae.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.cartae.com",
      "frame-ancestors 'none'",
    ].join('; '));

    await next();
  };
};
```

### HSTS (HTTP Strict Transport Security)

**POURQUOI :** Forcer HTTPS pour toutes les requêtes futures (empêcher downgrade attacks).

```typescript
c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
```

**Paramètres :**

- `max-age=31536000` : 1 an (365 jours)
- `includeSubDomains` : Appliquer à tous les sous-domaines
- `preload` : Inclusion dans les listes HSTS des navigateurs

⚠️ **Attention :** Une fois activé avec `preload`, impossible de revenir en arrière facilement.

### X-Frame-Options

**POURQUOI :** Empêcher clickjacking (iframe malveillante).

```typescript
c.header('X-Frame-Options', 'DENY');
```

**Options :**

- `DENY` : Jamais dans iframe (recommandé)
- `SAMEORIGIN` : Uniquement iframe du même domaine
- ~~`ALLOW-FROM`~~ : Obsolète, utiliser CSP `frame-ancestors` à la place

### X-Content-Type-Options

**POURQUOI :** Empêcher MIME sniffing (navigateur devine le type MIME).

```typescript
c.header('X-Content-Type-Options', 'nosniff');
```

### Configuration Complète (Presets)

**Preset API (strict) :**

```typescript
export const securityHeadersPresets = {
  api: () => {
    return {
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };
  },

  frontend: () => {
    return {
      // CSP plus permissive pour frontend
      'Content-Security-Policy': "default-src 'self'; ...",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
    };
  },

  development: () => {
    return {
      // CSP désactivée en dev (pour HMR, etc.)
      'X-Content-Type-Options': 'nosniff',
    };
  },
};
```

**Utilisation :**

```typescript
// apps/api/src/index.ts
const preset = process.env.NODE_ENV === 'production'
  ? securityHeadersPresets.api()
  : securityHeadersPresets.development();

app.use('*', async (c, next) => {
  for (const [header, value] of Object.entries(preset)) {
    c.header(header, value);
  }
  await next();
});
```

---

## Best Practices

### 1. Rotation des Secrets (Vault)

**Fréquence recommandée :**

- **JWT Secret** : Tous les 90 jours
- **API Keys** : Tous les 180 jours
- **Database Password** : Tous les 365 jours
- **TLS Certificates** : Renouvellement automatique Let's Encrypt (90 jours)

**Automatisation avec Vault :**

```bash
# Script de rotation automatique (cron mensuel)
#!/bin/bash

# Générer nouveau secret JWT
NEW_JWT_SECRET=$(openssl rand -base64 64)

# Stocker dans Vault
vault kv put secret/cartae/production \
  jwt_secret="$NEW_JWT_SECRET" \
  rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Redémarrer API pour charger nouveau secret
docker-compose -f infra/docker/docker-compose.gateway.yml restart cartae-api
```

### 2. MFA pour Admins

**Obligatoire pour :**

- Comptes admin (RBAC role = `admin`)
- Opérations destructives (suppression tenant, export données)
- Accès depuis IP non whitelistée

**Configuration :**

```bash
# Activer MFA obligatoire pour admins
MFA_REQUIRED_FOR_ADMIN=true
MFA_PROVIDERS="totp,u2f"  # TOTP (Google Authenticator) + U2F (YubiKey)
```

### 3. IP Whitelisting

**Restreindre l'accès admin à des IPs spécifiques :**

```bash
# Liste d'IPs autorisées pour endpoints /api/v1/admin/*
ADMIN_ALLOWED_IPS="203.0.113.10,203.0.113.11,198.51.100.0/24"
```

**Middleware TypeScript :**

```typescript
export const ipWhitelist = (allowedIPs: string[]) => {
  return async (c: Context, next: Next) => {
    const clientIP = getClientIP(c.req);

    // Vérifier si IP dans whitelist (supporte CIDR)
    const isAllowed = allowedIPs.some(ip => {
      if (ip.includes('/')) {
        // CIDR range
        return ipInCIDR(clientIP, ip);
      }
      return clientIP === ip;
    });

    if (!isAllowed) {
      return c.json({ error: 'Forbidden: IP not whitelisted' }, 403);
    }

    await next();
  };
};

// Appliquer uniquement aux routes admin
app.use('/api/v1/admin/*', ipWhitelist(
  process.env.ADMIN_ALLOWED_IPS?.split(',') || []
));
```

### 4. Certificate Renewal (Let's Encrypt)

**Automatisation avec Certbot :**

```bash
# Installation Certbot
sudo apt-get install certbot python3-certbot-nginx

# Première émission (interactif)
sudo certbot --nginx -d api.cartae.com -d app.cartae.com

# Renouvellement automatique (cron)
sudo crontab -e
```

**Cron job (vérification quotidienne à 2h du matin) :**

```cron
0 2 * * * certbot renew --quiet --deploy-hook "docker-compose -f /opt/cartae/infra/docker/docker-compose.gateway.yml restart traefik"
```

**Vérifier expiration du certificat :**

```bash
# Afficher date d'expiration
echo | openssl s_client -connect api.cartae.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Vérifier alertes Grafana (alerte si < 7 jours)
```

---

## Checklist Sécurité Production

**Avant déploiement, vérifier :**

- [ ] ✅ Rate limiting activé (Redis/KV backend)
- [ ] ✅ CORS configuré avec whitelist stricte
- [ ] ✅ Audit logging activé et testé
- [ ] ✅ Security headers activés (CSP, HSTS, X-Frame-Options)
- [ ] ✅ TLS 1.3 uniquement (pas TLS 1.2)
- [ ] ✅ Secrets stockés dans Vault (pas .env)
- [ ] ✅ MFA activé pour admins
- [ ] ✅ IP whitelisting configuré pour /admin/*
- [ ] ✅ Fail2ban configuré et testé
- [ ] ✅ Backup automatique activé (PostgreSQL + Vault)
- [ ] ✅ Monitoring alertes configurées (Slack/Email)
- [ ] ✅ Certificate auto-renewal testé

---

**Référence OWASP :** [OWASP-TOP-10-CHECKLIST.md](./OWASP-TOP-10-CHECKLIST.md)
**Monitoring :** [MONITORING-GUIDE.md](./MONITORING-GUIDE.md)
