# FAQ & Troubleshooting - Cartae Enterprise

**Version:** 1.0
**Date:** 2025-11-17
**Public:** Administrateurs, Support technique, Utilisateurs avancés

---

## FAQ Général

### Comment vérifier que Cartae est démarré ?

**Méthode 1 : Health Check HTTP**

```bash
# Vérifier l'API
curl https://api.votre-domaine.com/health

# Réponse attendue si OK :
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-11-17T10:30:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "vault": "ok"
  }
}

# Si erreur :
curl: (7) Failed to connect to api.votre-domaine.com port 443: Connection refused
# → L'API n'est pas démarrée
```

**Méthode 2 : Docker Status**

```bash
# Lister tous les containers Cartae
docker ps --filter "name=cartae-*"

# Réponse attendue :
CONTAINER ID   IMAGE                  STATUS         PORTS                    NAMES
abc123def456   cartae-api:latest      Up 2 hours     0.0.0.0:8787->8787/tcp   cartae-api
def456ghi789   postgres:16            Up 2 hours     0.0.0.0:5432->5432/tcp   cartae-postgres
ghi789jkl012   redis:7.2-alpine       Up 2 hours     0.0.0.0:6379->6379/tcp   cartae-redis
```

**Si un container est "Exited" ou absent :**

```bash
# Redémarrer container spécifique
docker start cartae-api

# Ou redémarrer toute la stack
docker-compose -f infra/docker/docker-compose.gateway.yml up -d
```

### Où trouver les logs ?

**Logs Docker (stdout/stderr) :**

```bash
# Logs API (dernières 100 lignes)
docker logs cartae-api --tail=100

# Logs API en temps réel
docker logs cartae-api -f

# Logs PostgreSQL
docker logs cartae-postgres --tail=50

# Logs Redis
docker logs cartae-redis --tail=50

# Tous les logs de la stack
docker-compose -f infra/docker/docker-compose.gateway.yml logs -f
```

**Logs fichiers (si configuré) :**

```bash
# Logs API (sur hôte)
tail -f /var/log/cartae/api.log

# Logs audit (JSON structured)
tail -f /var/log/cartae/audit.log | jq

# Logs Fail2ban
sudo tail -f /var/log/fail2ban.log
```

**Logs Loki (si monitoring activé) :**

```bash
# Via Grafana Explore
https://grafana.votre-domaine.com/explore

# Query LogQL
{job="cartae-api"} |= "ERROR" | json | __timestamp__ > ago(1h)
```

### Comment redémarrer un service ?

**Service spécifique :**

```bash
# Redémarrer API uniquement
docker-compose -f infra/docker/docker-compose.gateway.yml restart cartae-api

# Redémarrer PostgreSQL
docker restart cartae-postgres

# Redémarrer Redis
docker restart cartae-redis
```

**Toute la stack :**

```bash
# Arrêter
docker-compose -f infra/docker/docker-compose.gateway.yml down

# Démarrer
docker-compose -f infra/docker/docker-compose.gateway.yml up -d

# Ou restart direct (sans down)
docker-compose -f infra/docker/docker-compose.gateway.yml restart
```

**⚠️ Attention :** `docker-compose down` supprime les containers (pas les volumes). Pour supprimer aussi les volumes (DANGER : perte de données) :

```bash
# NE PAS FAIRE EN PRODUCTION SANS BACKUP
docker-compose -f infra/docker/docker-compose.gateway.yml down -v
```

---

## FAQ Multi-Tenant

### Erreur "tenant_id required"

**Symptôme :**

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

**Cause :** Header `X-Tenant-ID` manquant dans la requête.

**Solution :**

```bash
# ✅ Correct : Header ajouté
curl https://api.cartae.com/api/v1/plugins \
  -H "X-Tenant-ID: tenant-acme-corp" \
  -H "Authorization: Bearer VOTRE_TOKEN"

# ❌ Incorrect : Header manquant
curl https://api.cartae.com/api/v1/plugins \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

**Frontend (JavaScript/TypeScript) :**

```typescript
// Ajouter header dans toutes les requêtes
const response = await fetch('https://api.cartae.com/api/v1/plugins', {
  headers: {
    'X-Tenant-ID': 'tenant-acme-corp',
    'Authorization': `Bearer ${token}`,
  },
});
```

### Impossible de créer tenant

**Symptôme :**

```bash
curl -X POST https://api.cartae.com/api/v1/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{"id": "tenant-new", "name": "New Tenant"}'

