# Guide de Monitoring - Cartae Enterprise

**Version:** 1.0
**Date:** 2025-11-17
**Public:** SRE, DevOps, Administrateurs système

---

## Introduction

Le monitoring Cartae Enterprise s'appuie sur une stack moderne et battle-tested :

- **Prometheus** : Collecte de métriques (time-series database)
- **Grafana** : Visualisation et dashboards
- **Loki** : Agrégation de logs (comme Prometheus mais pour logs)
- **Alertmanager** : Routing et notification d'alertes
- **Fail2ban** : Réponse automatique aux attaques (IP blocking)

**Objectifs :**

1. **Visibilité** : Voir en temps réel l'état de santé du système
2. **Proactivité** : Détecter les problèmes avant qu'ils impactent les utilisateurs
3. **Forensics** : Analyser les incidents passés pour éviter leur récurrence

---

## Installation

### Prérequis

```bash
# Docker + Docker Compose déjà installés (voir ENTERPRISE-QUICKSTART.md)

# Vérifier versions
docker --version   # >= 20.10
docker-compose --version  # >= 1.29
```

### Docker Compose (Prometheus + Grafana + Loki)

**Fichier `infra/docker/docker-compose.monitoring.yml` :**

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.47.0
    container_name: cartae-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus-data:/prometheus
    networks:
      - cartae-network

  grafana:
    image: grafana/grafana:10.2.0
    container_name: cartae-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=https://grafana.cartae.com
      - GF_INSTALL_PLUGINS=redis-datasource
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - grafana-data:/var/lib/grafana
    networks:
      - cartae-network

  loki:
    image: grafana/loki:2.9.0
    container_name: cartae-loki
    restart: unless-stopped
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/loki.yml
    volumes:
      - ./loki/loki.yml:/etc/loki/loki.yml
      - loki-data:/loki
    networks:
      - cartae-network

  promtail:
    image: grafana/promtail:2.9.0
    container_name: cartae-promtail
    restart: unless-stopped
    volumes:
      - ./promtail/promtail.yml:/etc/promtail/promtail.yml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/promtail.yml
    networks:
      - cartae-network

  alertmanager:
    image: prom/alertmanager:v0.26.0
    container_name: cartae-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - cartae-network

volumes:
  prometheus-data:
  grafana-data:
  loki-data:
  alertmanager-data:

networks:
  cartae-network:
    external: true
```

**Démarrer la stack :**

```bash
# Créer réseau Docker (si pas encore fait)
docker network create cartae-network

# Démarrer monitoring
docker-compose -f infra/docker/docker-compose.monitoring.yml up -d

# Vérifier statut
docker-compose -f infra/docker/docker-compose.monitoring.yml ps
```

**Sortie attendue :**

```
NAME                    STATUS              PORTS
cartae-prometheus       Up 5 seconds        0.0.0.0:9090->9090/tcp
cartae-grafana          Up 5 seconds        0.0.0.0:3000->3000/tcp
cartae-loki             Up 5 seconds        0.0.0.0:3100->3100/tcp
cartae-promtail         Up 5 seconds
cartae-alertmanager     Up 5 seconds        0.0.0.0:9093->9093/tcp
```

### Configuration Prometheus Scraping

**Fichier `infra/docker/prometheus/prometheus.yml` :**

```yaml
global:
  scrape_interval: 15s       # Scraper toutes les 15 secondes
  evaluation_interval: 15s   # Évaluer les alertes toutes les 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - /etc/prometheus/alerts.yml

scrape_configs:
  # Scraper Prometheus lui-même
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Scraper l'API Cartae
  - job_name: 'cartae-api'
    static_configs:
      - targets: ['cartae-api:8787']
    metrics_path: '/metrics'
    scrape_interval: 10s

  # Scraper Node Exporter (métriques serveur)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # Scraper PostgreSQL Exporter
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Scraper Redis Exporter
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
```

**Installer les exporters (optionnel mais recommandé) :**

```bash
# Node Exporter (métriques système : CPU, RAM, disk, network)
docker run -d \
  --name=node-exporter \
  --net=cartae-network \
  --restart=unless-stopped \
  -p 9100:9100 \
  prom/node-exporter:latest

# PostgreSQL Exporter
docker run -d \
  --name=postgres-exporter \
  --net=cartae-network \
  --restart=unless-stopped \
  -p 9187:9187 \
  -e DATA_SOURCE_NAME="postgresql://cartae:PASSWORD@cartae-postgres:5432/cartae_production?sslmode=disable" \
  quay.io/prometheuscommunity/postgres-exporter:latest

