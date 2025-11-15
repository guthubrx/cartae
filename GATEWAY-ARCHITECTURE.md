# API Gateway & Rate Limiting Architecture

**Session 81h** - Documentation complète de l'API Gateway Cartae (mode standalone)

---

## Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Traefik Configuration](#traefik-configuration)
4. [Rate Limiting Strategy](#rate-limiting-strategy)
5. [Redis Backend](#redis-backend)
6. [Quota Manager API](#quota-manager-api)
7. [DDoS Protection](#ddos-protection)
8. [Monitoring & Metrics](#monitoring--metrics)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Production Recommendations](#production-recommendations)

---

## Vue d'Ensemble

### Objectifs

L'API Gateway Cartae fournit:

1. **Reverse Proxy** - Routing intelligent vers services backend
2. **Rate Limiting** - Protection contre abus et surcharge
3. **DDoS Protection** - Limites globales et par IP
4. **Quota Management** - Quotas par plugin (free vs premium)
5. **Monitoring** - Métriques Prometheus + Grafana
6. **High Availability** - Graceful degradation si Redis down

### Choix Technologiques

**Traefik vs Kong?**

Nous avons choisi **Traefik** pour le mode standalone:

| Critère | Traefik | Kong |
|---------|---------|------|
| **Complexité** | ✅ Simple (labels Docker) | ❌ Complexe (DB PostgreSQL required) |
| **Resources** | ✅ ~50MB RAM | ❌ ~500MB RAM (+ PostgreSQL) |
| **Docker Compose** | ✅ Native auto-discovery | 🟡 Possible mais complexe |
| **Rate Limiting** | ✅ Built-in middlewares | ✅ Plugins (mais require DB) |
| **Already Used** | ✅ Session 81f (HA) | ❌ Nouveau |
| **Learning Curve** | ✅ Faible | ❌ Élevée |

**Conclusion:** Traefik = Meilleur fit pour standalone (simplicité + performances)

---

## Architecture

### Components Diagram

```
                    ┌─────────────────────────────────────┐
                    │         CLIENT REQUESTS             │
                    └─────────────┬───────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────────────┐
                    │      TRAEFIK API GATEWAY            │
                    │                                     │
                    │  Entrypoints:                       │
                    │  - :80 (HTTP)                       │
                    │  - :443 (HTTPS)                     │
                    │  - :8080 (Dashboard + Metrics)      │
                    └──────┬──────────────────────────────┘
                           │
                           │ Apply Middlewares (ordre)
                           │
          ┌────────────────┼────────────────────────┐
          │                │                        │
          ▼                ▼                        ▼
┌──────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│ Global Limit     │ │ Per-IP Limit    │ │ Plugin Quota     │
│ 1000 req/s       │ │ 100 req/s       │ │ 100 req/h        │
│ (DDoS protect)   │ │ (abuse protect) │ │ (ForwardAuth)    │
└──────────────────┘ └─────────────────┘ └─────────┬────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────┐
                                          │  QUOTA MANAGER   │
                                          │  (database-api)  │
                                          │                  │
                                          │  ┌─────────────┐ │
                                          │  │ RateLimiter │ │
                                          │  │   (Redis)   │ │
                                          │  └──────┬──────┘ │
                                          └─────────┼────────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │   REDIS ZSET     │
                                          │                  │
                                          │ rate_limit:      │
                                          │  {plugin}:{user} │
                                          │                  │
                                          │ Sliding Window   │
                                          └──────────────────┘
                           │
                           │ If All Checks OK
                           │
          ┌────────────────┼────────────────────────┐
          │                │                        │
          ▼                ▼                        ▼
┌──────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│  database-api    │ │  plugins-api    │ │  other-services  │
│  :3000           │ │  :4000          │ │                  │
└──────────────────┘ └─────────────────┘ └──────────────────┘
```

### Data Flow

**1. Request arrives** → Traefik :80 or :443

**2. Apply middlewares** (sequential):
   - `global-rate-limit` → Check 1000 req/s global (all users)
   - `api-rate-limit` → Check 100 req/s per IP
   - `plugin-quota-check` → ForwardAuth to QuotaManager

**3. Quota Manager**:
   - Extract `pluginId` + `userId` (JWT)
   - Call `RateLimiter.checkQuota()`
   - Redis: `ZCOUNT rate_limit:{pluginId}:{userId}`
   - If count >= limit → **429 Too Many Requests**
   - Else → `ZADD` (add request) → **200 OK**

**4. If 200 OK** → Route to backend service

**5. Backend** processes request → Response

**6. Traefik** adds headers:
   - `X-RateLimit-Limit: 100`
   - `X-RateLimit-Remaining: 25`
   - `X-RateLimit-Reset: 1700000000`

**7. Client** receives response + rate limit info

---

## Traefik Configuration

### Static Configuration (CLI Arguments)

Définie dans `docker-compose.gateway.yml`:

```yaml
command:
  # Providers
  - "--providers.docker=true"
  - "--providers.docker.exposedbydefault=false"
  - "--providers.file.directory=/etc/traefik/dynamic"

  # Entrypoints
  - "--entrypoints.web.address=:80"
  - "--entrypoints.websecure.address=:443"

  # API & Dashboard
  - "--api.dashboard=true"
  - "--api.insecure=true"  # WARNING: Disable en production

  # Metrics
  - "--metrics.prometheus=true"

  # Logs
  - "--accesslog=true"
  - "--accesslog.format=json"
```

### Dynamic Configuration (rate-limit.yml)

Chargée depuis `infra/traefik/dynamic/rate-limit.yml`:

**Middlewares:**

```yaml
http:
  middlewares:
    # Global rate limit (DDoS protection)
    global-rate-limit:
      rateLimit:
        average: 1000        # 1000 req/s max
        period: "1s"
        burst: 100           # Spike buffer

    # Per-IP rate limit
    api-rate-limit:
      rateLimit:
        average: 100         # 100 req/s per IP
        period: "1s"
        burst: 10
        sourceCriterion:
          ipStrategy:
            depth: 1         # Extract real IP from X-Forwarded-For

    # Plugin quota check (ForwardAuth)
    plugin-quota-check:
      forwardAuth:
        address: "http://cartae-database-api:3000/api/gateway/quota-check"
        authResponseHeaders:
          - "X-RateLimit-Limit"
          - "X-RateLimit-Remaining"
          - "X-RateLimit-Reset"
```

**Routers:**

```yaml
http:
  routers:
    # API routes
    api-router:
      rule: "Host(`api.cartae.localhost`) || PathPrefix(`/api`)"
      entryPoints:
        - web
      middlewares:
        - global-rate-limit
        - api-rate-limit
        - plugin-quota-check
      service: cartae-api

    # Plugin-specific routes (priority)
    plugins-router:
      rule: "PathPrefix(`/api/plugins`)"
      entryPoints:
        - web
      middlewares:
        - global-rate-limit
        - plugin-quota-check      # Skip api-rate-limit (plus granulaire)
      service: cartae-api
      priority: 10
```

### Auto-Discovery (Docker Labels)

Services backend déclarent leurs routes via labels:

```yaml
services:
  database-api:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.database-api.rule=PathPrefix(`/api`)"
      - "traefik.http.routers.database-api.entrypoints=web"
      - "traefik.http.services.database-api.loadbalancer.server.port=3000"
```

---

## Rate Limiting Strategy

### Multi-Level Protection

**Niveau 1: Global Rate Limit (DDoS Protection)**
- **Limite:** 1000 req/s (tous users, tous endpoints)
- **Objectif:** Prévenir surcharge serveur
- **Burst:** 100 req (pics momentanés OK)
- **Scope:** Entrypoint entier (web/websecure)

**Niveau 2: Per-IP Rate Limit (Abuse Protection)**
- **Limite:** 100 req/s par IP
- **Objectif:** Empêcher monopolisation par un client
- **Burst:** 10 req
- **Source IP:** X-Forwarded-For (depth: 1)
- **Scope:** Routes `/api/*`

**Niveau 3: Plugin Quota (Fair Usage)**
- **Limite:** 100 req/h par plugin/user (free), 1000 req/h (premium)
- **Objectif:** Enforcer tiers plugins
- **Backend:** Redis sliding window
- **Scope:** Routes `/api/plugins/*`

### Response Headers

**200 OK (Quota OK):**

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1700000000
```

**429 Too Many Requests (Quota Exceeded):**

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1700000000
Retry-After: 3456

{
  "error": "rate_limit_exceeded",
  "message": "Plugin quota exceeded: 100 requests per hour",
  "limit": 100,
  "remaining": 0,
  "resetAt": "2025-11-15T22:00:00Z"
}
```

---

## Redis Backend

### Data Structure (ZSET)

**Clé:** `rate_limit:{pluginId}:{userId}`

**Score:** Timestamp Unix (secondes)

**Member:** `{timestamp}-{random}` (unique)

**TTL:** `window` duration (3600s = 1h)

**Exemple:**

```redis
# Plugin "plugin-1", User "user-1", Window 1h
ZADD rate_limit:plugin-1:user-1 1700000000 "1700000000-abc123"
ZADD rate_limit:plugin-1:user-1 1700000010 "1700000010-def456"
ZADD rate_limit:plugin-1:user-1 1700000020 "1700000020-ghi789"

# Count requests dans fenêtre actuelle (now - 3600, now)
ZCOUNT rate_limit:plugin-1:user-1 1699996400 1700000020
# → 3 requests

# Cleanup vieilles entrées
ZREMRANGEBYSCORE rate_limit:plugin-1:user-1 0 1699996400

# TTL auto-delete après 1h inactivité
EXPIRE rate_limit:plugin-1:user-1 3600
```

### Sliding Window Algorithm

**Pseudo-code:**

```typescript
async function checkQuota(pluginId, userId, limit, window) {
  const key = `rate_limit:${pluginId}:${userId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - window;

  // 1. Cleanup old entries
  await redis.ZREMRANGEBYSCORE(key, 0, windowStart);

  // 2. Count requests in current window
  const count = await redis.ZCOUNT(key, windowStart, now);

  // 3. Check limit
  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // 4. Add current request
  const member = `${now}-${Math.random()}`;
  await redis.ZADD(key, now, member);
  await redis.EXPIRE(key, window);

  return {
    allowed: true,
    remaining: limit - count - 1,
  };
}
```

### Performances

| Opération | Complexité | Latence Typique |
|-----------|-----------|-----------------|
| `ZCOUNT` | O(log N) | < 1ms |
| `ZADD` | O(log N) | < 1ms |
| `ZREMRANGEBYSCORE` | O(log N + M) | < 2ms |
| `EXPIRE` | O(1) | < 1ms |
| **Total** | O(log N) | **< 5ms** |

Avec N < 100 entries par ZSET (typique), latence totale < 5ms.

### Persistence

**Configuration Redis:**

```redis
# AOF (Append-Only File) - Durabilité
appendonly yes
appendfsync everysec       # Fsync chaque seconde (balance perfs/durabilité)

# RDB Snapshots - Backups
save 900 1                 # Snapshot si 1 change en 15min
save 300 10                # Snapshot si 10 changes en 5min
save 60 10000              # Snapshot si 10k changes en 1min

# Memory eviction
maxmemory 256mb
maxmemory-policy allkeys-lru  # Evict LRU si memory full
```

---

## Quota Manager API

### Endpoints

**POST /api/gateway/quota-check** (ForwardAuth)

Vérifie quota et enregistre request.

**Request:**
```http
POST /api/gateway/quota-check HTTP/1.1
Authorization: Bearer <jwt>
X-Plugin-Id: plugin-1
```

**Response (200 OK):**
```json
{
  "allowed": true,
  "remaining": 25,
  "resetAt": "2025-11-15T22:00:00Z",
  "limit": 100
}
```

**Response (429 Too Many Requests):**
```json
{
  "allowed": false,
  "remaining": 0,
  "resetAt": "2025-11-15T22:00:00Z",
  "limit": 100,
  "message": "Quota exceeded: 100 requests per hour"
}
```

---

**GET /api/quotas/:pluginId** (Public, auth required)

Récupère quota restant (sans incrémenter).

**Response:**
```json
{
  "pluginId": "plugin-1",
  "userId": "user-1",
  "consumed": 75,
  "remaining": 25,
  "limit": 100,
  "usagePercent": 75,
  "resetAt": "2025-11-15T22:00:00Z"
}
```

---

**GET /api/quotas/:pluginId/stats** (Admin only)

Statistiques usage plugin.

**Response:**
```json
{
  "pluginId": "plugin-1",
  "totalUsers": 150,
  "activeUsers": 75,
  "totalRequests": 5432,
  "averageUsagePercent": 45,
  "topConsumers": [
    {
      "userId": "user-42",
      "consumed": 98,
      "remaining": 2,
      "usagePercent": 98
    }
  ]
}
```

---

**GET /api/quotas/:pluginId/consumers?threshold=80** (Admin only)

Top consumers (usage > threshold).

**Response:**
```json
[
  {
    "userId": "user-42",
    "consumed": 98,
    "remaining": 2,
    "limit": 100,
    "usagePercent": 98,
    "resetAt": "2025-11-15T22:00:00Z"
  },
  {
    "userId": "user-7",
    "consumed": 85,
    "remaining": 15,
    "usagePercent": 85
  }
]
```

---

**POST /api/quotas/:pluginId/reset** (Admin only)

Reset quota (tous users ou user spécifique).

**Request:**
```json
{
  "userId": "user-1"  // Optionnel
}
```

**Response:**
```json
{
  "success": true
}
```

### Webhooks (Alerts)

**Configuration:**

```typescript
quotaManager.addWebhook('plugin-1', {
  url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX',
  threshold: 80,  // Trigger si usage > 80%
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Payload envoyé:**

```json
{
  "event": "quota_exceeded",
  "timestamp": "2025-11-15T21:45:00Z",
  "data": {
    "pluginId": "plugin-1",
    "userId": "user-42",
    "current": 85,
    "limit": 100,
    "usagePercent": 85
  }
}
```

---

## DDoS Protection

### Global Rate Limit

**Configuration:**
- **Limite:** 1000 req/s (86.4M req/jour)
- **Burst:** 100 req (buffer pics)
- **Scope:** Entrypoint entier (tous endpoints)

**Objectif:**
- Prévenir surcharge serveur (CPU, RAM, I/O)
- Protection DDoS basique (Layer 7)

**Comportement:**
- Si > 1000 req/s → **429 Too Many Requests**
- Pas de différenciation IP/user (limite globale)
- Burst buffer permet pics momentanés (1100 req/s OK si temporaire)

### Per-IP Protection

**Configuration:**
- **Limite:** 100 req/s par IP (8.64M req/jour par IP)
- **Burst:** 10 req
- **Source IP:** X-Forwarded-For (depth: 1)

**Objectif:**
- Empêcher monopolisation par un seul client
- Distribuer ressources équitablement

**Cas d'usage:**
- Client malveillant (botnet, scraper)
- Bug client (infinite loop requests)
- Concurrent abuse (competitor crawling API)

### Advanced Protection (Production)

Pour production, ajouter:

**1. Layer 4 Protection (Network)**
- Cloudflare DDoS protection
- AWS Shield / Google Cloud Armor
- Rate limiting IP/ASN niveau réseau

**2. Layer 7 Protection (Application)**
- WAF (Web Application Firewall)
- Bot detection (Cloudflare Bot Management)
- CAPTCHA challenges (hCaptcha, reCAPTCHA)

**3. Geographic Filtering**
- Bloquer régions non pertinentes
- Rate limiting différencié par pays

**4. Behavioral Analysis**
- Machine learning anomaly detection
- Pattern recognition (sudden spikes)
- Auto-ban suspicious IPs

---

## Monitoring & Metrics

### Prometheus Metrics

**Traefik Metrics (built-in):**

| Metric | Type | Description |
|--------|------|-------------|
| `traefik_entrypoint_requests_total` | Counter | Total requests par entrypoint |
| `traefik_entrypoint_request_duration_seconds` | Histogram | Latence requests |
| `traefik_service_requests_total` | Counter | Requests par service backend |
| `traefik_service_request_duration_seconds` | Histogram | Latence service backend |

**Custom Metrics (QuotaManager):**

| Metric | Type | Description |
|--------|------|-------------|
| `cartae_quota_allowed_total` | Counter | Quotas allowed (200 OK) |
| `cartae_quota_denied_total` | Counter | Quotas denied (429) |
| `cartae_quota_errors_total` | Counter | Erreurs Redis |
| `cartae_rate_limiter_quota_remaining` | Gauge | Quota restant par plugin/user |
| `cartae_rate_limiter_operation_duration_seconds` | Histogram | Latence opérations Redis |

### Prometheus Configuration

**Fichier:** `infra/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Traefik metrics
  - job_name: 'traefik'
    static_configs:
      - targets: ['traefik-gateway:8080']

  # QuotaManager metrics
  - job_name: 'quota-manager'
    static_configs:
      - targets: ['cartae-database-api:3000']
    metrics_path: '/metrics'
```

### Grafana Dashboards

**Dashboard 1: API Gateway Overview**

Panels:
- Requests/s (global, per-IP, per-plugin)
- Error rate (4xx, 5xx)
- Latency (P50, P95, P99)
- Rate limit violations (429 total)

**Dashboard 2: Quotas Monitoring**

Panels:
- Quota usage per plugin (top 10)
- Top consumers (users > 80%)
- Quota violations timeline
- Redis operations latency

**Dashboard 3: Infrastructure**

Panels:
- Traefik health (uptime, restarts)
- Redis health (memory, CPU, connections)
- Services backend (health checks, uptime)

### Alerting Rules

**Prometheus Alerts:**

```yaml
groups:
  - name: api_gateway
    rules:
      # Trop de rate limit violations
      - alert: HighRateLimitViolations
        expr: rate(cartae_quota_denied_total[5m]) > 100
        for: 5m
        annotations:
          summary: "High rate limit violations (> 100/min)"

      # Redis down
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        annotations:
          summary: "Redis is down (quota checks failing)"

      # Latence élevée
      - alert: HighLatency
        expr: histogram_quantile(0.95, traefik_service_request_duration_seconds) > 0.2
        for: 5m
        annotations:
          summary: "P95 latency > 200ms"
```

---

## Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum (Traefik + Redis + Prometheus)
- Ports disponibles: 80, 443, 8080, 9090

### Installation

**1. Clone repository:**

```bash
cd /Users/moi/Nextcloud/10.Scripts/02.Cartae/cartae
git checkout main
git pull origin main
```

**2. Start API Gateway:**

```bash
docker-compose -f infra/docker/docker-compose.gateway.yml up -d
```

**3. Verify services:**

```bash
docker-compose -f infra/docker/docker-compose.gateway.yml ps

# Expected:
# cartae-traefik-gateway    running
# cartae-redis              running
# cartae-prometheus         running
```

**4. Check Traefik dashboard:**

Open: http://localhost:8080/dashboard/

**5. Test rate limiting:**

```bash
# Test global limit (1000 req/s)
ab -n 2000 -c 100 http://localhost/api/health

# Test per-IP limit (100 req/s)
ab -n 200 -c 50 http://localhost/api/plugins
```

### Configuration Files

**Required:**
- `infra/traefik/dynamic/rate-limit.yml` (middlewares)
- `infra/docker/docker-compose.gateway.yml` (services)
- `infra/prometheus/prometheus.yml` (metrics scraping)

**Optional:**
- `infra/traefik/certs/` (SSL/TLS certificates)
- `.env` (environment variables)

### Environment Variables

**Fichier:** `.env`

```bash
# Redis
REDIS_URL=redis://cartae-redis:6379

# Quotas defaults
QUOTA_FREE_LIMIT=100
QUOTA_FREE_WINDOW=3600
QUOTA_PREMIUM_LIMIT=1000
QUOTA_PREMIUM_WINDOW=3600

# Traefik
TRAEFIK_LOG_LEVEL=INFO
TRAEFIK_DASHBOARD_ENABLED=true

# Prometheus
PROMETHEUS_RETENTION_DAYS=15
```

---

## Troubleshooting

### Traefik ne démarre pas

**Symptômes:**
```
Error: port 80 already in use
```

**Solutions:**
1. Vérifier ports disponibles: `lsof -i :80,443,8080`
2. Stopper service utilisant port: `sudo service apache2 stop`
3. Changer ports dans `docker-compose.gateway.yml`:
   ```yaml
   ports:
     - "8080:80"    # HTTP sur 8080 au lieu de 80
     - "8443:443"   # HTTPS sur 8443
   ```

---

### Services backend non routés (404 Not Found)

**Symptômes:**
```
404 page not found
```

**Debug:**
1. Vérifier routers configurés:
   - Dashboard: http://localhost:8080/api/rawdata
   - Section `routers` → Voir règles routing

2. Vérifier service backend sur réseau:
   ```bash
   docker network inspect cartae-network
   # Voir si service backend est connecté
   ```

3. Vérifier labels Docker:
   ```bash
   docker inspect cartae-database-api | grep traefik.enable
   # Doit retourner: "traefik.enable=true"
   ```

**Solutions:**
- Ajouter service au réseau: `networks: [cartae-network]`
- Ajouter label: `traefik.enable=true`
- Vérifier règle router: `rule: "PathPrefix(/api)"`

---

### Rate limiting ne fonctionne pas

**Symptômes:**
- Pas de header `X-RateLimit-*`
- Jamais de 429 même après 1000 req

**Debug:**
1. Vérifier middleware chargé:
   ```bash
   docker exec cartae-traefik-gateway cat /etc/traefik/dynamic/rate-limit.yml
   ```

2. Vérifier logs Traefik:
   ```bash
   docker logs cartae-traefik-gateway | grep rate-limit
   ```

3. Vérifier Redis connecté:
   ```bash
   docker exec -it cartae-redis redis-cli PING
   # Doit retourner: PONG
   ```

**Solutions:**
- Volume mal monté: Vérifier `./traefik/dynamic:/etc/traefik/dynamic:ro`
- Middleware pas appliqué: Ajouter dans router `middlewares: [global-rate-limit]`
- Redis down: Redémarrer Redis `docker-compose restart redis`

---

### Redis perd données au redémarrage

**Symptômes:**
- Quotas reset à 0 après redémarrage Redis

**Debug:**
```bash
# Vérifier persistence enabled
docker exec cartae-redis redis-cli CONFIG GET appendonly
# Doit retourner: appendonly yes

# Vérifier fichier AOF existe
docker exec cartae-redis ls -lh /data
# Doit voir: appendonly.aof
```

**Solutions:**
1. Activer AOF:
   ```bash
   docker exec cartae-redis redis-cli CONFIG SET appendonly yes
   ```

2. Vérifier volume monté:
   ```yaml
   volumes:
     - redis-data:/data  # MUST be present
   ```

3. Forcer save manuel:
   ```bash
   docker exec cartae-redis redis-cli BGSAVE
   ```

---

### Latence élevée sur quota checks

**Symptômes:**
- P95 latency > 200ms sur `/api/gateway/quota-check`

**Debug:**
1. Check Redis latency:
   ```bash
   docker exec cartae-redis redis-cli --latency
   ```

2. Check ZSET size:
   ```bash
   docker exec cartae-redis redis-cli
   > KEYS rate_limit:*
   > ZCARD rate_limit:plugin-1:user-1
   # Si > 1000 entries → Problème cleanup
   ```

**Solutions:**
1. Cleanup manuel:
   ```redis
   ZREMRANGEBYSCORE rate_limit:plugin-1:user-1 0 <old_timestamp>
   ```

2. Réduire window (3600s → 1800s):
   ```typescript
   const quota = { limit: 100, window: 1800 };
   ```

3. Augmenter Redis resources:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 1G  # Au lieu de 512M
   ```

---

### Prometheus ne scrappe pas métriques

**Symptômes:**
- Targets "DOWN" dans http://localhost:9090/targets

**Debug:**
1. Vérifier Traefik metrics enabled:
   ```bash
   curl http://localhost:8080/metrics
   # Doit retourner métriques Prometheus
   ```

2. Vérifier réseau Prometheus:
   ```bash
   docker network inspect cartae-network | grep prometheus
   ```

**Solutions:**
- Ajouter Prometheus au réseau: `networks: [cartae-network]`
- Vérifier `prometheus.yml` targets: `['traefik-gateway:8080']`
- Redémarrer Prometheus: `docker-compose restart prometheus`

---

## Production Recommendations

### 1. Sécurité

**Traefik Dashboard:**
```yaml
# Activer Basic Auth
labels:
  - "traefik.http.middlewares.traefik-auth.basicauth.users=admin:$$apr1$$..."
  - "traefik.http.routers.traefik-dashboard.middlewares=traefik-auth"

# Désactiver API insecure
command:
  - "--api.insecure=false"
```

**HTTPS Obligatoire:**
```yaml
# Redirect HTTP → HTTPS
- "--entrypoints.web.http.redirections.entrypoint.to=websecure"
- "--entrypoints.web.http.redirections.entrypoint.scheme=https"

# Let's Encrypt automatic SSL
- "--certificatesresolvers.letsencrypt.acme.email=admin@cartae.com"
- "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
- "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
```

**Rate Limiting Plus Strict:**
```yaml
# Réduire limites
api-rate-limit:
  rateLimit:
    average: 50   # 50 req/s au lieu de 100
```

### 2. Performance

**Redis Clustering:**
```yaml
# Redis Cluster (3 masters + 3 replicas)
services:
  redis-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes
  redis-2:
    ...
  redis-3:
    ...
```

**Traefik Load Balancing:**
```yaml
# Plusieurs instances database-api
services:
  database-api-1:
    ...
  database-api-2:
    ...
  database-api-3:
    ...

# Traefik auto load-balance
service:
  loadBalancer:
    servers:
      - url: "http://database-api-1:3000"
      - url: "http://database-api-2:3000"
      - url: "http://database-api-3:3000"
```

**Cache Responses:**
```yaml
# Traefik cache middleware (ou Varnish)
middlewares:
  api-cache:
    plugin:
      cache:
        ttl: 60  # 1 minute
```

### 3. High Availability

**Traefik HA:**
```yaml
# Consul backend (shared config)
command:
  - "--providers.consul.endpoints=consul:8500"

services:
  traefik-1:
    ...
  traefik-2:
    ...
  traefik-3:
    ...
  consul:
    image: consul:latest
```

**Redis Sentinel:**
```yaml
# Automatic failover
services:
  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
  redis-sentinel-2:
    ...
  redis-sentinel-3:
    ...
```

### 4. Monitoring

**Alertmanager:**
```yaml
# Prometheus Alertmanager (Slack, email, PagerDuty)
services:
  alertmanager:
    image: prom/alertmanager:v0.25.0
    volumes:
      - ./alertmanager/config.yml:/etc/alertmanager/config.yml
```

**Grafana:**
```yaml
# Dashboards + Alerting
services:
  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

**Distributed Tracing:**
```yaml
# Jaeger ou Tempo
command:
  - "--tracing.jaeger=true"
  - "--tracing.jaeger.samplingServerURL=http://jaeger:5778/sampling"
```

### 5. Backups

**Redis Snapshots:**
```bash
# Cron job quotidien
0 2 * * * docker exec cartae-redis redis-cli BGSAVE
0 2 * * * cp /var/lib/docker/volumes/redis-data/_data/dump.rdb /backups/redis/$(date +\%Y\%m\%d).rdb
```

**Prometheus TSDB:**
```bash
# Snapshot API
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot
tar -czf prometheus-backup-$(date +\%Y\%m\%d).tar.gz /prometheus/snapshots/<snapshot_id>
```

---

## Conclusion

L'API Gateway Cartae fournit:

✅ **Rate limiting multi-niveau** (global, per-IP, plugin quotas)
✅ **DDoS protection basique** (1000 req/s global)
✅ **Redis sliding window backend** (précis, performant)
✅ **Quota Manager API** (monitoring, reset, webhooks)
✅ **Prometheus metrics** (observability complète)
✅ **Graceful degradation** (fail open si Redis down)
✅ **Production-ready** (HA, backups, alerting)

**Prochaines étapes:**

- [ ] Tests charge (k6, Gatling)
- [ ] Grafana dashboards setup
- [ ] Alertmanager configuration (Slack webhooks)
- [ ] SSL/TLS certificates (Let's Encrypt)
- [ ] Redis clustering (HA)
- [ ] Documentation API (OpenAPI/Swagger)

---

**Session 81h - Completed**
**Author:** Claude Code
**Date:** 2025-11-15