# Réponse :
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key",
    "status": 401
  }
}
```

**Cause :** Header `X-API-Key` manquant ou invalide.

**Solution :**

```bash
# ✅ Correct : API key admin ajoutée
curl -X POST https://api.cartae.com/api/v1/admin/tenants \
  -H "X-API-Key: VOTRE_CLE_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"id": "tenant-new", "name": "New Tenant", "tier": "free"}'
```

**Vérifier la clé API dans `.env.local` :**

```bash
# Afficher la clé configurée
grep API_KEY_ADMIN .env.local

# Output :
API_KEY_ADMIN=abc123def456...
```

**Générer nouvelle clé (si perdue) :**

```bash
# Générer clé sécurisée
openssl rand -hex 32

# Mettre à jour .env.local
# Redémarrer API
docker-compose -f infra/docker/docker-compose.gateway.yml restart cartae-api
```

### Branding ne s'applique pas

**Symptôme :** Le frontend affiche toujours le branding par défaut (pas le branding personnalisé du tenant).

**Diagnostic :**

1. **Vérifier que le branding est configuré dans la DB :**

```bash
# Fetch branding via API
curl https://api.cartae.com/api/v1/tenants/tenant-acme-corp/branding

# Réponse attendue :
{
  "success": true,
  "data": {
    "appName": "ACME Marketplace",
    "logoUrl": "https://cdn.acme.com/logo.png",
    "primaryColor": "#CC0000"
  }
}

# Si data = {} → Branding non configuré
```

2. **Configurer le branding :**

```bash
curl -X PATCH https://api.cartae.com/api/v1/admin/tenants/tenant-acme-corp \
  -H "X-API-Key: VOTRE_CLE_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "branding": {
      "appName": "ACME Marketplace",
      "logoUrl": "https://cdn.acme.com/logo.png",
      "primaryColor": "#CC0000"
    }
  }'
```

3. **Vérifier que le frontend charge bien le branding :**

```typescript
// Ouvrir DevTools → Console
console.log('Tenant ID:', localStorage.getItem('tenantId'));

// Vérifier fetch branding
fetch('https://api.cartae.com/api/v1/tenants/tenant-acme-corp/branding')
  .then(r => r.json())
  .then(console.log);
```

4. **Vider cache navigateur :**

```bash
# Chrome : DevTools → Application → Clear storage
# Firefox : DevTools → Storage → Clear all
# Safari : Develop → Empty Caches
```

---

## FAQ Sécurité

### Erreur 429 "Rate limit exceeded"

**Symptôme :**

```json
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

**Cause :** Le client a dépassé le quota de requêtes par minute.

**Solution 1 : Attendre la fenêtre de reset**

```bash
# Attendre 45 secondes (retryAfter)
sleep 45

# Ré-essayer
curl https://api.cartae.com/api/v1/plugins \
  -H "X-Tenant-ID: tenant-acme-corp"
```

**Solution 2 : Réduire la fréquence des requêtes (client)**

```typescript
// Ajouter throttling côté client
import { throttle } from 'lodash';

const fetchPluginsThrottled = throttle(
  async () => {
    const response = await fetch('https://api.cartae.com/api/v1/plugins', {
      headers: { 'X-Tenant-ID': 'tenant-acme-corp' },
    });
    return response.json();
  },
  1000, // Max 1 appel par seconde
  { trailing: false }
);
```

**Solution 3 : Augmenter le quota (admin)**

```bash
# Option A : Augmenter quota pour ce tenant spécifiquement
curl -X PATCH https://api.cartae.com/api/v1/admin/tenants/tenant-acme-corp \
  -H "X-API-Key: ADMIN_KEY" \
  -d '{
    "quotas": {
      "rateLimitPerMinute": 500
    }
  }'

# Option B : Upgrader le tier du tenant
curl -X PATCH https://api.cartae.com/api/v1/admin/tenants/tenant-acme-corp \
  -H "X-API-Key: ADMIN_KEY" \
  -d '{"tier": "pro"}'  # Pro = 1000 req/min
```

**Solution 4 : Augmenter limite globale (serveur)**

```bash
# Éditer .env.local
RATE_LIMIT_DEFAULT=200  # Augmenter de 100 → 200

# Redémarrer API
docker-compose -f infra/docker/docker-compose.gateway.yml restart cartae-api
```

### CORS blocked (Origin not allowed)

**Symptôme (DevTools Console) :**

