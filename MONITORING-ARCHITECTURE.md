# MONITORING-ARCHITECTURE

Documentation complète de la stack de monitoring pour Cartae - Session 81d.

## 1. Vue d'ensemble de l'Architecture

### Diagram ASCII - Stack Monitoring Cartae

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MONITORING & OBSERVABILITY STACK                 │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         DATA COLLECTION LAYER                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │  node-exporter   │  │  redis-exporter  │  │   postgres   │   │
│  │   (Metrics)      │  │   (Metrics)      │  │  -exporter   │   │
│  │   :9100          │  │   :9121          │  │  (Metrics)   │   │
│  │                  │  │                  │  │   :9187      │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬──────┘   │
│           │                     │                     │          │
│  ┌──────────────────┐           │          ┌─────────────────┐   │
│  │  database-api    │           │          │   Promtail      │   │
│  │  /metrics :3001  │           │          │ (Log Shipper)   │   │
│  └────────┬─────────┘           │          └────────┬────────┘   │
│           │                     │                   │            │
│           └──────────┬──────────┴───────────────────┘            │
│                      │                                            │
└──────────────────────┼────────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────────┐      ┌────────▼─────────┐
│   PROMETHEUS       │      │   LOKI (Logs)    │
│  :9090             │      │   :3100          │
│ (Time-series DB)   │      │ (Log Aggregator) │
└───────┬────────────┘      └────────┬─────────┘
        │                            │
        │    ┌───────────────────────┘
        │    │
        │    │  ┌──────────────────────┐
        │    └─▶│   ALERTMANAGER       │
        │       │   :9093             │
        │       │ (Alert Routing)      │
        │       └──────────┬───────────┘
        │                  │
        │      ┌───────────┴───────────┐
        │      │                       │
┌───────▼──────▼──────────┐   ┌───────▼──────────┐
│      GRAFANA            │   │   Email/Webhook  │
│    :3000                │   │  (Notifications) │
│ (Dashboards & Viz)      │   │                  │
└─────────────────────────┘   └──────────────────┘
```

### Flux de Données

1. **Collecte** : Exporters envoient métriques à Prometheus (pull model)
2. **Agrégation** : Prometheus stocke time-series + Loki stocke logs
3. **Alerting** : Prometheus évalue règles → envoie alertes à Alertmanager
4. **Notification** : Alertmanager route alertes → Email/Webhook
5. **Visualisation** : Grafana interroge Prometheus/Loki → Dashboards

---

## 2. Prometheus - Collecte de Métriques

### Configuration Générale

Fichier: `/infra/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s          # Récupère métriques toutes les 15s
  evaluation_interval: 15s      # Évalue règles toutes les 15s
  external_labels:
    cluster: 'cartae'           # Identifie le cluster
    environment: 'production'   # Environnement
```

### Retention de Données

```
--storage.tsdb.retention.time=30d
```

- **Durée** : 30 jours
- **Format** : Time-series database (TSDB)
- **Chemin** : `/prometheus` (volume Docker)
- **Space** : ~15-20GB pour 30 jours (dépend du nombre de séries)

### Scrape Configurations (Cibles Monitorées)

| Cible | Port | Intervalle | Labels |
|-------|------|-----------|--------|
| Prometheus | 9090 | 15s | self-monitoring |
| node-exporter | 9100 | 15s | instance=cartae-host |
| redis-exporter | 9121 | 15s | instance=cartae-redis |
| postgres-exporter | 9187 | 15s | instance=cartae-postgres |
| database-api | 3001 | 15s | service=api |
| traefik | 8080 | 15s | service=proxy |

### Métriques Clés Collectées

**Système (node-exporter) :**
- `node_cpu_seconds_total` → CPU usage
- `node_memory_MemAvailable_bytes` → Mémoire disponible
- `node_filesystem_avail_bytes` → Espace disque libre
- `node_network_*` → Trafic réseau

**Redis (redis-exporter) :**
- `redis_memory_used_bytes` → Mémoire utilisée
- `redis_keyspace_hits_total` → Cache hits
- `redis_keyspace_misses_total` → Cache misses
- `redis_connected_clients` → Connexions actives

**PostgreSQL (postgres-exporter) :**
- `pg_up` → Status (1=up, 0=down)
- `pg_stat_activity_count` → Connexions par state
- `pg_settings_max_connections` → Max connections configuré
- `pg_stat_statements_*` → Query performance

**Application (database-api) :**
- `http_requests_total` → Total requests (label: status, method, path)
- `http_request_duration_seconds` → Request latency (histogram)
- `pg_client_*` → Client metrics (slow queries, connection pool)

---

## 3. Grafana - Dashboards & Visualisation

### Configuration et Provisioning

Fichier: `/infra/grafana/provisioning/datasources/datasources.yml`

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    url: http://loki:3100
    editable: false
```