# Redis Exporter
docker run -d \
  --name=redis-exporter \
  --net=cartae-network \
  --restart=unless-stopped \
  -p 9121:9121 \
  oliver006/redis_exporter:latest \
  --redis.addr=redis://cartae-redis:6379
```

### Configuration Grafana Datasources

**Fichier `infra/docker/grafana/provisioning/datasources/datasources.yml` :**

```yaml
apiVersion: 1

datasources:
  # Prometheus
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  # Loki (logs)
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false

  # Redis (optionnel)
  - name: Redis
    type: redis-datasource
    access: proxy
    url: redis://cartae-redis:6379
    jsonData:
      client: standalone
    secureJsonData:
      password: ${REDIS_PASSWORD}
```

**Redémarrer Grafana pour appliquer :**

```bash
docker-compose -f infra/docker/docker-compose.monitoring.yml restart grafana
```

---

## Dashboards Grafana

### Dashboard 1 : Security Overview

**Visualise :**

- Rate limit violations (tentatives de dépassement)
- Failed login attempts (échecs de connexion)
- Admin operations (opérations critiques)
- Top 10 IPs bloquées
- Distribution des types d'attaques

**Fichier JSON : `infra/docker/grafana/dashboards/security-overview.json`**

**Panels principaux :**

**Panel 1 : Rate Limit Violations (Time Series)**

```json
{
  "title": "Rate Limit Violations",
  "targets": [
    {
      "expr": "rate(http_requests_rate_limited_total[5m])",
      "legendFormat": "{{ method }} {{ path }}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "color": { "mode": "palette-classic" },
      "unit": "reqps"
    }
  }
}
```

**Panel 2 : Failed Login Attempts (Time Series)**

```json
{
  "title": "Failed Login Attempts",
  "targets": [
    {
      "expr": "rate(http_auth_failed_total[1m])",
      "legendFormat": "{{ ip }}"
    }
  ],
  "thresholds": [
    { "value": 10, "color": "red" }
  ]
}
```

**Panel 3 : Admin Operations (Time Series)**

```json
{
  "title": "Admin Operations",
  "targets": [
    {
      "expr": "rate(http_admin_operations_total[1h])",
      "legendFormat": "{{ operation }}"
    }
  ]
}
```

**Panel 4 : Top 10 Blocked IPs (Table)**

```json
{
  "title": "Top 10 Blocked IPs",
  "targets": [
    {
      "expr": "topk(10, sum by (ip) (increase(http_requests_blocked_total[24h])))",
      "format": "table",
      "instant": true
    }
  ],
  "transformations": [
    { "id": "organize", "options": { "renameByName": { "Value": "Blocks" } } }
  ]
}
```

**Panel 5 : Attack Types Distribution (Pie Chart)**

```json
{
  "title": "Attack Types (Last 24h)",
  "targets": [
    {
      "expr": "sum by (attack_type) (increase(http_requests_suspicious_total[24h]))"
    }
  ],
  "type": "piechart"
}
```

**Panel 6 : OWASP Top 10 Coverage (Gauge)**

```json
{
  "title": "OWASP Top 10 Compliance",
  "targets": [
    {
      "expr": "owasp_top10_compliance_score"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "min": 0,
      "max": 10,
      "thresholds": {
        "steps": [
          { "value": 0, "color": "red" },
          { "value": 7, "color": "yellow" },
          { "value": 9, "color": "green" }
        ]
      }
    }
  }
}
```

**Import du dashboard :**

```bash
# Via Grafana UI
1. Accéder à https://grafana.votre-domaine.com
2. Login (admin / GRAFANA_ADMIN_PASSWORD)
3. Dashboards → Import
4. Upload security-overview.json

# Via provisioning (automatique au démarrage)
cp infra/docker/grafana/dashboards/security-overview.json \
   /var/lib/grafana/dashboards/
```

### Dashboard 2 : API Performance

**Visualise :**

- Requests per second (RPS)
- Latency P50/P95/P99
- Error rate (5xx errors)
- Status code distribution
- Endpoint performance heatmap
- Cache hit rate

**Panels principaux :**

**Panel 1 : Requests per Second**

```promql
# Query Prometheus
rate(http_requests_total[1m])
```

**Panel 2 : Latency Percentiles**

```promql
# P50
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))

# P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

**Panel 3 : Error Rate**

```promql
# Pourcentage d'erreurs 5xx
(
  rate(http_requests_total{status=~"5.."}[5m])
  /
  rate(http_requests_total[5m])
) * 100
```

**Panel 4 : Status Code Distribution**

```promql
sum by (status) (rate(http_requests_total[5m]))
```

**Panel 5 : Cache Hit Rate**