```
Access to fetch at 'https://api.cartae.com/api/v1/plugins' from origin 'https://app.example.com'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Cause :** L'origine `https://app.example.com` n'est pas dans la whitelist CORS.

**Solution 1 : Ajouter origine à la whitelist**

```bash
# Éditer .env.local
ALLOWED_ORIGINS="https://app.cartae.com,https://admin.cartae.com,https://app.example.com"

# Redémarrer API
docker-compose -f infra/docker/docker-compose.gateway.yml restart cartae-api
```

**Solution 2 : Wildcard subdomains (attention : moins sécurisé)**

```bash
# Autoriser tous les sous-domaines de cartae.com
ALLOWED_ORIGINS="https://*.cartae.com"
```

**Solution 3 : Développement local (temporaire)**

```bash
# UNIQUEMENT en développement
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173"
```

**⚠️ Ne JAMAIS utiliser en production :**

```bash
# ❌ DANGEREUX : Autoriser toutes les origines
ALLOWED_ORIGINS="*"
```

### Audit logs non visibles

**Symptôme :** Aucun log dans `/var/log/cartae/audit.log` après opérations admin.

**Diagnostic :**

1. **Vérifier que l'audit logging est activé :**

```bash
# Vérifier .env.local
grep AUDIT_LOG_ENABLED .env.local

# Output attendu :
AUDIT_LOG_ENABLED=true

# Si absent ou false, activer :
echo "AUDIT_LOG_ENABLED=true" >> .env.local

# Redémarrer API
docker-compose -f infra/docker/docker-compose.gateway.yml restart cartae-api
```

2. **Vérifier permissions du fichier de log :**

```bash
# Vérifier que le fichier existe et est accessible
ls -la /var/log/cartae/audit.log

# Si erreur "Permission denied" :
sudo chown cartae-api:cartae-api /var/log/cartae/audit.log
sudo chmod 644 /var/log/cartae/audit.log
```

3. **Vérifier destination des logs :**

```bash
# Afficher configuration audit log
grep AUDIT_LOG .env.local

# Output :
AUDIT_LOG_ENABLED=true
AUDIT_LOG_DESTINATION=stdout  # ← Logs dans stdout (Docker logs)

# Pour logs fichier :
AUDIT_LOG_DESTINATION=file
AUDIT_LOG_FILE_PATH=/var/log/cartae/audit.log
```

4. **Si AUDIT_LOG_DESTINATION=stdout :**

```bash
# Logs sont dans Docker stdout
docker logs cartae-api --tail=100 | grep "audit"

# Ou via Loki/Grafana
{job="cartae-api"} |= "admin.operation" | json
```

---

## FAQ Performance

### API lente (> 2s latency)

**Symptôme :** Les requêtes API prennent plus de 2 secondes.

**Diagnostic :**

1. **Vérifier métriques Prometheus :**

```bash
# P99 latency
curl http://localhost:9090/api/v1/query?query=histogram_quantile(0.99,%20rate(http_request_duration_seconds_bucket[5m]))

# Si > 2s → Problème confirmé
```

2. **Identifier endpoint lent :**

```bash
# Latency par endpoint
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) by (path)
```

3. **Vérifier logs slow queries PostgreSQL :**

```bash
# Activer log slow queries (> 500ms)
docker exec -it cartae-postgres psql -U cartae -d cartae_production

# Dans psql :
ALTER SYSTEM SET log_min_duration_statement = 500;
SELECT pg_reload_conf();

# Voir slow queries
tail -f /var/log/postgresql/postgresql.log | grep "duration:"
```

**Solutions :**

**Solution 1 : Ajouter index manquants**

```sql
-- Exemple : Slow query sur plugins par tenant + date
EXPLAIN ANALYZE
SELECT * FROM plugins
WHERE tenant_id = 'tenant-acme-corp'
ORDER BY created_at DESC
LIMIT 20;

-- Si "Seq Scan" → Ajouter index
CREATE INDEX idx_plugins_tenant_date ON plugins(tenant_id, created_at DESC);
```

**Solution 2 : Activer cache Redis**

```typescript
// Cache query résultats fréquents
const cacheKey = `plugins:${tenantId}:page:1`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const plugins = await prisma.plugin.findMany({
  where: { tenant_id: tenantId },
  take: 20,
});

await redis.setex(cacheKey, 300, JSON.stringify(plugins)); // Cache 5 min
return plugins;
```

**Solution 3 : Paginer les résultats**