### Accès et Authentification

- **URL** : http://localhost:3000
- **Admin User** : `${GRAFANA_ADMIN_USER}` (défaut: admin)
- **Admin Password** : `${GRAFANA_ADMIN_PASSWORD}`
- **Sign-up** : Désactivé (`GF_USERS_ALLOW_SIGN_UP=false`)
- **Plugins** : redis-datasource installé

### Dashboards Disponibles

Chemin: `/infra/grafana/dashboards/`

1. **infrastructure-overview.json**
   - Vue d'ensemble système (CPU, RAM, Disk)
   - Status des services (Prometheus, Redis, PostgreSQL)
   - Network throughput
   - Disk I/O

2. **Redis Performance** (à implémenter)
   - Memory usage evolution
   - Cache hit/miss ratio
   - Connected clients
   - Eviction rate

3. **PostgreSQL Monitoring** (à implémenter)
   - Active connections
   - Slow queries detection
   - Cache hit ratio
   - Table/Index size trends

4. **API Performance** (à implémenter)
   - Request rate (req/s)
   - Error rate (5xx %)
   - Latency percentiles (p50, p95, p99)
   - Status code distribution

5. **Logs Overview** (Loki integration)
   - Log volume par service
   - Error/Warning ratio
   - Top log messages

### Provisioning Automatique

Fichier: `/infra/grafana/provisioning/dashboards/dashboards.yml`

- Charge dashboards depuis `/var/lib/grafana/dashboards/`
- Update interval: 10s
- Auto-reload: activé

### Alerting dans Grafana

- Règles d'alerte gérées par Prometheus (voir section 8)
- Grafana affiche alertes via datasource Prometheus
- Notifications via Alertmanager

---

## 4. Loki + Promtail - Agrégation de Logs

### Configuration Loki

Fichier: `/infra/loki/loki-config.yml`

```yaml
auth_enabled: false                    # Pas d'authentification
http_listen_port: 3100
grpc_listen_port: 9096

server:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules

schema_config:
  configs:
    - from: 2023-01-01
      store: boltdb-shipper
      schema: v11

limits_config:
  retention_period: 744h              # 31 jours
  ingestion_rate_mb: 16              # Débit max 16 MB/s
  ingestion_burst_size_mb: 32        # Burst 32 MB
  max_query_series: 1000             # Résultats max queries
  max_query_parallelism: 32          # Parallélisme
```

### Configuration Promtail (Log Shipper)

Fichier: `/infra/loki/promtail-config.yml`

**Sources de Logs:**
- `/var/log/*` → Logs système
- `/var/lib/docker/containers/*` → Logs containers Docker

