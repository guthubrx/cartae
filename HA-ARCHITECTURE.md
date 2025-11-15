# High Availability Architecture

**Session 81f - High Availability & Load Balancing**
**Cartae Infrastructure**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Load Balancing Strategy](#load-balancing-strategy)
4. [Health Checks Configuration](#health-checks-configuration)
5. [Scaling & Auto-Healing](#scaling--auto-healing)
6. [Rolling Updates](#rolling-updates)
7. [Monitoring & Metrics](#monitoring--metrics)
8. [Failure Scenarios & Recovery](#failure-scenarios--recovery)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What is High Availability?

High Availability (HA) est une architecture système qui garantit un niveau élevé de disponibilité opérationnelle (uptime) en éliminant les points de défaillance uniques (Single Points of Failure - SPOF) et en permettant des mises à jour sans interruption de service (zero-downtime deployments).

### Key Metrics

- **Availability Target**: 99.9% (43.2 minutes de downtime par mois maximum)
- **RTO (Recovery Time Objective)**: < 30 secondes
- **RPO (Recovery Point Objective)**: < 1 minute
- **Max Latency**: 200ms (P95)

### Architecture Principles

1. **No Single Point of Failure**: Chaque composant critique a au moins 2 instances
2. **Automated Failover**: Détection et récupération automatique en cas de panne
3. **Zero-Downtime Deployments**: Mises à jour sans interruption de service
4. **Health Monitoring**: Surveillance continue de l'état de chaque instance
5. **Load Distribution**: Répartition intelligente du trafic entre instances

---

## Architecture Components

### 1. Load Balancer - Traefik

**Rôle**: Point d'entrée unique qui distribue le trafic entre les instances API.

**Configuration**:
```yaml
# infra/traefik/traefik-ha.yml
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"
  metrics:
    address: ":8082"

providers:
  docker:
    watch: true
    exposedByDefault: false
    network: dmz-network

  file:
    directory: /etc/traefik/dynamic
    watch: true
```

**Fonctionnalités**:
- **Automatic Service Discovery**: Détection automatique des instances via Docker labels
- **Health Checks**: Vérification continue de l'état des instances
- **Sticky Sessions**: Affinité de session pour les connexions stateful
- **TLS Termination**: Gestion des certificats SSL/TLS
- **Metrics Export**: Export des métriques vers Prometheus

**Ports**:
- `80`: HTTP (redirects to HTTPS)
- `443`: HTTPS
- `8080`: Dashboard (DEV only)
- `8082`: Metrics (Prometheus)

### 2. API Instances (3 replicas)

**Rôle**: Instances de l'API Database qui traitent les requêtes clients.

**Configuration**:
```yaml
# infra/docker/docker-compose.ha.yml
database-api-1:
  image: cartae-database-api:latest
  environment:
    INSTANCE_ID: api-1
    PORT: 3001
    POSTGRES_HOST: postgres
    REDIS_HOST: redis
    PROMETHEUS_ENABLED: "true"

  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    interval: 10s
    timeout: 3s
    retries: 3
    start_period: 30s
```

**Caractéristiques**:
- **3 instances identiques** (api-1, api-2, api-3)
- **Shared Database**: Connexion PostgreSQL commune
- **Shared Cache**: Redis partagé pour la cohérence des sessions
- **Independent Failures**: Une instance défaillante n'affecte pas les autres

**Resource Limits**:
- CPU: 1 core (max), 0.5 core (reserved)
- Memory: 1GB (max), 512MB (reserved)
- Connection Pool: 2-10 connections PostgreSQL par instance

### 3. PostgreSQL Database

**Rôle**: Base de données relationnelle centralisée.

**Configuration**:
```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: cartae
    POSTGRES_USER: cartae_user
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U cartae_user -d cartae"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**HA Considerations**:
- **Single Instance** (acceptable pour MVP)
- **Future**: PostgreSQL replication (primary-standby) pour HA complète
- **Backup Strategy**: Snapshots quotidiens + WAL archiving

### 4. Redis Cache

**Rôle**: Cache distribué et session store.

**Configuration**:
```yaml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
    --save 60 1000
    --appendonly yes
```

**HA Considerations**:
- **Single Instance** (acceptable pour cache)
- **Persistence**: AOF (Append-Only File) pour durabilité
- **Future**: Redis Sentinel ou Redis Cluster pour HA

---

## Load Balancing Strategy

### 1. Load Balancing Algorithm

**Weighted Round Robin (WRR)** - Par défaut, Traefik utilise Round Robin:

```yaml
# infra/traefik/dynamic/load-balancer.yml
http:
  services:
    database-api-lb:
      loadBalancer:
        servers:
          - url: "http://database-api-1:3001"
          - url: "http://database-api-2:3001"
          - url: "http://database-api-3:3001"
```

**Comportement**:
1. Requête 1 → api-1
2. Requête 2 → api-2
3. Requête 3 → api-3
4. Requête 4 → api-1 (cycle)

**Alternatives**:
- **Least Connections**: Envoie le trafic vers l'instance avec le moins de connexions actives
- **IP Hash**: Affinité basée sur l'IP client (stateful apps)
- **Weighted**: Répartition basée sur des poids (pour instances hétérogènes)

### 2. Sticky Sessions

**Problème**: Les sessions utilisateur peuvent être perdues si le load balancer change d'instance entre requêtes.

**Solution**: Session affinity via cookies:

```yaml
sticky:
  cookie:
    name: cartae_server
    httpOnly: true
    secure: true
    sameSite: lax
```

**Comment ça marche**:
1. Première requête de l'utilisateur → Traefik choisit api-1
2. Traefik ajoute un cookie `cartae_server=api-1`
3. Requêtes suivantes → Toujours dirigées vers api-1
4. Si api-1 tombe, Traefik redirige vers api-2 et met à jour le cookie

**Trade-off**:
- ✅ Cohérence des sessions
- ❌ Déséquilibre potentiel si certains utilisateurs génèrent plus de trafic

### 3. Health Checks

**Configuration**:
```yaml
healthCheck:
  path: /health
  interval: 10s
  timeout: 3s
  scheme: http
  port: 3001
  followRedirects: false
  headers:
    X-Health-Check: "traefik"
```

**Comportement**:
- Traefik envoie `GET /health` toutes les 10 secondes à chaque instance
- Si réponse HTTP 200 → Instance healthy
- Si réponse HTTP 503 ou timeout → Instance unhealthy
- Instance unhealthy → Retirée du pool (pas de trafic envoyé)
- Traefik continue de vérifier l'instance unhealthy → Réintégration automatique quand healthy

**Circuit Breaker** (optionnel):
```yaml
middlewares:
  circuit-breaker:
    circuitBreaker:
      expression: "NetworkErrorRatio() > 0.30"
      checkPeriod: 10s
      fallbackDuration: 30s
      recoveryDuration: 60s
```

---

## Health Checks Configuration

### 1. Health Check Endpoints

**3 types de health checks** (Kubernetes-style):

#### a) Liveness Probe - `/live`

**Question**: "Le processus est-il vivant?"

**Usage**: Détecte les deadlocks, processus zombies, ou crashes silencieux.

**Endpoint**:
```typescript
// GET /live
{
  "alive": true,
  "instance": "api-1",
  "timestamp": "2025-11-15T14:30:00Z"
}
```

**Critère de succès**: Process répond (toujours HTTP 200 sauf crash total).

**Action en cas d'échec**: Restart du container (orchestrateur).

#### b) Readiness Probe - `/ready`

**Question**: "L'instance peut-elle accepter du trafic?"

**Usage**: Détecte si les dépendances critiques sont disponibles (DB, Redis).

**Endpoint**:
```typescript
// GET /ready
{
  "ready": true,
  "instance": "api-1",
  "timestamp": "2025-11-15T14:30:00Z",
  "reasons": []  // Si ready=false, liste des raisons
}
```

**Critère de succès**:
- ✅ Database accessible
- ✅ Redis accessible
- ✅ Memory usage < 95%

**Action en cas d'échec**: Retrait du load balancer (pas de trafic).

#### c) Health Check - `/health`

**Question**: "Quel est l'état global de l'instance?"

**Usage**: Monitoring détaillé + décisions load balancer.

**Endpoint**:
```typescript
// GET /health
{
  "status": "healthy",  // healthy | degraded | unhealthy
  "instance": "api-1",
  "timestamp": "2025-11-15T14:30:00Z",
  "checks": {
    "database": {
      "status": "ok",
      "latency": 15  // ms
    },
    "redis": {
      "status": "ok",
      "latency": 5
    },
    "memory": {
      "status": "ok",
      "details": {
        "heapUsedMB": 450,
        "heapTotalMB": 896,
        "usagePercent": 50
      }
    },
    "cpu": {
      "status": "ok",
      "details": {
        "loadAverage": [1.2, 1.5, 1.8],
        "normalizedLoad": 30
      }
    }
  },
  "uptime": 3600,  // seconds
  "version": "1.0.0"
}
```

**Critères de statut**:
- **Healthy**: Tous les checks `ok`
- **Degraded**: Au moins un check `degraded` (ex: latency élevée)
- **Unhealthy**: Au moins un check `failed` (ex: DB inaccessible)

**Action en cas d'échec**: HTTP 503 → Traefik retire l'instance du pool.

### 2. Health Check Implementation

**Fichier**: `packages/database-api/src/health/cluster-health.ts`

**Seuils configurables**:
```typescript
const THRESHOLDS = {
  memory: {
    degraded: 85,   // %
    critical: 95,
  },
  cpu: {
    degraded: 80,
    critical: 95,
  },
  latency: {
    database: {
      degraded: 100,  // ms
      critical: 500,
    },
    redis: {
      degraded: 50,
      critical: 200,
    },
  },
};
```

**Exemple de check Database**:
```typescript
async function checkDatabase(): Promise<HealthStatus> {
  const start = Date.now();

  try {
    const pool = new Pool({ /* config */ });
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();

    const latency = Date.now() - start;

    if (latency > THRESHOLDS.latency.database.critical) {
      return { status: 'failed', latency, message: `Latency too high: ${latency}ms` };
    } else if (latency > THRESHOLDS.latency.database.degraded) {
      return { status: 'degraded', latency, message: `Latency degraded: ${latency}ms` };
    }

    return { status: 'ok', latency };
  } catch (error) {
    return { status: 'failed', message: error.message };
  }
}
```

### 3. Health Check Monitoring

**Prometheus Metrics**:
```typescript
// packages/database-api/src/monitoring/ha-metrics.ts

export const healthCheckDuration = new Histogram({
  name: 'health_check_duration_seconds',
  help: 'Health check duration in seconds',
  labelNames: ['check_type', 'instance'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const healthCheckFailures = new Counter({
  name: 'health_check_failures_total',
  help: 'Total health check failures',
  labelNames: ['check_type', 'instance'],
});

export const instanceHealth = new Gauge({
  name: 'instance_health',
  help: 'Instance health status (1=healthy, 0.5=degraded, 0=unhealthy)',
  labelNames: ['instance'],
});
```

**Grafana Dashboard Queries**:
```promql
# Taux de succès des health checks
rate(health_check_failures_total[5m]) / rate(health_check_total[5m])

# Latency P95 des health checks
histogram_quantile(0.95, rate(health_check_duration_seconds_bucket[5m]))

# Nombre d'instances healthy
sum(instance_health == 1)
```

---

## Scaling & Auto-Healing

### 1. Horizontal Scaling

**Current State**: 3 instances statiques (configuration manuelle).

**Commandes**:
```bash
# Scale up to 5 instances
docker-compose -f infra/docker/docker-compose.ha.yml up -d --scale database-api=5

# Scale down to 2 instances
docker-compose -f infra/docker/docker-compose.ha.yml up -d --scale database-api=2
```

**Future**: Auto-scaling basé sur métriques (CPU, mémoire, requêtes/sec).

**Kubernetes Auto-scaling**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cartae-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cartae-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 2. Auto-Healing

**Docker Restart Policy**:
```yaml
database-api-1:
  restart: unless-stopped

  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    interval: 10s
    timeout: 3s
    retries: 3
    start_period: 30s
```

**Comportement**:
1. Health check échoue 3 fois de suite → Container marqué `unhealthy`
2. Docker redémarre automatiquement le container
3. `start_period: 30s` → Grace period avant les health checks (startup time)

**Kubernetes Probes**:
```yaml
livenessProbe:
  httpGet:
    path: /live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 2
  failureThreshold: 2
```

### 3. Resource Limits

**Configuration**:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

**Rationale**:
- **Limits**: Empêche une instance de monopoliser les ressources (protection du host)
- **Reservations**: Garantit un minimum de ressources (QoS - Quality of Service)
- **OOMKiller**: Si memory > limit → Docker kill le container (puis restart grâce à restart policy)

---

## Rolling Updates

### 1. Strategy Overview

**Zero-Downtime Deployment** = Mise à jour progressive instance par instance.

**Principes**:
1. Garder toujours au moins 2/3 instances healthy pendant l'update
2. Update une instance à la fois (sequential)
3. Attendre le health check avant de passer à l'instance suivante
4. Rollback automatique en cas d'échec

**Timeline Example** (3 instances, update = 30s):
```
Time  | api-1    | api-2    | api-3    | Traffic
------|----------|----------|----------|----------
0:00  | healthy  | healthy  | healthy  | 3 instances
0:05  | updating | healthy  | healthy  | 2 instances
0:35  | healthy  | healthy  | healthy  | 3 instances
0:40  | healthy  | updating | healthy  | 2 instances
1:10  | healthy  | healthy  | healthy  | 3 instances
1:15  | healthy  | healthy  | updating | 2 instances
1:45  | healthy  | healthy  | healthy  | 3 instances
```

**Total downtime**: 0 seconds (toujours ≥2 instances disponibles).

### 2. Rolling Update Script

**Fichier**: `infra/scripts/rolling-update.sh`

**Usage**:
```bash
# Update to latest image
POSTGRES_PASSWORD=xxx JWT_SECRET=xxx ./rolling-update.sh

# Update to specific version
POSTGRES_PASSWORD=xxx JWT_SECRET=xxx ./rolling-update.sh cartae-database-api:1.2.3
```

**Workflow**:
```bash
#!/bin/bash
for INSTANCE in api-1 api-2 api-3; do
  # 1. Stop old container
  docker stop "cartae-${INSTANCE}"
  docker rm "cartae-${INSTANCE}"

  # 2. Start new container
  docker run -d --name "cartae-${INSTANCE}" $IMAGE

  # 3. Wait for health check (max 60s)
  wait_for_health "$INSTANCE"

  # 4. Pause before next instance (10s)
  sleep 10
done
```

**Health Check Function**:
```bash
wait_for_health() {
  local instance=$1
  local elapsed=0
  local max_wait=60

  while [ $elapsed -lt $max_wait ]; do
    if curl -sf "http://${instance}:3001/health" > /dev/null; then
      echo "✅ ${instance} healthy!"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "❌ ${instance} failed to become healthy"
  exit 1
}
```

### 3. Rollback Strategy

**Automatic Rollback**: Si une instance ne devient pas healthy après 60s.

**Manual Rollback**:
```bash
# Restore previous image
docker tag cartae-database-api:1.2.2 cartae-database-api:latest
./rolling-update.sh cartae-database-api:1.2.2
```

**Backup State**:
```bash
# Before update, script creates backup
BACKUP_DIR="/tmp/cartae-rollback-20251115-143000"
docker inspect cartae-api-1 > $BACKUP_DIR/api-1.json
docker inspect cartae-api-2 > $BACKUP_DIR/api-2.json
docker inspect cartae-api-3 > $BACKUP_DIR/api-3.json
```

### 4. Pre-flight Checks

**Script vérifie avant de commencer**:
```bash
preflight_checks() {
  # Docker running?
  docker info > /dev/null || error "Docker not running"

  # Image exists?
  docker image inspect $IMAGE > /dev/null || error "Image not found"

  # Networks exist?
  for NETWORK in cartae-app-network cartae-data-network; do
    docker network inspect $NETWORK > /dev/null || error "Network not found"
  done

  # Env vars set?
  [ -z "$POSTGRES_PASSWORD" ] && error "POSTGRES_PASSWORD not set"
  [ -z "$JWT_SECRET" ] && error "JWT_SECRET not set"
}
```

---

## Monitoring & Metrics

### 1. HA-Specific Metrics

**Fichier**: `packages/database-api/src/monitoring/ha-metrics.ts`

**Load Balancer Metrics**:
```typescript
// Total requests per instance
export const lbRequestsTotal = new Counter({
  name: 'lb_requests_total',
  help: 'Total requests through load balancer',
  labelNames: ['instance', 'method', 'status', 'path'],
});

// Request distribution across instances
export const requestDistribution = new Counter({
  name: 'request_distribution_total',
  help: 'Request distribution across instances',
  labelNames: ['instance'],
});

// Active connections per instance
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Active connections per instance',
  labelNames: ['instance'],
});

// Request duration
export const requestDuration = new Histogram({
  name: 'request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['instance', 'method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});
```

**Health Check Metrics**:
```typescript
// Instance health (1=healthy, 0.5=degraded, 0=unhealthy)
export const instanceHealth = new Gauge({
  name: 'instance_health',
  help: 'Instance health status',
  labelNames: ['instance'],
});

// Health check duration
export const healthCheckDuration = new Histogram({
  name: 'health_check_duration_seconds',
  help: 'Health check duration in seconds',
  labelNames: ['check_type', 'instance'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Health check failures
export const healthCheckFailures = new Counter({
  name: 'health_check_failures_total',
  help: 'Total health check failures',
  labelNames: ['check_type', 'instance'],
});
```

**Database Metrics**:
```typescript
// Database latency
export const databaseLatency = new Histogram({
  name: 'database_latency_seconds',
  help: 'Database query latency in seconds',
  labelNames: ['instance', 'query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Database pool size
export const dbPoolSize = new Gauge({
  name: 'db_pool_size',
  help: 'Database connection pool size',
  labelNames: ['instance', 'state'],  // state: active, idle, waiting
});

// Database query errors
export const dbQueryErrors = new Counter({
  name: 'db_query_errors_total',
  help: 'Total database query errors',
  labelNames: ['instance', 'error_type'],
});
```

### 2. Prometheus Configuration

**Scrape Config**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cartae-api'
    scrape_interval: 10s
    static_configs:
      - targets:
          - 'database-api-1:9090'
          - 'database-api-2:9090'
          - 'database-api-3:9090'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: 'database-api-(.*):\d+'
        replacement: 'api-$1'

  - job_name: 'traefik'
    scrape_interval: 10s
    static_configs:
      - targets: ['traefik-lb:8082']
```

### 3. Grafana Dashboards

**Key Panels**:

#### a) Instance Health Overview
```promql
# Current health status per instance
instance_health{job="cartae-api"}

# Instances up
count(up{job="cartae-api"} == 1)

# Instances down
count(up{job="cartae-api"} == 0)
```

#### b) Request Distribution
```promql
# Requests per instance (rate 5m)
rate(lb_requests_total[5m])

# Request distribution pie chart
sum by (instance) (lb_requests_total)
```

#### c) Latency & Performance
```promql
# P50, P95, P99 request duration
histogram_quantile(0.50, rate(request_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(request_duration_seconds_bucket[5m]))

# Database latency P95
histogram_quantile(0.95, rate(database_latency_seconds_bucket[5m]))
```

#### d) Error Rates
```promql
# HTTP 5xx error rate
rate(lb_requests_total{status=~"5.."}[5m]) / rate(lb_requests_total[5m])

# Database errors
rate(db_query_errors_total[5m])

# Health check failures
rate(health_check_failures_total[5m])
```

### 4. Alerting Rules

**Prometheus Alerts**:
```yaml
# alerts.yml
groups:
  - name: high-availability
    interval: 30s
    rules:
      # Instance down
      - alert: InstanceDown
        expr: up{job="cartae-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} is down"
          description: "Instance has been down for 1 minute"

      # Less than 2 instances healthy
      - alert: InsufficientHealthyInstances
        expr: count(instance_health{job="cartae-api"} == 1) < 2
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Less than 2 healthy instances"
          description: "Only {{ $value }} instances are healthy"

      # High error rate
      - alert: HighErrorRate
        expr: |
          rate(lb_requests_total{status=~"5.."}[5m]) / rate(lb_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate (>5%)"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency P95 > 1s"
          description: "P95 latency is {{ $value }}s"
```

---

## Failure Scenarios & Recovery

### 1. Single Instance Failure

**Scénario**: Une instance crash (OOM, bug, network issue).

**Detection**:
- Docker health check échoue après 3 retries (30s)
- Traefik health check échoue (10s)
- Prometheus alerte `InstanceDown` après 1 minute

**Impact**:
- ❌ Instance défaillante retirée du load balancer (pas de trafic)
- ✅ 2 instances restantes continuent de servir le trafic
- ⚠️ Load augmente de 50% sur les instances restantes

**Recovery**:
1. Docker restart policy redémarre le container (automatic)
2. Health check redevient OK après 30s (startup period)
3. Traefik réintègre l'instance dans le pool (automatic)

**Timeline**:
```
0:00  Instance crash
0:10  Traefik détecte (retire du pool)
0:15  Docker redémarre le container
0:45  Health check OK (30s startup period)
0:50  Traefik réintègre l'instance
```

**Total downtime**: 0 secondes (2 instances disponibles).

### 2. Multiple Instances Failure

**Scénario**: 2 instances tombent simultanément (rare mais possible).

**Detection**: Alerte Prometheus `InsufficientHealthyInstances`.

**Impact**:
- ❌ 2 instances down
- ✅ 1 instance restante (service dégradé mais fonctionnel)
- ⚠️ Risque de surcharge sur la dernière instance

**Recovery**:
1. Docker redémarre les 2 instances (parallel)
2. Health checks OK après 30-60s
3. Traefik réintègre les instances

**Manual Intervention**:
- Si les 2 instances ne redémarrent pas → Investigation logs + restart manuel

### 3. Database Failure

**Scénario**: PostgreSQL inaccessible (crash, network, disk full).

**Detection**:
- Health check `/ready` échoue sur toutes les instances
- Instances marquées `unhealthy` par Traefik
- Alerte Prometheus `DatabaseDown`

**Impact**:
- ❌ Toutes les instances deviennent unhealthy
- ❌ Traefik ne route plus de trafic (HTTP 503)
- ❌ Service indisponible

**Recovery**:
1. **Automatic**: Docker restart PostgreSQL (si crash)
2. **Manual**: Investigation (logs, disk space, network)
3. **Restore from backup** (worst case)

**Prevention**:
- PostgreSQL replication (primary-standby)
- Connection pooling (retry logic)
- Circuit breaker (fail fast)

### 4. Redis Failure

**Scénario**: Redis inaccessible.

**Detection**:
- Health check `/ready` échoue (Redis check)
- Instances marquées `unhealthy`

**Impact**:
- ❌ Sessions perdues (users doivent se reconnecter)
- ❌ Cache misses (latency augmente)
- ⚠️ Service fonctionne mais dégradé

**Recovery**:
1. Docker restart Redis
2. Sessions reconstituées au fur et à mesure

**Mitigation**:
- Graceful degradation: API fonctionne sans cache (fallback DB)
- Redis Sentinel pour automatic failover

### 5. Load Balancer Failure

**Scénario**: Traefik crash.

**Detection**:
- Prometheus `up{job="traefik"} == 0`
- Alerte `LoadBalancerDown`

**Impact**:
- ❌ Service totalement indisponible (point d'entrée unique)
- ✅ Instances API continuent de fonctionner (backend OK)

**Recovery**:
1. Docker restart Traefik (automatic)
2. Traefik redécouvre les instances via Docker provider

**Prevention**:
- **Traefik HA**: 2+ instances Traefik avec IP failover (keepalived, HAProxy)
- **Cloud Load Balancer**: AWS ALB, GCP Load Balancer (managed, HA native)

### 6. Network Partition

**Scénario**: Network split entre instances et database.

**Detection**:
- Health checks échouent sur toutes les instances
- Timeout sur les connexions DB

**Impact**:
- ❌ Toutes les instances unhealthy
- ❌ Service indisponible

**Recovery**:
1. Investigation réseau (firewall, routing, DNS)
2. Restore network connectivity
3. Instances redeviennent healthy automatiquement

### 7. Rolling Update Failure

**Scénario**: Nouvelle version déployée contient un bug critique.

**Detection**:
- Health check échoue après update de la première instance
- Rolling update script détecte et stoppe

**Impact**:
- ⚠️ 1 instance down (nouvelle version)
- ✅ 2 instances OK (ancienne version)

**Recovery**:
1. Script rollback automatique (restore old image)
2. Investigation du bug (logs, tests)
3. Fix + re-deploy

**Workflow**:
```bash
# Rolling update starts
./rolling-update.sh cartae-api:1.3.0

# Update api-1 (new version)
# Health check fails after 60s
# Script stops and rolls back

# Output:
# ❌ api-1 failed to become healthy after 60s
# 🔄 Rolling back changes...
# ✅ api-1 restored to cartae-api:1.2.3
```

---

## Production Deployment

### 1. Pre-Deployment Checklist

**Infrastructure**:
- [ ] All Docker networks created (`docker network ls`)
- [ ] All volumes created (`docker volume ls`)
- [ ] Environment variables set (`.env` file or CI/CD secrets)
- [ ] TLS certificates configured (Traefik Let's Encrypt)
- [ ] Firewall rules configured (ports 80, 443, 8082)

**Database**:
- [ ] PostgreSQL initialized and accessible
- [ ] Database migrations applied (`npm run migrate`)
- [ ] Database backup configured (pg_dump cron)
- [ ] Connection pool limits configured (max 30 connections total)

**Monitoring**:
- [ ] Prometheus scraping endpoints
- [ ] Grafana dashboards imported
- [ ] Alerting rules configured
- [ ] Notification channels tested (email, Slack, PagerDuty)

**Security**:
- [ ] Strong passwords generated (`openssl rand -base64 32`)
- [ ] JWT secret rotated
- [ ] Traefik dashboard disabled or password-protected
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Rate limiting configured

### 2. Deployment Steps

**Step 1: Build Docker Image**
```bash
# Build new version
cd packages/database-api
docker build -t cartae-database-api:1.3.0 .

# Tag as latest
docker tag cartae-database-api:1.3.0 cartae-database-api:latest

# Push to registry (if using Docker Hub / private registry)
docker push cartae-database-api:1.3.0
```

**Step 2: Update Environment Variables**
```bash
# infra/docker/.env
POSTGRES_PASSWORD=xxx
REDIS_PASSWORD=xxx
JWT_SECRET=xxx
LOG_LEVEL=info
```

**Step 3: Start Infrastructure (First Deployment)**
```bash
cd infra/docker

# Start all services
docker-compose -f docker-compose.ha.yml up -d

# Verify all services started
docker-compose -f docker-compose.ha.yml ps

# Check logs
docker-compose -f docker-compose.ha.yml logs -f
```

**Step 4: Rolling Update (Subsequent Deployments)**
```bash
cd infra/scripts

# Load environment variables
source ../docker/.env

# Run rolling update
./rolling-update.sh cartae-database-api:1.3.0

# Output:
# 🚀 Starting Rolling Update
# ================================================
# 📦 Updating api-1
# ✅ api-1 is healthy!
# 📦 Updating api-2
# ✅ api-2 is healthy!
# 📦 Updating api-3
# ✅ api-3 is healthy!
# 🎉 Rolling Update Completed Successfully!
```

**Step 5: Verify Deployment**
```bash
# Check all instances healthy
curl http://localhost/api/health

# Check Traefik dashboard
open http://localhost:8080

# Check Prometheus targets
open http://localhost:9090/targets

# Check Grafana dashboard
open http://localhost:3000
```

### 3. Rollback Procedure

**Automatic Rollback** (if rolling update fails):
```bash
# Script automatically rolls back if health check fails
# No manual intervention needed
```

**Manual Rollback**:
```bash
# Restore previous version
./rolling-update.sh cartae-database-api:1.2.3

# Or restore specific backup
BACKUP_DIR=/tmp/cartae-rollback-20251115-143000
docker-compose -f docker-compose.ha.yml down
# Restore volumes from backup
docker-compose -f docker-compose.ha.yml up -d
```

### 4. Production Hardening

**Traefik**:
```yaml
# Disable dashboard in production
api:
  dashboard: false

# Enable access logs
accessLog:
  filePath: /var/log/traefik/access.log
  format: json

# Rate limiting
middlewares:
  rate-limit:
    rateLimit:
      average: 100
      burst: 50
```

**API Instances**:
```yaml
environment:
  NODE_ENV: production
  LOG_LEVEL: warn  # Reduce verbosity

# Resource limits
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
```

**Database**:
```bash
# PostgreSQL tuning (postgresql.conf)
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### 5. Backup Strategy

**Database Backups**:
```bash
# Daily backup cron (00:00 UTC)
0 0 * * * docker exec cartae-postgres pg_dump -U cartae_user cartae > /backups/cartae-$(date +\%Y\%m\%d).sql

# Weekly full backup
0 0 * * 0 docker exec cartae-postgres pg_basebackup -D /backups/full-$(date +\%Y\%m\%d)

# Retention: 7 daily, 4 weekly, 12 monthly
```

**Configuration Backups**:
```bash
# Backup Docker configs
tar -czf cartae-config-$(date +%Y%m%d).tar.gz \
  infra/traefik/ \
  infra/docker/ \
  packages/database-api/.env
```

---

## Troubleshooting

### 1. Instances Not Healthy

**Symptom**: Health check returns HTTP 503.

**Diagnosis**:
```bash
# Check instance logs
docker logs cartae-api-1

# Check health endpoint directly
curl http://localhost:3001/health

# Check detailed health
curl http://localhost:3001/health/detailed
```

**Possible Causes**:
- Database connection failed → Check PostgreSQL logs
- Redis connection failed → Check Redis logs
- Memory exhausted → Check `docker stats`
- Port conflict → Check `docker ps` and `netstat -tulpn`

**Solutions**:
```bash
# Restart instance
docker restart cartae-api-1

# Check resource usage
docker stats cartae-api-1

# Check network connectivity
docker exec cartae-api-1 ping postgres
docker exec cartae-api-1 ping redis
```

### 2. Load Balancer Not Routing

**Symptom**: HTTP 503 from Traefik.

**Diagnosis**:
```bash
# Check Traefik logs
docker logs traefik-lb

# Check Traefik dashboard
open http://localhost:8080

# Check if services are registered
curl http://localhost:8080/api/http/services
```

**Possible Causes**:
- No healthy instances → Check instance health
- Docker labels missing → Check `docker inspect cartae-api-1`
- Network misconfiguration → Check `docker network inspect cartae-dmz-network`

**Solutions**:
```bash
# Restart Traefik (rediscovers services)
docker restart traefik-lb

# Verify Docker labels
docker inspect cartae-api-1 | grep traefik.enable
```

### 3. High Latency

**Symptom**: Requests take >1 second.

**Diagnosis**:
```bash
# Check Prometheus metrics
curl http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(request_duration_seconds_bucket[5m]))

# Check database latency
curl http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(database_latency_seconds_bucket[5m]))

# Check active connections
docker exec cartae-postgres psql -U cartae_user -c "SELECT count(*) FROM pg_stat_activity;"
```

**Possible Causes**:
- Database slow queries → Enable query logging, run EXPLAIN ANALYZE
- Connection pool exhausted → Increase pool size
- High CPU/memory → Check `docker stats`
- Network congestion → Check `ping`, `traceroute`

**Solutions**:
```bash
# Increase connection pool
# In .env:
POSTGRES_POOL_MAX=20

# Add database indexes
psql -U cartae_user -d cartae -c "CREATE INDEX idx_users_email ON users(email);"

# Scale up instances
docker-compose -f docker-compose.ha.yml up -d --scale database-api=5
```

### 4. Memory Leaks

**Symptom**: Memory usage increases over time, eventual OOM.

**Diagnosis**:
```bash
# Check memory usage
docker stats cartae-api-1

# Check Node.js heap
curl http://localhost:3001/health/detailed | jq '.system.freeMemoryGB'

# Enable heap snapshots
node --inspect=0.0.0.0:9229 dist/index.js
```

**Solutions**:
```bash
# Restart instances (temporary fix)
docker restart cartae-api-1

# Increase heap size
# In docker-compose.ha.yml:
environment:
  NODE_OPTIONS: "--max-old-space-size=1024"

# Fix leak in code (profile with Chrome DevTools)
```

### 5. Rolling Update Stuck

**Symptom**: Rolling update script hangs.

**Diagnosis**:
```bash
# Check if instance is starting
docker logs -f cartae-api-1

# Check if health endpoint responds
curl -v http://localhost:3001/health

# Check startup period
docker inspect cartae-api-1 | grep -A 5 Healthcheck
```

**Solutions**:
```bash
# Increase MAX_WAIT in rolling-update.sh
MAX_WAIT=120  # 2 minutes instead of 60s

# Increase health check start_period
# In docker-compose.ha.yml:
healthcheck:
  start_period: 60s  # Instead of 30s

# Manually stop and restart
docker stop cartae-api-1
docker rm cartae-api-1
docker-compose -f docker-compose.ha.yml up -d database-api-1
```

---

## Conclusion

Cette architecture HA fournit:
- ✅ **Zero downtime** deployments via rolling updates
- ✅ **Automatic failover** grâce aux health checks Traefik
- ✅ **Load distribution** entre 3 instances API
- ✅ **Auto-healing** via Docker restart policies
- ✅ **Monitoring complet** avec Prometheus + Grafana
- ✅ **Rollback facile** en cas de problème

**Next Steps**:
1. PostgreSQL replication (primary-standby) pour HA complète
2. Redis Sentinel/Cluster pour cache HA
3. Kubernetes migration pour auto-scaling avancé
4. Multi-region deployment pour disaster recovery
5. Chaos engineering (Chaos Monkey) pour tester la résilience