```typescript
// ❌ Mauvais : Charger tous les plugins
const allPlugins = await prisma.plugin.findMany();

// ✅ Bon : Paginer
const plugins = await prisma.plugin.findMany({
  take: 20,
  skip: (page - 1) * 20,
});
```

**Solution 4 : Optimiser PostgreSQL**

```bash
# Augmenter shared_buffers (25% RAM)
docker exec -it cartae-postgres psql -U cartae

# Dans psql :
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET work_mem = '32MB';
ALTER SYSTEM SET effective_cache_size = '6GB';

# Redémarrer PostgreSQL
docker restart cartae-postgres
```

### Bundle trop gros (> 500KB)

**Symptôme :** Le bundle JavaScript initial est > 500KB, ralentissant le chargement.

**Diagnostic :**

```bash
# Analyser taille bundle
pnpm --filter @cartae/web build --analyze

# Ouvrir rapport
open apps/web/dist/bundle-analysis.html
```

**Solutions :**

**Solution 1 : Lazy loading déjà activé (Session 84)**

Vérifier que le lazy loading est bien activé :

```typescript
// apps/web/src/App.tsx
import { lazy, Suspense } from 'react';

// ✅ Bon : Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Plugins = lazy(() => import('./pages/Plugins'));

// ❌ Mauvais : Import synchrone
import Dashboard from './pages/Dashboard';
```

**Solution 2 : Analyser dependencies lourdes**

```bash
# Trouver packages les plus gros
npx vite-bundle-visualizer

# Remplacer dependencies lourdes par alternatives :
# - moment.js (288KB) → date-fns (12KB)
# - lodash (72KB) → lodash-es + tree-shaking
# - recharts (500KB) → Chart.js (200KB)
```

**Solution 3 : Tree-shaking imports**

```typescript
// ❌ Mauvais : Import tout lodash
import _ from 'lodash';
_.debounce(fn, 300);

// ✅ Bon : Import seulement ce qui est utilisé
import debounce from 'lodash-es/debounce';
debounce(fn, 300);
```

**Solution 4 : CDN pour dependencies stables**

```html
<!-- index.html -->
<!-- Charger React depuis CDN en production -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
```

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
```

### Cache ne fonctionne pas

**Symptôme :** Les requêtes répétées ne sont pas cachées (latency identique).

**Diagnostic :**

```bash
# Vérifier cache hit rate dans Prometheus
(rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))) * 100

# Si < 50% → Cache inefficace
```

**Solutions :**

**Solution 1 : Vérifier Redis est démarré**

```bash
# Tester connexion Redis
docker exec -it cartae-redis redis-cli ping

# Output attendu : PONG

# Si erreur :
docker start cartae-redis
```

**Solution 2 : Vérifier configuration cache**

```bash
# Vérifier REDIS_URL dans .env.local
grep REDIS_URL .env.local

# Output :
REDIS_URL=redis://cartae-redis:6379/0

# Tester connexion depuis API
docker exec -it cartae-api node -e "
const redis = require('redis');
const client = redis.createClient({ url: 'redis://cartae-redis:6379/0' });
client.connect().then(() => console.log('Connected')).catch(console.error);
"
```

**Solution 3 : Augmenter TTL cache**

```typescript
// Cache trop court (1 minute)
await redis.setex(key, 60, value);

// Augmenter selon stabilité des données (5-30 minutes)
await redis.setex(key, 300, value); // 5 minutes
```

**Solution 4 : Ajouter cache sur endpoints fréquents**

```typescript
// Endpoints à cacher en priorité :
// - GET /api/v1/plugins (liste)
// - GET /api/v1/plugins/:id (détail)
// - GET /api/v1/tenants/:id/branding (branding)