**Processing Pipeline:**
1. Parse logs
2. Extract labels (job, stream, container)
3. Forward to Loki (http://loki:3100/loki/api/v1/push)

### Stratégie de Rétention

| Type | Durée | Rationale |
|------|-------|-----------|
| Logs actifs | 31j | Debugging historique |
| Compaction | 10 min | Fusion chunks |
| Deletion | 2h après expiration | Cleanup asynchrone |

### Logs Collectés

**Conteneurs Cartae:**
- database-api → stdout/stderr
- redis → stderr
- postgres → postgresql.log

**Système:**
- syslog → /var/log/syslog
- auth logs → /var/log/auth.log
- docker daemon → /var/log/docker.log

---

## 5. Alertmanager - Routage et Notifications

Fichier: `/infra/alertmanager/alertmanager.yml`

### Configuration Globale

```yaml
global:
  resolve_timeout: 5m                # Alerte résolue après 5 min sans feu
  smtp_smarthost: '${SMTP_HOST}:${SMTP_PORT}'
  smtp_auth_username: '${SMTP_USER}'
  smtp_auth_password: '${SMTP_PASSWORD}'
  smtp_require_tls: true             # TLS obligatoire
```

### Stratégie de Routage

```
Root Route:
├── CRITICAL (severity=critical)
│   └─→ team-cartae-critical
│       • Wait: 0s (immédiat)
│       • Repeat: 4h
│       • Receivers: Email + Webhook critiques
│
├── WARNING (severity=warning)
│   └─→ team-cartae
│       • Wait: 30s (groupe)
│       • Repeat: 12h
│       • Receivers: Email standard
│
├── ServiceDown (alertname=ServiceDown)
│   └─→ team-cartae-critical (override)
│
└── DiskSpaceCritical (alertname=DiskSpaceCritical)
    └─→ team-cartae-critical (override)
```

### Grouping Rules

```yaml
group_by: ['alertname', 'cluster', 'service']
```

Exemple:
- 5 alertes "HighMemoryUsage" différentes instances → 1 notification groupée
- "ServiceDown" + "HighMemoryUsage" → 2 notifications séparées

### Inhibition (Suppression d'Alertes)

1. **Critical supprime Warning**
   - Si `severity=critical` feu → supprime `severity=warning` identique
   - Évite notifications redondantes

2. **DiskSpaceCritical supprime DiskSpaceWarning**
   - Si espace disk < 10% → masque alerte < 20%

### Receivers (Destinations)

| Nom | Type | Destination | Trigger |
|-----|------|-------------|---------|
| team-cartae | Email | `${ALERT_EMAIL}` | Warning/Info |
| team-cartae | Webhook | `${WEBHOOK_URL}` | Warning/Info (Slack/Discord) |
| team-cartae-critical | Email | `${ALERT_EMAIL_CRITICAL}` | Critical |
| team-cartae-critical | Webhook | `${WEBHOOK_URL_CRITICAL}` | Critical |
| null | Null | (silent) | Tests |

### Environment Variables Requises

```bash
ALERT_EMAIL=ops@cartae.local
ALERT_EMAIL_CRITICAL=oncall@cartae.local
WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
WEBHOOK_URL_CRITICAL=https://hooks.slack.com/services/aaa/bbb/ccc
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alertmanager@example.com
SMTP_PASSWORD=xxxx
```

---

## 6. Exporters - Collecteurs de Métriques

### Node Exporter (Système)

**Image:** `prom/node-exporter:v1.7.0`
**Port:** 9100
**Commande:**
```bash
docker run \
  -v /:/host:ro,rslave \
  --pid host \
  prom/node-exporter:v1.7.0 \
  --path.rootfs=/host \
  --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($|/)
```

**Metrics:**
- CPU, Memory, Disk, Network
- Process-level statistics
- Filesystem usage

### Redis Exporter

**Image:** `oliver006/redis_exporter:v1.55.0`
**Port:** 9121
**Environment:**
```bash
REDIS_ADDR=redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}
```

**Metrics:**
- Memory usage (used/max/peak)
- Cache performance (hits/misses)
- Connection count
- Eviction stats
- Replication status

### PostgreSQL Exporter

**Image:** `prometheuscommunity/postgres-exporter:v0.15.0`
**Port:** 9187
**Connection String:**
```
postgresql://USER:PASSWORD@postgres:5432/cartae?sslmode=disable
```

**Metrics:**
- Active connections
- Transaction rate
- Query performance
- Cache effectiveness
- Table/Index statistics

---

## 7. Metrics API - Endpoint Prometheus

### Implémentation dans database-api

**Endpoint:** `GET /metrics`
**Port:** 3001
**Format:** Prometheus text format

### Métriques Exposées

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200",path="/api/v1/users"} 1234

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",path="/api/users"} 100
http_request_duration_seconds_bucket{le="0.5",path="/api/users"} 200
http_request_duration_seconds_bucket{le="1.0",path="/api/users"} 250
http_request_duration_seconds_sum{path="/api/users"} 150.5
http_request_duration_seconds_count{path="/api/users"} 300

# HELP pg_client_slow_queries Slow query count
# TYPE pg_client_slow_queries gauge
pg_client_slow_queries{duration=">1s"} 2
pg_client_slow_queries{duration=">5s"} 0
```

### Middleware Prometheus (Node.js)

```typescript
import promClient from 'prom-client';

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'status', 'path'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status', 'path']
});

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, res.statusCode, req.path)
      .observe(duration);
    httpRequestsTotal
      .labels(req.method, res.statusCode, req.path)
      .inc();
  });

  next();
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