```promql
(
  rate(cache_hits_total[5m])
  /
  (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
) * 100
```

### Dashboard 3 : Infrastructure Health

**Visualise :**

- CPU usage per container
- Memory usage per container
- Disk I/O (read/write)
- Network traffic (in/out)
- Container status (up/down)
- Service uptime

**Panels principaux :**

**Panel 1 : CPU Usage**

```promql
# CPU par container (%)
rate(container_cpu_usage_seconds_total[5m]) * 100
```

**Panel 2 : Memory Usage**

```promql
# Memory par container (%)
(
  container_memory_usage_bytes
  /
  container_spec_memory_limit_bytes
) * 100
```

**Panel 3 : Disk I/O**

```promql
# Read bytes/sec
rate(node_disk_read_bytes_total[5m])

# Write bytes/sec
rate(node_disk_written_bytes_total[5m])
```

**Panel 4 : Network Traffic**

```promql
# In (received)
rate(node_network_receive_bytes_total[5m])

# Out (transmitted)
rate(node_network_transmit_bytes_total[5m])
```

**Panel 5 : Service Uptime**

```promql
# Uptime en jours
(time() - process_start_time_seconds) / 86400
```

---

## Alertes Prometheus

### Fichier de Règles d'Alerte

**Fichier `infra/docker/prometheus/alerts.yml` :**

```yaml
groups:
  - name: security_alerts
    interval: 30s
    rules:
      # Alerte : Brute Force Attack
      - alert: BruteForceAttack
        expr: rate(http_auth_failed_total[1m]) > 10
        for: 2m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "Brute force attack detected"
          description: "{{ $value }} failed login attempts per minute from IP {{ $labels.ip }}"
          action: "Automatic IP block via Fail2ban"
          runbook: "https://docs.cartae.com/security/brute-force"

      # Alerte : High Rate Limit Violations
      - alert: HighRateLimitViolations
        expr: rate(http_requests_rate_limited_total[5m]) > 50
        for: 10m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "High rate of rate limit violations"
          description: "{{ $value }} rate limit violations per minute"
          action: "Review logs, consider tightening limits"

      # Alerte : Unauthorized Admin Access
      - alert: UnauthorizedAdminAccess
        expr: increase(http_requests_total{path=~"/api/v1/admin/.*",status="401"}[5m]) > 5
        for: 2m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "Multiple unauthorized admin access attempts"
          description: "{{ $value }} failed admin access attempts"
          action: "Block IP, escalate to security"

  - name: performance_alerts
    interval: 30s
    rules:
      # Alerte : High Error Rate
      - alert: HighErrorRate
        expr: (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
          category: performance
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
          action: "Check logs, investigate root cause"

      # Alerte : Slow Response Time
      - alert: SlowResponseTime
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
          category: performance
        annotations:
          summary: "API response time degraded"
          description: "P99 latency is {{ $value }}s (threshold: 2s)"
          action: "Check database queries, Redis cache"

  - name: infrastructure_alerts
    interval: 30s
    rules:
      # Alerte : High CPU Usage
      - alert: HighCPUUsage
        expr: (rate(container_cpu_usage_seconds_total[5m]) * 100) > 80
        for: 10m
        labels:
          severity: warning
          category: infrastructure
        annotations:
          summary: "High CPU usage on {{ $labels.name }}"
          description: "CPU usage is {{ $value }}%"
          action: "Consider scaling horizontally"

      # Alerte : High Memory Usage
      - alert: HighMemoryUsage
        expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.9
        for: 10m
        labels:
          severity: critical
          category: infrastructure
        annotations:
          summary: "High memory usage on {{ $labels.name }}"
          description: "Memory usage is {{ $value | humanizePercentage }}"
          action: "Check for memory leaks, increase limits"

      # Alerte : Low Disk Space
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.1
        for: 5m
        labels:
          severity: critical
          category: infrastructure
        annotations:
          summary: "Low disk space on root filesystem"
          description: "Only {{ $value | humanizePercentage }} free space remaining"
          action: "Clean up logs, expand disk"

      # Alerte : Certificate Expiring Soon
      - alert: CertificateExpiringSoon
        expr: ssl_certificate_expiry_seconds < 604800  # 7 days
        for: 1h
        labels:
          severity: warning
          category: infrastructure
        annotations:
          summary: "TLS certificate expiring soon"
          description: "Certificate for {{ $labels.domain }} expires in {{ $value | humanizeDuration }}"
          action: "Renew certificate via Let's Encrypt"
```

**Recharger la configuration :**

```bash
# Recharger sans redémarrer Prometheus
curl -X POST http://localhost:9090/-/reload
```

### Configuration Alertmanager