app.get('/api/v1/plugins', async (c) => {
  const cacheKey = `plugins:${tenantId}:page:${page}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    c.header('X-Cache', 'HIT');
    return c.json(JSON.parse(cached));
  }

  const plugins = await fetchPlugins();
  await redis.setex(cacheKey, 300, JSON.stringify(plugins));

  c.header('X-Cache', 'MISS');
  return c.json(plugins);
});
```

---

## Troubleshooting Avancé

### Health check échoue → Vérifier Docker, PostgreSQL, Redis, Vault

**Symptôme :**

```bash
curl https://api.cartae.com/health

# Réponse :
{
  "status": "unhealthy",
  "services": {
    "database": "error",
    "redis": "ok",
    "vault": "ok"
  }
}
```

**Diagnostic PostgreSQL :**

```bash
# 1. Vérifier container PostgreSQL démarré
docker ps | grep cartae-postgres

# Si absent :
docker start cartae-postgres

# 2. Vérifier logs PostgreSQL
docker logs cartae-postgres --tail=50

# Erreurs communes :
# - "database system was shut down unexpectedly" → Corruption
# - "FATAL: password authentication failed" → Mauvais password
# - "could not bind IPv4 address" → Port 5432 déjà utilisé

# 3. Tester connexion manuelle
docker exec -it cartae-postgres psql -U cartae -d cartae_production

# Si erreur "connection refused" → PostgreSQL down
# Si erreur "password authentication failed" → Vérifier DATABASE_URL
```

**Diagnostic Redis :**

```bash
# 1. Vérifier container Redis démarré
docker ps | grep cartae-redis

# 2. Tester connexion
docker exec -it cartae-redis redis-cli ping

# Output attendu : PONG

# 3. Vérifier logs
docker logs cartae-redis --tail=50
```

**Diagnostic Vault :**

```bash
# 1. Vérifier statut Vault
docker exec -it cartae-vault vault status

# Output attendu :
# Sealed: false
# Initialized: true

# Si Sealed: true → Unsealer Vault
docker exec -it cartae-vault vault operator unseal
# (répéter 3 fois avec 3 unseal keys)

# 2. Vérifier token
grep VAULT_TOKEN .env.local

# Tester token
docker exec -it cartae-vault vault token lookup
```

### Rate limit trop strict → Augmenter RATE_LIMIT_DEFAULT env var

**Voir section "Erreur 429 Rate limit exceeded" ci-dessus.**

### Logs audit manquants → Vérifier AUDIT_LOG_ENABLED=true

**Voir section "Audit logs non visibles" ci-dessus.**

### Certificate expiré → Renouveler Let's Encrypt (certbot renew)

**Symptôme :**

```bash
curl https://api.cartae.com

# Erreur :
curl: (60) SSL certificate problem: certificate has expired
```

**Diagnostic :**

```bash
# Vérifier date expiration
echo | openssl s_client -connect api.cartae.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Output :
notBefore=Nov 17 00:00:00 2025 GMT
notAfter=Feb 15 23:59:59 2026 GMT  # ← Expiré si date passée
```

**Solution :**

```bash
# Renouveler avec Certbot
sudo certbot renew --force-renewal

# Redémarrer Traefik (ou nginx)
docker-compose -f infra/docker/docker-compose.gateway.yml restart traefik

# Vérifier nouveau certificat
echo | openssl s_client -connect api.cartae.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# notAfter devrait être dans 90 jours
```

**Automatisation (cron) :**

```bash
# Ajouter cron job pour renouvellement automatique
sudo crontab -e

# Vérifier renouvellement tous les jours à 2h du matin
0 2 * * * certbot renew --quiet --deploy-hook "docker-compose -f /opt/cartae/infra/docker/docker-compose.gateway.yml restart traefik"
```

---

## Support

### Documentation

- **Quickstart :** [ENTERPRISE-QUICKSTART.md](./ENTERPRISE-QUICKSTART.md)
- **Sécurité :** [SECURITY-CONFIGURATION.md](./SECURITY-CONFIGURATION.md)
- **Monitoring :** [MONITORING-GUIDE.md](./MONITORING-GUIDE.md)
- **Multi-tenant :** [MULTI-TENANT-GUIDE.md](./MULTI-TENANT-GUIDE.md)
- **OWASP Compliance :** [OWASP-TOP-10-CHECKLIST.md](./OWASP-TOP-10-CHECKLIST.md)

### Contacts

**Support technique (réponse sous 24h) :**

- Email : support@cartae.com
- Formulaire : https://cartae.com/support

**Incidents critiques (production down) :**

- Email : incidents@cartae.com
- PagerDuty : https://cartae.pagerduty.com
- Téléphone : +33 1 XX XX XX XX (24/7)

**Communauté :**

- Slack : [cartae-community.slack.com](https://cartae-community.slack.com)
- GitHub Issues : https://github.com/votre-org/cartae-enterprise/issues
- Forum : https://forum.cartae.com

### Escalation

**Niveau 1 : Support technique**

- Questions générales
- Configuration
- Bugs mineurs

**Niveau 2 : Équipe ingénierie**

- Bugs critiques
- Performance issues
- Architecture questions

**Niveau 3 : On-call engineer**

- Production down
- Data loss
- Security incidents

---

**Dernière mise à jour :** 2025-11-17
**Version :** 1.0