---

## 8. Alert Rules - Règles d'Alerte

Fichier: `/infra/prometheus/rules/alerts.yml`

### Groupe: Infrastructure

#### ServiceDown (CRITICAL)
```
Condition: up == 0
Duration: 1 minute
Description: Service n'a pas répondu pendant 1 min
```

#### HighCPUUsage (WARNING)
```
Condition: CPU usage > 80%
Duration: 5 minutes
Calculation: 100 - (avg idle time * 100)
```

#### HighMemoryUsage (WARNING)
```
Condition: Memory > 85%
Duration: 5 minutes
Calculation: (1 - MemAvailable / MemTotal) * 100
```

#### DiskSpaceCritical (CRITICAL)
```
Condition: Disk free < 10%
Duration: 1 minute
Action: IMMEDIATE (priority: p0)
```

#### DiskSpaceWarning (WARNING)
```
Condition: Disk free < 20%
Duration: 5 minutes
Action: Supprimée si DiskSpaceCritical active
```

### Groupe: Redis

#### RedisDown (CRITICAL)
```
Condition: redis_up == 0
Duration: 1 minute
Severity: Critical (service critique)
```

#### RedisHighMemory (WARNING)
```
Condition: Memory > 90% max
Duration: 5 minutes
Action: Check eviction policy, clean keys
```

#### RedisLowHitRate (WARNING)
```
Condition: Hit rate < 70%
Duration: 10 minutes
Formula: hits / (hits + misses)
```

### Groupe: PostgreSQL

#### PostgreSQLDown (CRITICAL)
```
Condition: pg_up == 0
Duration: 1 minute
Action: Immediate fallback/recovery
```

#### PostgreSQLTooManyConnections (WARNING)
```
Condition: Active connections > 80% max
Duration: 5 minutes
Action: Check for connection leaks
```

#### PostgreSQLSlowQueries (WARNING)
```
Condition: Query duration > 60 seconds
Duration: 5 minutes
Action: Investigate query plan, add indexes
```

### Groupe: Application

#### APIHighErrorRate (WARNING)
```
Condition: 5xx error rate > 5%
Duration: 5 minutes
Calculation: count(5xx) / count(all)
Action: Check application logs (Loki)
```

#### APIHighLatency (WARNING)
```
Condition: p95 latency > 1 second
Duration: 5 minutes
Calculation: histogram_quantile(0.95, latency_bucket)
Action: Check backend performance, DB queries
```

---

## 9. Dashboards - Description

### Infrastructure Overview Dashboard

**Panels:**
1. **CPU Usage** (Graph)
   - Metric: `100 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))`
   - Alert threshold: 80%

2. **Memory Usage** (Graph)
   - Metric: `(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100`
   - Alert threshold: 85%

3. **Disk Space** (Gauge)
   - Metric: `(node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100`
   - Critical: < 10%, Warning: < 20%

4. **Services Status** (Stat)
   - Metrics: `up{job=~"redis|postgres|api"}`
   - Color: Green (1) / Red (0)

5. **Network Traffic** (Graph)
   - In: `rate(node_network_receive_bytes_total[5m])`
   - Out: `rate(node_network_transmit_bytes_total[5m])`

### Redis Performance Dashboard

**Panels:**
1. **Memory Evolution** (Graph, 7d)
2. **Cache Hit Ratio** (Stat)
3. **Connected Clients** (Stat)
4. **Evicted Keys** (Counter)

### PostgreSQL Monitoring Dashboard

**Panels:**
1. **Active Connections** (Gauge)
2. **Slow Query Count** (Stat)
3. **Cache Hit Ratio** (Graph)
4. **Transaction Rate** (Graph)

### API Performance Dashboard

**Panels:**
1. **Request Rate** (Graph) - req/sec
2. **Error Rate** (Graph) - 5xx %
3. **Latency Percentiles** (Graph) - p50/p95/p99
4. **Status Code Distribution** (Pie)