**Fichier `infra/docker/alertmanager/alertmanager.yml` :**

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

  routes:
    # Alertes critiques → PagerDuty + Slack + Email
    - match:
        severity: critical
      receiver: 'critical-alerts'
      continue: true

    # Alertes warning → Slack uniquement
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  # Receiver par défaut (Slack)
  - name: 'default'
    slack_configs:
      - channel: '#cartae-monitoring'
        username: 'Cartae Monitoring'
        icon_emoji: ':chart_with_upwards_trend:'
        title: '{{ .GroupLabels.alertname }}'
        text: |-
          {{ range .Alerts }}
            *Alert:* {{ .Annotations.summary }}
            *Severity:* {{ .Labels.severity }}
            *Description:* {{ .Annotations.description }}
            *Action:* {{ .Annotations.action }}
            *Runbook:* {{ .Annotations.runbook }}
          {{ end }}

  # Receiver alertes critiques
  - name: 'critical-alerts'
    slack_configs:
      - channel: '#cartae-security-alerts'
        username: 'Cartae Security Bot'
        icon_emoji: ':rotating_light:'
        title: ':rotating_light: CRITICAL: {{ .GroupLabels.alertname }}'
        text: |-
          {{ range .Alerts }}
            *Severity:* {{ .Labels.severity }}
            *Description:* {{ .Annotations.description }}
            *Action:* {{ .Annotations.action }}
          {{ end }}

    email_configs:
      - to: 'security@cartae.com'
        from: 'alerts@cartae.com'
        smarthost: 'smtp.sendgrid.net:587'
        auth_username: '${SENDGRID_USERNAME}'
        auth_password: '${SENDGRID_API_KEY}'
        headers:
          Subject: '[CRITICAL] {{ .GroupLabels.alertname }}'

    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
        severity: 'critical'

  # Receiver alertes warning
  - name: 'warning-alerts'
    slack_configs:
      - channel: '#cartae-monitoring'
        username: 'Cartae Monitoring'
        icon_emoji: ':warning:'
        title: ':warning: WARNING: {{ .GroupLabels.alertname }}'
        text: |-
          {{ range .Alerts }}
            *Description:* {{ .Annotations.description }}
            *Action:* {{ .Annotations.action }}
          {{ end }}
```

**Variables d'environnement :**

```bash
# Slack Webhook (example format only, replace with your actual webhook)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_SECRET_TOKEN"

# SendGrid (Email)
SENDGRID_USERNAME="apikey"
SENDGRID_API_KEY="SG.XXXXXXXXXXXXXXXXXXXX"

# PagerDuty (Alertes critiques seulement)
PAGERDUTY_SERVICE_KEY="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

---

## Log Aggregation (Loki)

### Configuration Loki

**Fichier `infra/docker/loki/loki.yml` :**

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 15m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-01-01
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 168h

storage_config:
  boltdb:
    directory: /loki/index
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 jours
```

### Configuration Promtail (Log Shipper)

**Fichier `infra/docker/promtail/promtail.yml` :**

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Logs Docker containers
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'

  # Logs fichiers (audit logs)
  - job_name: audit
    static_configs:
      - targets:
          - localhost
        labels:
          job: audit
          __path__: /var/log/cartae/audit.log
```

### Query Examples (LogQL)

**Accéder à Grafana Explore :**

1. Ouvrir https://grafana.votre-domaine.com/explore
2. Sélectionner datasource "Loki"
3. Exécuter queries LogQL

**Query 1 : Tous les logs d'erreurs API (dernière heure)**

```logql
{job="cartae-api"} |= "ERROR" | json | __timestamp__ > ago(1h)
```

**Query 2 : Top 10 IPs par rate limit violations**

```logql
topk(10, sum by (ip) (rate({job="cartae-api"} |= "RATE_LIMIT_EXCEEDED" [1h])))
```

**Query 3 : Échecs de login par IP**

```logql
{job="cartae-api"} |= "auth.login.failed" | json | ip != ""
```

**Query 4 : Distribution géographique du traffic**

```logql
sum by (country) (count_over_time({job="cartae-api"} | json | __timestamp__ > ago(24h)))
```

**Query 5 : Opérations admin dans les 6 dernières heures**

```logql
{job="cartae-api"} |= "admin.operation" | json | status != "200" | __timestamp__ > ago(6h)
```

---

## Automated Response (Fail2ban)

### Installation

```bash
# Sur serveur hôte (pas Docker)
sudo apt-get install fail2ban

# Vérifier version
fail2ban-client --version
```

### Configuration

**Fichier `/etc/fail2ban/jail.local` :**