---

## 10. Deployment - Démarrage Complet

### Prérequis

```bash
# Variables d'environnement
cp .env.local.example .env.local

# Éditer .env.local avec:
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=changeme
REDIS_PASSWORD=secure_password
POSTGRES_USER=cartae
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=cartae
ALERT_EMAIL=ops@cartae.local
ALERT_EMAIL_CRITICAL=oncall@cartae.local
WEBHOOK_URL=https://hooks.slack.com/services/xxx
WEBHOOK_URL_CRITICAL=https://hooks.slack.com/services/yyy
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alert@example.com
SMTP_PASSWORD=password
```

### Docker Compose - Stack Complète

```bash
# Démarrer tous les services monitoring
cd /infra/docker
docker-compose -f docker-compose.base.yml \
               -f docker-compose.monitoring.yml \
               -f docker-compose.dev.yml \
               up -d

# Vérifier status
docker-compose ps

# Logs
docker-compose logs -f prometheus
docker-compose logs -f grafana
docker-compose logs -f alertmanager
```

### Commandes Utiles

```bash
# Arrêter stack
docker-compose down

# Arrêter + supprimer volumes (WARNING: perte données)
docker-compose down -v

# Redémarrer un service
docker-compose restart prometheus

# Voir logs
docker-compose logs -f --tail=100 grafana

# Vérifier santé services
docker-compose ps
# Status: Up (green) ou Exited (red)
```

### Health Checks

```bash
# Prometheus ready?
curl http://localhost:9090/-/healthy

# Grafana ready?
curl http://localhost:3000/api/health

# Loki ready?
curl http://localhost:3100/ready

# Alertmanager ready?
curl http://localhost:9093/-/healthy

# Node Exporter metrics?
curl http://localhost:9100/metrics | head -20
```

---

## 11. URLs d'Accès

### Interfaces Web

| Service | URL | Port | Notes |
|---------|-----|------|-------|
| Prometheus | http://localhost:9090 | 9090 | Scrape configs, targets, graphing |
| Grafana | http://localhost:3000 | 3000 | Dashboards (login: admin/password) |
| Loki | http://localhost:3100 | 3100 | API logs (via Grafana UI) |
| Alertmanager | http://localhost:9093 | 9093 | Alert status, silences |
| Node Exporter | http://localhost:9100/metrics | 9100 | Raw metrics |
| Redis Exporter | http://localhost:9121/metrics | 9121 | Raw metrics |
| Postgres Exporter | http://localhost:9187/metrics | 9187 | Raw metrics |

### Endpoints API Importants

```
# Prometheus
GET /api/v1/query?query=up                    # Query instant
GET /api/v1/query_range?query=...&start=...&end=...&step=15s
GET /api/v1/targets                           # Scrape targets
GET /api/v1/rules                             # Alert rules

# Alertmanager
GET /api/v1/alerts                            # Active alerts
GET /api/v1/alerts/groups                     # Grouped alerts
POST /api/v1/alerts                           # Send alert (testing)

# Grafana
GET /api/datasources                          # List datasources
GET /api/search                                # Search dashboards
GET /api/dashboards/db/:slug                  # Get dashboard

# Loki
GET /loki/api/v1/query?query=...              # LogQL query
GET /loki/api/v1/label/__name__/values        # All labels
```

### Prometheus Scrape Targets

Accédez à: **http://localhost:9090/targets**

Devriez voir (statut: UP):
- prometheus (localhost:9090)
- node (node-exporter:9100)
- redis (redis-exporter:9121)
- postgres (postgres-exporter:9187)
- database-api (database-api:3001)
- traefik (traefik:8080) - optionnel

---

## 12. Troubleshooting - Guide de Dépannage

### Problème: Prometheus down

**Symptômes:**
```
curl: (7) Failed to connect to localhost:9090: Connection refused
```

**Solutions:**
```bash
# 1. Vérifier container
docker ps | grep prometheus
# Si DOWN: docker-compose up -d prometheus

# 2. Vérifier logs
docker logs cartae-prometheus
# Rechercher: config.file path, storage.tsdb.path

# 3. Vérifier config YAML
docker exec cartae-prometheus cat /etc/prometheus/prometheus.yml
# Vérifier syntaxe YAML (indentation)

# 4. Recharger config (without restart)
curl -X POST http://localhost:9090/-/reload
```

**Causes communes:**
- Config YAML invalide (check indentation, typos)
- Volume non monté → config file missing
- Port 9090 déjà utilisé

---

### Problème: Alertmanager n'envoie pas emails

**Symptômes:**
```
Alertes actives dans Prometheus/Grafana mais pas de notifications
```

**Solutions:**
```bash
# 1. Vérifier config Alertmanager
docker exec cartae-alertmanager cat /etc/alertmanager/config.yml
# Check: smtp_smarthost, receivers, routes

# 2. Vérifier Alertmanager reçoit alertes
curl http://localhost:9093/api/v1/alerts
# Devrait voir active alerts

# 3. Vérifier logs
docker logs cartae-alertmanager | grep -i "smtp\|error"

# 4. Test SMTP manuellement
docker exec cartae-alertmanager \
  telnet smtp.example.com 587
# Devrait connecter sans erreur
```

**Causes communes:**
- SMTP_HOST/PORT mauvais dans .env
- Credentials SMTP invalides
- Firewall bloque port SMTP
- Email receiver vide

---

### Problème: Pas de métriques dans Prometheus

**Symptômes:**
```
Grafana affiche "No data" sur tous les graphs
Prometheus targets montrent RED (DOWN)
```

**Solutions:**
```bash
# 1. Vérifier targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets'

# 2. Si target DOWN - check network
docker exec cartae-prometheus ping node-exporter
docker exec cartae-prometheus nc -zv node-exporter 9100

# 3. Vérifier exporter démarre
docker ps | grep exporter
docker logs cartae-node-exporter | tail -20

# 4. Test scrape manual
curl http://localhost:9100/metrics | head -20
# Devrait voir metrics

# 5. Vérifier DNS
docker exec cartae-prometheus nslookup node-exporter
# Devrait résoudre IP correcte
```

**Causes communes:**
- Services not running (docker-compose restart)
- Network isolation (check docker networks)
- Firewall bloque ports exporters
- Prometheus config job_name invalide

---

### Problème: Grafana ne se connecte pas à Prometheus

**Symptômes:**
```
Grafana → Data Sources → Prometheus = "Connection failed"
```

**Solutions:**
```bash
# 1. Vérifier Prometheus up
curl http://localhost:9090/-/healthy

# 2. Vérifier datasource URL
curl http://prometheus:9090 (from inside grafana container)
docker exec cartae-grafana curl http://prometheus:9090

# 3. Check Grafana logs
docker logs cartae-grafana | grep -i "prometheus\|datasource"

# 4. Vérifier networkings
docker network ls
docker inspect monitoring-network

# 5. Re-provision datasource
docker-compose restart grafana
# Attend ~30s puis check datasources
```

**Causes communes:**
- Prometheus n'est pas sur même network
- URL datasource incorrecte (localhost vs hostname)
- Prometheus pas démarré
- Grafana cache stale

---

### Problème: Disk remplissant rapidement

**Symptômes:**
```
Prometheus storage usage: 50GB (3 jours seulement)
Loki storage usage: 100GB
```

**Solutions:**
```bash
# 1. Checker retention actuelle
docker inspect cartae-prometheus | grep -i "retention"
# Devrait voir: --storage.tsdb.retention.time=30d

# 2. Réduire retention (30j → 7j)
# Edit docker-compose.monitoring.yml:
# Change: --storage.tsdb.retention.time=7d
docker-compose up -d prometheus

# 3. Checker Loki retention
docker exec cartae-loki cat /etc/loki/local-config.yaml | grep retention
# Devrait voir: retention_period: 744h (31j)

# 4. Réduire Loki retention (31j → 7j)
# Edit infra/loki/loki-config.yml:
# Change: retention_period: 168h
docker-compose up -d loki

# 5. Nettoyer old data
docker exec cartae-prometheus rm -rf /prometheus/wal/*
docker exec cartae-prometheus rm -rf /prometheus/chunks_head/*
docker-compose restart prometheus
```

**Rationale:**
- Production: 30j acceptable
- Dev: 7j suffisant
- High-cardinality metrics → reduce scrape interval (15s → 30s)

---