```ini
[DEFAULT]
# Bantime par défaut
bantime = 3600         # 1 heure
findtime = 600         # Fenêtre de 10 minutes
maxretry = 5           # 5 échecs → ban

# Action par défaut
banaction = iptables-multiport
action = %(action_mwl)s  # Ban + Email avec whois + logs

# Email notification
destemail = security@cartae.com
sender = fail2ban@cartae.com
mta = sendmail

[cartae-api-auth]
enabled = true
port = http,https
filter = cartae-api-auth
logpath = /var/log/cartae/audit.log
maxretry = 5
findtime = 300   # 5 minutes
bantime = 900    # 15 minutes ban
action = iptables-multiport[name=cartae-api-auth, port="http,https"]
         sendmail-whois[name=cartae-api-auth, dest=security@cartae.com]

[cartae-api-admin]
enabled = true
port = http,https
filter = cartae-api-admin
logpath = /var/log/cartae/audit.log
maxretry = 3
findtime = 300
bantime = 86400  # 24 heures ban (admin endpoints plus sensibles)
action = iptables-multiport[name=cartae-api-admin, port="http,https"]
         sendmail-whois[name=cartae-api-admin, dest=security@cartae.com]
```

**Fichier `/etc/fail2ban/filter.d/cartae-api-auth.conf` :**

```ini
[Definition]
# Détecter échecs de login dans audit logs JSON
failregex = ^.*"event":"auth\.login\.failed".*"ip":"<HOST>".*$
            ^.*"event":"admin\.operation\.unauthorized".*"ip":"<HOST>".*$

ignoreregex =
```

**Fichier `/etc/fail2ban/filter.d/cartae-api-admin.conf` :**

```ini
[Definition]
# Détecter tentatives d'accès admin non autorisées
failregex = ^.*"path":"\/api\/v1\/admin\/.*".*"status":401.*"ip":"<HOST>".*$

ignoreregex =
```

### Démarrer Fail2ban

```bash
# Démarrer service
sudo systemctl start fail2ban

# Activer au démarrage
sudo systemctl enable fail2ban

# Vérifier statut
sudo systemctl status fail2ban

# Vérifier jails actives
sudo fail2ban-client status
```

**Sortie attendue :**

```
Status
|- Number of jail:      2
`- Jail list:   cartae-api-auth, cartae-api-admin
```

### Commandes Utiles

```bash
# Voir IPs bannies (jail cartae-api-auth)
sudo fail2ban-client status cartae-api-auth

# Débannir une IP manuellement
sudo fail2ban-client set cartae-api-auth unbanip 203.0.113.42

# Bannir une IP manuellement
sudo fail2ban-client set cartae-api-auth banip 203.0.113.99

# Recharger configuration
sudo fail2ban-client reload

# Tester regex filter
fail2ban-regex /var/log/cartae/audit.log /etc/fail2ban/filter.d/cartae-api-auth.conf
```

---

## Checklist Monitoring Production

**Installation :**

- [ ] ✅ Prometheus + Grafana + Loki installés et démarrés
- [ ] ✅ Exporters configurés (node-exporter, postgres-exporter, redis-exporter)
- [ ] ✅ Datasources Grafana configurées (Prometheus, Loki)

**Dashboards :**

- [ ] ✅ Dashboard Security Overview importé et fonctionnel
- [ ] ✅ Dashboard API Performance importé et fonctionnel
- [ ] ✅ Dashboard Infrastructure Health importé et fonctionnel

**Alertes :**

- [ ] ✅ Règles d'alertes configurées (`alerts.yml`)
- [ ] ✅ Alertmanager configuré (Slack + Email + PagerDuty)
- [ ] ✅ Alertes testées (déclencher alerte manuellement et vérifier notification)

**Logs :**

- [ ] ✅ Loki + Promtail installés et collectent logs
- [ ] ✅ Audit logs formatés en JSON
- [ ] ✅ Queries LogQL testées (top IPs, échecs login, etc.)

**Automated Response :**

- [ ] ✅ Fail2ban installé et configuré
- [ ] ✅ Jails `cartae-api-auth` et `cartae-api-admin` activées
- [ ] ✅ Filters testés avec `fail2ban-regex`
- [ ] ✅ Email notifications configurées

---

**Références :**

- **Sécurité :** [SECURITY-CONFIGURATION.md](./SECURITY-CONFIGURATION.md)
- **OWASP Compliance :** [OWASP-TOP-10-CHECKLIST.md](./OWASP-TOP-10-CHECKLIST.md)
- **Alertes détaillées :** [SECURITY-MONITORING-ALERTS.md](./SECURITY-MONITORING-ALERTS.md)