### Problème: Loki n'indexe pas les logs

**Symptômes:**
```
Grafana Logs panel: "No logs"
Promtail actif (docker ps) mais pas de data
```

**Solutions:**
```bash
# 1. Vérifier Promtail logs
docker logs cartae-promtail | tail -30
# Rechercher: "pushing batch", errors

# 2. Vérifier Loki reçoit pushes
docker logs cartae-loki | tail -30 | grep -i "pushed\|ingested"

# 3. Test push manual
docker exec cartae-promtail \
  curl -X POST http://loki:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{"streams":[{"stream":{"job":"test"},"values":[["'$(date +%s)000000000'","test message"]]}]}'

# 4. Check Loki status
curl http://localhost:3100/ready
# Devrait répondre: ready

# 5. Check scrape configs Promtail
docker exec cartae-promtail cat /etc/promtail/config.yml
# Vérifier: targets, path_prefix, relabel_configs
```

**Causes communes:**
- Loki pas accessible depuis Promtail
- Config YAML Promtail invalide
- Aucun fichier log à /var/log/
- Loki pas sur same network

---

### Problème: Alertes ne s'évaluent pas

**Symptômes:**
```
Rules page affiche: "Evaluating" mais pas d'alertes firing
Alert conditions vrais (CPU 95%) mais pas d'alert
```

**Solutions:**
```bash
# 1. Vérifier rules sont chargées
curl http://localhost:9090/api/v1/rules | jq '.data.groups'
# Devrait voir: infrastructure, redis, postgres, application groups

# 2. Check rule syntax
promtool check rules /infra/prometheus/rules/alerts.yml
# Ou within container:
docker exec cartae-prometheus \
  promtool check rules /etc/prometheus/rules/

# 3. Check rule evaluation status
curl http://localhost:9090/rules
# Check: Evaluating OK, Last evaluation, Last error

# 4. Check metrics exist
curl 'http://localhost:9090/api/v1/query?query=node_cpu_seconds_total' | jq .
# Devrait retourner values sinon metric n'existe pas

# 5. Test PromQL expression
curl 'http://localhost:9090/api/v1/query?query=100-avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))'
# Devrait retourner value numérique

# 6. Reload rules (without restart)
curl -X POST http://localhost:9090/-/reload
```

**Causes communes:**
- Rules file YAML invalide
- Metrics n'existent pas encore (wait ~15 min for first scrape)
- PromQL expression invalide
- for: duration pas encore atteinte

---

### Problème: Prometheus OOM (Out of Memory)

**Symptômes:**
```
docker logs cartae-prometheus | grep -i "oom\|out of memory"
Container killed par docker
```

**Solutions:**
```bash
# 1. Check memory usage
docker stats cartae-prometheus
# Voir: MEM USAGE vs LIMIT

# 2. Reduce cardinality
# Check high-cardinality metrics:
curl 'http://localhost:9090/api/v1/query?query=count(count by (__name__) ({}))'

# 3. Remove or relabel high-cardinality labels
# Example: remove path label from http_requests_total
# Edit docker-compose.monitoring.yml prometheus → add metric_relabel_configs

# 4. Reduce scrape interval
# Change: scrape_interval: 30s (instead 15s)

# 5. Reduce retention
# Change: --storage.tsdb.retention.time=7d (instead 30d)

# 6. Increase docker memory limit
# Edit docker-compose.monitoring.yml:
# prometheus:
#   deploy:
#     resources:
#       limits:
#         memory: 4G
docker-compose up -d prometheus

# 7. Check scrape configs
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'
# Each target = memory usage
# Remove unnecessary scrape_configs
```

---

## Conclusion

Stack monitoring Session 81d pour Cartae fournit:
- ✅ Collecte métriques infrastructure (CPU, RAM, Disk)
- ✅ Monitoring services critiques (Redis, PostgreSQL, API)
- ✅ Alerting intelligent avec routage par sévérité
- ✅ Agrégation centralisée des logs
- ✅ Dashboards customisés pour troubleshooting
- ✅ Notifications Email + Webhook (Slack/Discord)

Pour maintenance:
- Vérifier retention policies (30j disque)
- Monitor cardinality metrics
- Test alerting mensuellement
- Archive dashboards dans git
- Documenter additions exporters
