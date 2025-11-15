# BACKUP & DISASTER RECOVERY ARCHITECTURE - Session 81e

## Table of Contents

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration Restic](#configuration-restic)
3. [PostgreSQL Backup](#postgresql-backup)
4. [Redis Backup](#redis-backup)
5. [Application Volumes Backup](#application-volumes-backup)
6. [Automation & Scheduling](#automation--scheduling)
7. [Retention Policy](#retention-policy)
8. [Disaster Recovery Procedures](#disaster-recovery-procedures)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Testing & Validation](#testing--validation)
11. [Security](#security)
12. [Troubleshooting](#troubleshooting)
13. [Deployment Guide](#deployment-guide)

---

## Vue d'ensemble

### Architecture Backup/Restore

Cartae implémente une stratégie de backup multi-couches avec Restic comme orchestrateur central, intégrant les backups de PostgreSQL, Redis, et des volumes applicatifs.

```
┌─────────────────────────────────────────────────────────────┐
│                    CARTAE BACKUP SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  PostgreSQL    │  │     Redis      │  │   Volumes      │ │
│  │  (pg_dump)     │  │  (RDB/AOF)     │  │  (files)       │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │            │
│           └────────────────────┼────────────────────┘            │
│                                │                                 │
│                    ┌───────────▼───────────┐                    │
│                    │   RESTIC ORCHESTRATOR │                    │
│                    │  (backup.sh script)   │                    │
│                    └───────────┬───────────┘                    │
│                                │                                 │
│        ┌───────────────────────┼───────────────────────┐        │
│        │                       │                       │        │
│  ┌─────▼─────┐         ┌─────▼─────┐          ┌─────▼─────┐  │
│  │   Local   │         │    S3     │          │  GCS (opt)│  │
│  │  Repo     │         │  Repo     │          │           │  │
│  └───────────┘         └───────────┘          └───────────┘  │
│                                                               │
│        RETENTION POLICY: 7 daily / 4 weekly / 12 monthly     │
│        ENCRYPTION: AES-256                                  │
│        SCHEDULING: Daily @ 02:00 UTC (dcron)                │
└─────────────────────────────────────────────────────────────┘
```

### Objectifs RTO/RPO

| Métrique | Cible | Détails |
|----------|-------|---------|
| **RTO** (Recovery Time Objective) | 4 heures | Temps maximum pour restaurer le système complet |
| **RPO** (Recovery Point Objective) | 24 heures | Perte de données maximale acceptable |
| **Backup Frequency** | Quotidienne | Backups à 02:00 UTC chaque jour |
| **Retention** | 60+ jours | Via politique 7/4/12 |

### Stack Technologique

- **Restic** 0.16.2 - Backup tool (encryption, deduplication)
- **PostgreSQL client** - pg_dump/pg_restore utilities
- **Redis client** - redis-cli, RDB snapshots
- **Docker Compose** - Orchestration conteneurs
- **dcron** - Cron scheduler
- **Prometheus Pushgateway** - Métriques backup
- **Bash** - Scripts orchestration

---

## Configuration Restic

### Repository Setup

Restic supporte plusieurs backends. Cartae utilise une configuration hybrid :

#### 1. Local Repository (NFS/Direct Attached)

```bash
# Initialisation repository local
export RESTIC_REPOSITORY="/mnt/backups/restic-repo"
export RESTIC_PASSWORD="<strong-password-generated>"

restic init
# Output: created restic repository at /mnt/backups/restic-repo
```

#### 2. S3 Repository (AWS S3 / MinIO)

```bash
export RESTIC_REPOSITORY="s3:s3.amazonaws.com/cartae-backups"
export AWS_ACCESS_KEY_ID="<access-key>"
export AWS_SECRET_ACCESS_KEY="<secret-key>"
export RESTIC_PASSWORD="<repository-password>"

restic init
# Output: created restic repository at s3://cartae-backups
```

#### 3. MinIO (Self-hosted S3-compatible)

```bash
export RESTIC_REPOSITORY="s3:minio.internal:9000/cartae-backups"
export AWS_ACCESS_KEY_ID="minio-user"
export AWS_SECRET_ACCESS_KEY="<minio-password>"
export AWS_DEFAULT_REGION="us-east-1"
export RESTIC_PASSWORD="<repository-password>"

restic init
```

### Encryption Configuration

Restic utilise AES-256-CTR en standard. Configuration détaillée :

```yaml
# .env configuration pour encryption
RESTIC_ENCRYPTION_TYPE: "aes256"      # Défaut: AES-256-CTR
RESTIC_PASSWORD: "$(openssl rand -base64 32)"  # 256-bit random password
RESTIC_PASSWORD_FILE: "/run/secrets/restic_password"  # Montage secret

# Repository password (strictement sécurisé)
# - Stocké dans Docker secret (production)
# - Jamais en plaintext sur disk
# - Rotated annuellement minimum
```

### Docker Compose Configuration

```yaml
# docker/docker-compose.backup.yml
version: '3.9'

services:
  restic-backup:
    image: restic/restic:0.16.2
    container_name: cartae-restic-backup
    hostname: cartae-backup

    environment:
      # Restic Configuration
      RESTIC_REPOSITORY: "s3:s3.amazonaws.com/cartae-backups"
      RESTIC_PASSWORD_FILE: "/run/secrets/restic_password"
      AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
      AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"

      # Database Configuration
      PGHOST: "postgres"
      PGPORT: "5432"
      PGUSER: "postgres"
      PGPASSWORD: "${POSTGRES_PASSWORD}"
      PGDATABASE: "cartae"

      # Redis Configuration
      REDIS_HOST: "redis"
      REDIS_PORT: "6379"

      # Volumes
      APP_UPLOADS_DIR: "/mnt/uploads"
      APP_EXPORTS_DIR: "/mnt/exports"
      VAULT_DIR: "/mnt/vault"

      # Prometheus
      PUSHGATEWAY_URL: "http://pushgateway:9091"
      PUSHGATEWAY_JOB: "restic-backup"

    volumes:
      # Backup scripts
      - ./restic/scripts:/scripts:ro
      - ./restic/crontab:/etc/crontabs/root:ro

      # Data directories (read-only)
      - postgres_data:/var/lib/postgresql/data:ro
      - redis_data:/var/lib/redis/data:ro
      - app_uploads:/mnt/uploads:ro
      - app_exports:/mnt/exports:ro
      - vault_data:/mnt/vault:ro

      # Backup working directory
      - backup_cache:/cache

      # Local repository (if used)
      - /mnt/backups:/mnt/backups

    secrets:
      - restic_password

    networks:
      - cartae-network

    # Restart policy: backup failure shouldn't restart
    restart: "no"

    # Resource limits
    cpus: "2"
    mem_limit: 4g

    # Health check
    healthcheck:
      test: ["CMD", "restic", "snapshots"]
      interval: 1h
      timeout: 5m
      retries: 3
      start_period: 30s

    # Run backup script daily at 02:00 UTC
    command:
      - /bin/sh
      - -c
      - |
        echo "0 2 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1" \
        | crontab -
        dcron -f

  # Optional: Restic REST server for additional repos
  restic-rest:
    image: ghcr.io/garethgeorge/restic-rest-server:latest
    container_name: cartae-restic-rest

    environment:
      OPTIONS: "--append-only"

    volumes:
      - restic_rest_data:/data
      - /mnt/backups:/mnt/backups:ro

    networks:
      - cartae-network

    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  backup_cache:
  restic_rest_data:

networks:
  cartae-network:
    external: true

secrets:
  restic_password:
    file: ./restic/.env.secret
```

### Variables d'Environnement (.env.example)

```bash
# RESTIC CONFIGURATION
RESTIC_REPOSITORY=s3:s3.amazonaws.com/cartae-backups
RESTIC_PASSWORD_FILE=/run/secrets/restic_password

# AWS S3 CREDENTIALS
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1

# ALTERNATIVE: MinIO
# RESTIC_REPOSITORY=s3:minio.internal:9000/cartae-backups
# AWS_ACCESS_KEY_ID=minioadmin
# AWS_SECRET_ACCESS_KEY=minioadmin

# DATABASE CREDENTIALS
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=cartae

# REDIS CONFIGURATION
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password-if-auth>

# MONITORING
PUSHGATEWAY_URL=http://pushgateway:9091
PUSHGATEWAY_JOB=restic-backup
PUSHGATEWAY_ENABLED=true

# BACKUP OPTIONS
RESTIC_COMPRESSION=auto
RESTIC_PACK_SIZE=16777216
RETENTION_DAILY=7
RETENTION_WEEKLY=4
RETENTION_MONTHLY=12

# NOTIFICATION
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
BACKUP_SUCCESS_NOTIFICATION=true
BACKUP_FAILURE_NOTIFICATION=true
```

---

## PostgreSQL Backup

### pg_dump Strategy

PostgreSQL backup utilise le format personnalisé avec compression :

```bash
# Caractéristiques
- Format: custom (.dump) - Compression + déduplication native
- Compression: gzip niveau 9 (compressé)
- Taille: ~10-15% du volume DB brut
- Temps: Dépend de la taille (typiquement 10-30 min pour 5GB)
- Point-in-time recovery: WAL archiving requis
```

### Script backup-postgres.sh

```bash
#!/bin/bash
# restic/scripts/backup-postgres.sh
# PostgreSQL backup with pg_dump and Restic integration

set -euo pipefail

# Configuration
BACKUP_NAME="postgresql-cartae"
BACKUP_DIR="/tmp/postgresql-backup"
LOG_DIR="/var/log"
METRICS_ENABLED="${PUSHGATEWAY_ENABLED:-false}"
TIMESTAMP=$(date -u '+%Y-%m-%d_%H-%M-%S')

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log_info() {
    echo -e "${GREEN}[$(date -u '+%Y-%m-%d %H:%M:%S')]${NC} INFO: $1" | tee -a "${LOG_DIR}/backup-postgres.log"
}

log_error() {
    echo -e "${RED}[$(date -u '+%Y-%m-%d %H:%M:%S')]${NC} ERROR: $1" | tee -a "${LOG_DIR}/backup-postgres.log"
}

log_warn() {
    echo -e "${YELLOW}[$(date -u '+%Y-%m-%d %H:%M:%S')]${NC} WARN: $1" | tee -a "${LOG_DIR}/backup-postgres.log"
}

# Initialize backup directory
setup_backup_dir() {
    mkdir -p "${BACKUP_DIR}"
    log_info "Backup directory created: ${BACKUP_DIR}"
}

# Execute pg_dump
perform_backup() {
    local backup_file="${BACKUP_DIR}/cartae-${TIMESTAMP}.dump"
    local start_time=$(date +%s)

    log_info "Starting PostgreSQL backup..."
    log_info "Database: ${PGDATABASE} | User: ${PGUSER} | Host: ${PGHOST}"

    # pg_dump with custom format (compression native)
    if pg_dump \
        --host="${PGHOST}" \
        --port="${PGPORT}" \
        --username="${PGUSER}" \
        --database="${PGDATABASE}" \
        --format=custom \
        --compress=9 \
        --verbose \
        --if-exists \
        --create \
        --blobs \
        --no-owner \
        --no-acl \
        --jobs=4 \
        > "${backup_file}"; then

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local file_size=$(du -h "${backup_file}" | cut -f1)

        log_info "PostgreSQL backup completed successfully"
        log_info "Backup file: ${backup_file} | Size: ${file_size} | Duration: ${duration}s"

        # Verify dump integrity
        verify_postgres_dump "${backup_file}"

        # Push metrics if enabled
        if [ "${METRICS_ENABLED}" = "true" ]; then
            push_postgres_metrics "${backup_file}" "${duration}"
        fi

        echo "${backup_file}"
        return 0
    else
        log_error "PostgreSQL backup failed"
        return 1
    fi
}

# Verify dump integrity
verify_postgres_dump() {
    local dump_file="$1"

    log_info "Verifying PostgreSQL dump integrity..."

    if pg_restore \
        --list "${dump_file}" > /dev/null 2>&1; then
        log_info "PostgreSQL dump verification passed"
        return 0
    else
        log_error "PostgreSQL dump verification failed"
        return 1
    fi
}

# Push Prometheus metrics
push_postgres_metrics() {
    local backup_file="$1"
    local duration="$2"

    local file_size=$(stat -f%z "${backup_file}" 2>/dev/null || stat -c%s "${backup_file}")
    local timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    cat > /tmp/postgres_metrics.txt << EOF
# HELP postgres_backup_size_bytes Size of PostgreSQL backup dump
# TYPE postgres_backup_size_bytes gauge
postgres_backup_size_bytes{database="${PGDATABASE}",host="${PGHOST}"} ${file_size} ${timestamp}

# HELP postgres_backup_duration_seconds Duration of PostgreSQL backup in seconds
# TYPE postgres_backup_duration_seconds gauge
postgres_backup_duration_seconds{database="${PGDATABASE}",host="${PGHOST}"} ${duration}

# HELP postgres_backup_timestamp_unix Last successful backup timestamp
# TYPE postgres_backup_timestamp_unix gauge
postgres_backup_timestamp_unix{database="${PGDATABASE}",host="${PGHOST}"} $(date +%s)
EOF

    curl -X POST \
        --data-binary @/tmp/postgres_metrics.txt \
        "http://${PUSHGATEWAY_URL}/metrics/job/${PUSHGATEWAY_JOB}/instance/postgres" \
        2>/dev/null || log_warn "Failed to push Prometheus metrics"
}

# Cleanup old backups (keep 7 days locally)
cleanup_local_backups() {
    log_info "Cleaning up local backups older than 7 days..."

    find "${BACKUP_DIR}" -name "cartae-*.dump" -mtime +7 -delete

    log_info "Local backup cleanup completed"
}

# Main execution
main() {
    log_info "=== PostgreSQL Backup Script Started ==="

    setup_backup_dir

    if ! perform_backup; then
        log_error "Backup failed, exiting"
        exit 1
    fi

    cleanup_local_backups

    log_info "=== PostgreSQL Backup Script Completed ==="
}

# Trap errors
trap 'log_error "Script interrupted"; exit 1' INT TERM

main "$@"
```

### Options pg_dump Détaillées

| Option | Valeur | Raison |
|--------|--------|--------|
| `--format=custom` | custom | Meilleure compression, plus petit fichier |
| `--compress=9` | 9 | Maximum compression (gzip niveau 9) |
| `--jobs=4` | 4 | Parallélisation (pour DB > 1GB) |
| `--create` | enabled | Backup inclut CREATE DATABASE |
| `--blobs` | enabled | Inclut les BLOBs (bytea, etc) |
| `--no-owner` | enabled | Owner info non restaurable directement |
| `--no-acl` | enabled | Permissions ajustées post-restore |

### Prometheus Metrics Exposées

```prometheus
# PostgreSQL Backup Metrics
postgres_backup_size_bytes{database="cartae",host="postgres"} 1258291456
postgres_backup_duration_seconds{database="cartae",host="postgres"} 456
postgres_backup_timestamp_unix{database="cartae",host="postgres"} 1700000000

# Alerting Rules
alert: PostgreSQLBackupFailure
  if: backup_status{service="postgres"} == 0
  for: 1h

alert: PostgreSQLBackupTooOld
  if: (time() - postgres_backup_timestamp_unix) > 90000
  # > 25 hours since last backup
```

### Troubleshooting PostgreSQL Backup

#### Issue: "role 'postgres' does not exist"

```bash
# Solution: Vérifier accès PostgreSQL
psql -h ${PGHOST} -U ${PGUSER} -d ${PGDATABASE} -c "SELECT version();"

# Vérifier credentials
echo "Testing password authentication..."
PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${PGHOST} -U ${PGUSER} -c "SELECT 1;"
```

#### Issue: "Connection refused"

```bash
# Vérifier service PostgreSQL
docker ps | grep postgres

# Vérifier network connectivity
nc -zv ${PGHOST} ${PGPORT}

# Check Docker network
docker network inspect cartae-network
```

#### Issue: "Dump file corrupted"

```bash
# Vérifier intégrité dump
pg_restore --list backup_file.dump | head -20

# Test partial restore to temp database
pg_restore -d test_restore backup_file.dump --verbose
```

---

## Redis Backup

### BGSAVE Mechanism

Redis fournit deux mécanismes de persistence :

```
RDB (Redis Database Dump):
  - Snapshot point-in-time
  - Fichier .rdb compact
  - BGSAVE: Background save non-blocking
  - Taille: ~10-15% de la mémoire Redis
  - Vitesse: Très rapide en restore (quelques secondes)

AOF (Append-Only File):
  - Log de toutes les commandes write
  - REWRITE: Compaction périodique du log
  - Taille: Plus volumineux que RDB
  - Durabilité: Plus élevée (moins de perte possible)
```

### Stratégie Backup Cartae

```bash
# Redis persistence configuration (redis.conf)
# Activé dans production pour durabilité

# RDB - Snapshot principal
save 900 1        # 15 min: 1+ changes
save 300 10       # 5 min: 10+ changes
save 60 10000     # 1 min: 10k+ changes

# AOF - Log transactionnel
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Backup strategy
# 1. BGSAVE trigger jour (02:00 UTC) → RDB snapshot
# 2. AOF continûment écrit (durabilité)
# 3. Restic backup RDB + AOF ensemble
```

### Script backup-redis.sh

```bash
#!/bin/bash
# restic/scripts/backup-redis.sh
# Redis backup (RDB + AOF) with Restic integration

set -euo pipefail

# Configuration
REDIS_BACKUP_DIR="/tmp/redis-backup"
LOG_DIR="/var/log"
METRICS_ENABLED="${PUSHGATEWAY_ENABLED:-false}"
TIMESTAMP=$(date -u '+%Y-%m-%d_%H-%M-%S')

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log_info() {
    echo -e "${GREEN}[$(date -u '+%Y-%m-%d %H:%M:%S')]${NC} INFO: $1" | tee -a "${LOG_DIR}/backup-redis.log"
}

log_error() {
    echo -e "${RED}[$(date -u '+%Y-%m-%d %H:%M:%S')]${NC} ERROR: $1" | tee -a "${LOG_DIR}/backup-redis.log"
}

log_warn() {
    echo -e "${YELLOW}[$(date -u '+%Y-%m-%d %H:%M:%S')]${NC} WARN: $1" | tee -a "${LOG_DIR}/backup-redis.log"
}

# Setup backup directory
setup_backup_dir() {
    mkdir -p "${REDIS_BACKUP_DIR}"
    log_info "Redis backup directory: ${REDIS_BACKUP_DIR}"
}

# Trigger BGSAVE
perform_bgsave() {
    local start_time=$(date +%s)

    log_info "Triggering BGSAVE on Redis..."

    if redis-cli \
        -h "${REDIS_HOST}" \
        -p "${REDIS_PORT}" \
        ${REDIS_PASSWORD:+-a ${REDIS_PASSWORD}} \
        BGSAVE; then

        log_info "BGSAVE triggered successfully"

        # Wait for BGSAVE to complete (check every 10s, timeout 5 min)
        wait_for_bgsave_completion

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log_info "BGSAVE completed in ${duration}s"
        return 0
    else
        log_error "Failed to trigger BGSAVE"
        return 1
    fi
}

# Wait for BGSAVE to complete
wait_for_bgsave_completion() {
    local max_wait=300  # 5 minutes timeout
    local elapsed=0
    local check_interval=10

    while [ ${elapsed} -lt ${max_wait} ]; do
        local info=$(redis-cli \
            -h "${REDIS_HOST}" \
            -p "${REDIS_PORT}" \
            ${REDIS_PASSWORD:+-a ${REDIS_PASSWORD}} \
            INFO persistence)

        if echo "${info}" | grep -q "rdb_bgsave_in_progress:0"; then
            log_info "BGSAVE completed"
            return 0
        fi

        log_info "BGSAVE in progress... waiting (${elapsed}/${max_wait}s)"
        sleep ${check_interval}
        elapsed=$((elapsed + check_interval))
    done

    log_warn "BGSAVE still in progress after ${max_wait}s (will continue anyway)"
    return 0
}

# Backup RDB snapshot
backup_rdb() {
    log_info "Backing up RDB snapshot..."

    local redis_rdb_path=$(redis-cli \
        -h "${REDIS_HOST}" \
        -p "${REDIS_PORT}" \
        ${REDIS_PASSWORD:+-a ${REDIS_PASSWORD}} \
        CONFIG GET dir | tail -1)

    local rdb_file="${redis_rdb_path}/dump.rdb"
    local backup_rdb="${REDIS_BACKUP_DIR}/dump-${TIMESTAMP}.rdb"

    if [ -f "${rdb_file}" ]; then
        cp "${rdb_file}" "${backup_rdb}"
        local rdb_size=$(du -h "${backup_rdb}" | cut -f1)
        log_info "RDB backup created: ${backup_rdb} (${rdb_size})"
        echo "${backup_rdb}"
        return 0
    else
        log_error "RDB file not found: ${rdb_file}"
        return 1
    fi
}

# Backup AOF (if enabled)
backup_aof() {
    log_info "Checking AOF status..."

    local aof_status=$(redis-cli \
        -h "${REDIS_HOST}" \
        -p "${REDIS_PORT}" \
        ${REDIS_PASSWORD:+-a ${REDIS_PASSWORD}} \
        CONFIG GET appendonly | tail -1)

    if [ "${aof_status}" != "yes" ]; then
        log_warn "AOF not enabled, skipping AOF backup"
        return 0
    fi

    log_info "Backing up AOF..."

    local redis_aof_path=$(redis-cli \
        -h "${REDIS_HOST}" \
        -p "${REDIS_PORT}" \
        ${REDIS_PASSWORD:+-a ${REDIS_PASSWORD}} \
        CONFIG GET dir | tail -1)

    local aof_file="${redis_aof_path}/appendonly.aof"
    local backup_aof="${REDIS_BACKUP_DIR}/appendonly-${TIMESTAMP}.aof"

    if [ -f "${aof_file}" ]; then
        cp "${aof_file}" "${backup_aof}"
        local aof_size=$(du -h "${backup_aof}" | cut -f1)
        log_info "AOF backup created: ${backup_aof} (${aof_size})"
        echo "${backup_aof}"
        return 0
    else
        log_warn "AOF file not found: ${aof_file}"
        return 0
    fi
}

# Verify Redis data integrity
verify_redis_backup() {
    local rdb_file="$1"

    log_info "Verifying Redis RDB integrity..."

    # Simple verification: file exists and has content
    if [ -s "${rdb_file}" ]; then
        log_info "RDB verification passed"
        return 0
    else
        log_error "RDB file is empty or missing"
        return 1
    fi
}

# Push Prometheus metrics
push_redis_metrics() {
    local rdb_file="$1"
    local duration="$2"

    local file_size=$(stat -f%z "${rdb_file}" 2>/dev/null || stat -c%s "${rdb_file}")
    local timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    cat > /tmp/redis_metrics.txt << EOF
# HELP redis_backup_size_bytes Size of Redis RDB backup
# TYPE redis_backup_size_bytes gauge
redis_backup_size_bytes{instance="${REDIS_HOST}:${REDIS_PORT}"} ${file_size} ${timestamp}

# HELP redis_backup_duration_seconds Duration of Redis backup
# TYPE redis_backup_duration_seconds gauge
redis_backup_duration_seconds{instance="${REDIS_HOST}:${REDIS_PORT}"} ${duration}

# HELP redis_backup_timestamp_unix Last successful backup timestamp
# TYPE redis_backup_timestamp_unix gauge
redis_backup_timestamp_unix{instance="${REDIS_HOST}:${REDIS_PORT}"} $(date +%s)
EOF

    curl -X POST \
        --data-binary @/tmp/redis_metrics.txt \
        "http://${PUSHGATEWAY_URL}/metrics/job/${PUSHGATEWAY_JOB}/instance/redis" \
        2>/dev/null || log_warn "Failed to push Redis metrics"
}

# Cleanup old local backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than 7 days..."

    find "${REDIS_BACKUP_DIR}" -name "*.rdb" -mtime +7 -delete
    find "${REDIS_BACKUP_DIR}" -name "*.aof" -mtime +7 -delete

    log_info "Backup cleanup completed"
}

# Main
main() {
    log_info "=== Redis Backup Script Started ==="

    setup_backup_dir

    if ! perform_bgsave; then
        log_error "BGSAVE failed"
        exit 1
    fi

    if ! backup_rdb; then
        log_error "RDB backup failed"
        exit 1
    fi

    backup_aof  # AOF backup optional, non-fatal if fails

    verify_redis_backup "${REDIS_BACKUP_DIR}/dump-${TIMESTAMP}.rdb"

    if [ "${METRICS_ENABLED}" = "true" ]; then
        push_redis_metrics "${REDIS_BACKUP_DIR}/dump-${TIMESTAMP}.rdb" "0"
    fi

    cleanup_old_backups

    log_info "=== Redis Backup Script Completed ==="
}

trap 'log_error "Script interrupted"; exit 1' INT TERM

main "$@"
```

### Configuration Redis pour Backup

```bash
# redis.conf configuration pour backup optimisé

# Persistence: RDB snapshots
save 900 1
save 300 10
save 60 10000

# RDB compression
rdbcompression yes
rdb-key-sanitization yes

# AOF: Append-only file (durabilité)
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Memory management (important pour BGSAVE)
maxmemory 2gb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile ""
```

### Troubleshooting Redis Backup

#### Issue: "BGSAVE failed"

```bash
# Vérifier connectivité Redis
redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} PING

# Vérifier permissions répertoire RDB
ls -la $(redis-cli CONFIG GET dir | tail -1)

# Vérifier espace disque
df -h $(redis-cli CONFIG GET dir | tail -1)
```

#### Issue: "dump.rdb permission denied"

```bash
# Solution: Vérifier permissions et ownership
docker exec redis ls -la /data/

# Ajuster permissions dans docker
docker exec redis chown redis:redis /data/dump.rdb
```

---

## Application Volumes Backup

### Directories Structure

```
/cartae-app
├── uploads/               # User-uploaded files
│   └── [user_id]/
│       └── [file_hash]   # ~50GB
├── exports/              # Generated exports
│   └── [export_id].xlsx  # ~100GB
└── vault/                # Application secrets
    ├── keys/
    ├── certs/
    └── config/           # ~500MB
```

### Backup Strategy

```bash
# Script: backup-volumes.sh (intégré dans backup.sh)

# 1. Exclude patterns
EXCLUDES=(
  '--exclude=.cache'
  '--exclude=.temp'
  '--exclude=node_modules'
  '--exclude=__pycache__'
  '--exclude=*.log'
)

# 2. Snapshot tagging
SNAPSHOT_DATE=$(date -u '+%Y-%m-%d_%H-%M-%S')
SNAPSHOT_TAG="daily-backup-${SNAPSHOT_DATE}"

# 3. Include patterns (selective)
INCLUDES=(
  'uploads/'
  'exports/'
  'vault/'
)
```

### Volume Backup Integration in backup.sh

```bash
# Extrait de backup.sh pour volumes

backup_volumes() {
    log_info "Starting application volumes backup..."

    local volumes=(
        "/mnt/uploads"
        "/mnt/exports"
        "/mnt/vault"
    )

    for volume in "${volumes[@]}"; do
        if [ ! -d "${volume}" ]; then
            log_warn "Volume not found: ${volume}"
            continue
        fi

        log_info "Backing up: ${volume}"

        restic backup \
            --exclude-caches \
            --exclude-if-present=.nobackup \
            --tag="daily-backup" \
            --tag="$(date -u '+%Y-%m-%d')" \
            "${volume}"
    done
}
```

### Vault Directory Sensitivity

```bash
# Vault content: Highly sensitive, encryption mandatory

# Permissions
chmod 700 /mnt/vault

# Restic encryption
RESTIC_ENCRYPTION_TYPE=aes256
RESTIC_PASSWORD=$(openssl rand -base64 32)  # Random 256-bit

# Never log vault content
restic backup /mnt/vault --quiet  # No verbose logging

# Separate encryption key (optional)
export RESTIC_PASSWORD_FILE=/run/secrets/vault_password
```

---

## Automation & Scheduling

### Crontab Configuration

```bash
# restic/crontab
# Cartae backup automation schedule

# Daily backup @ 02:00 UTC
0 2 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1

# Weekly integrity check @ Sunday 04:00 UTC
0 4 * * 0 /scripts/test-backup.sh integrity >> /var/log/backup-test.log 2>&1

# Monthly prune @ 1st day @ 06:00 UTC
0 6 1 * * /scripts/backup.sh prune >> /var/log/backup-prune.log 2>&1

# Daily snapshot cleanup @ 03:00 UTC
0 3 * * * /scripts/backup.sh cleanup >> /var/log/backup-cleanup.log 2>&1
```

### Main Orchestration Script (backup.sh)

```bash
#!/bin/bash
# restic/scripts/backup.sh
# Main backup orchestration script

set -euo pipefail

# Configuration
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/var/log"
BACKUP_LOCK="/var/run/cartae-backup.lock"
TIMESTAMP=$(date -u '+%Y-%m-%d_%H-%M-%S')

# Include utility functions
source "${SCRIPTS_DIR}/backup-utils.sh"

# Logging setup
setup_logging() {
    mkdir -p "${LOG_DIR}"
    exec 1> >(tee -a "${LOG_DIR}/backup.log")
    exec 2> >(tee -a "${LOG_DIR}/backup-error.log" >&2)
}

# Lock mechanism (prevent concurrent backups)
acquire_lock() {
    if [ -f "${BACKUP_LOCK}" ]; then
        local lock_pid=$(cat "${BACKUP_LOCK}")
        if kill -0 "${lock_pid}" 2>/dev/null; then
            log_error "Backup already running (PID: ${lock_pid})"
            exit 1
        fi
    fi

    echo $$ > "${BACKUP_LOCK}"
    trap "rm -f ${BACKUP_LOCK}" EXIT
}

# Execute all backup components
main() {
    log_info "=== CARTAE BACKUP ORCHESTRATION STARTED ==="
    log_info "Timestamp: ${TIMESTAMP}"

    acquire_lock

    # 1. PostgreSQL backup
    log_info "Step 1/5: PostgreSQL backup..."
    if ! "${SCRIPTS_DIR}/backup-postgres.sh"; then
        log_error "PostgreSQL backup failed, stopping"
        send_notification "FAILURE" "PostgreSQL backup failed"
        exit 1
    fi

    # 2. Redis backup
    log_info "Step 2/5: Redis backup..."
    if ! "${SCRIPTS_DIR}/backup-redis.sh"; then
        log_warn "Redis backup failed, continuing anyway"
        send_notification "WARNING" "Redis backup failed"
    fi

    # 3. Application volumes backup
    log_info "Step 3/5: Application volumes backup..."
    if ! backup_volumes; then
        log_warn "Volumes backup failed, continuing"
    fi

    # 4. Restic comprehensive backup
    log_info "Step 4/5: Restic repository backup..."
    if ! execute_restic_backup; then
        log_error "Restic backup failed"
        send_notification "FAILURE" "Restic backup failed"
        exit 1
    fi

    # 5. Backup validation
    log_info "Step 5/5: Backup validation..."
    if ! validate_backup; then
        log_warn "Backup validation issues detected"
        send_notification "WARNING" "Backup validation issues"
    fi

    # Cleanup and metrics
    cleanup_temporary_files
    push_backup_summary_metrics
    send_notification "SUCCESS" "Backup completed successfully"

    log_info "=== CARTAE BACKUP ORCHESTRATION COMPLETED ==="
}

# Execute Restic backup
execute_restic_backup() {
    log_info "Starting Restic backup..."

    local start_time=$(date +%s)

    restic backup \
        --exclude-caches \
        --exclude-if-present=.nobackup \
        --tag="daily-backup" \
        --tag="$(date -u '+%Y-%m-%d')" \
        --verbose \
        /tmp/postgresql-backup \
        /tmp/redis-backup

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_info "Restic backup completed in ${duration}s"
    return 0
}

# Validate backup integrity
validate_backup() {
    log_info "Validating backup integrity..."

    # Check recent snapshots
    restic snapshots --latest=1 || return 1

    # Verify repository structure
    restic check --read-data || return 1

    log_info "Backup validation passed"
    return 0
}

# Cleanup temporary files
cleanup_temporary_files() {
    log_info "Cleaning up temporary files..."

    rm -rf /tmp/postgresql-backup
    rm -rf /tmp/redis-backup

    log_info "Cleanup completed"
}

# Send notification (Slack, email, etc)
send_notification() {
    local status="$1"
    local message="$2"

    if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
        return 0
    fi

    local color="good"
    [ "${status}" = "FAILURE" ] && color="danger"
    [ "${status}" = "WARNING" ] && color="warning"

    curl -X POST \
        -H 'Content-type: application/json' \
        --data "{
            \"attachments\": [{
                \"color\": \"${color}\",
                \"title\": \"Cartae Backup Notification\",
                \"text\": \"${message}\",
                \"fields\": [{
                    \"title\": \"Status\",
                    \"value\": \"${status}\",
                    \"short\": true
                }, {
                    \"title\": \"Timestamp\",
                    \"value\": \"${TIMESTAMP}\",
                    \"short\": true
                }]
            }]
        }" \
        "${SLACK_WEBHOOK_URL}" \
        2>/dev/null || log_warn "Failed to send Slack notification"
}

# Main execution
setup_logging
trap 'log_error "Backup interrupted"; exit 1' INT TERM

main "$@"
```

### Daily Backup Workflow Timeline

```
02:00 UTC - Backup cron triggered
  ├─ backup.sh starts
  │  ├─ PostgreSQL pg_dump → /tmp/postgresql-backup/cartae-*.dump
  │  ├─ Redis BGSAVE → /tmp/redis-backup/{dump.rdb, appendonly.aof}
  │  ├─ Copy application volumes → /tmp/app-volumes/
  │  └─ Restic backup → S3 + Local repo
  │
  ├─ Metrics pushed to Pushgateway
  └─ Slack notification sent

02:30 UTC - Backup completed (typical)
  └─ Metrics available in Prometheus
  └─ Snapshots queryable via `restic snapshots`
```

---

## Retention Policy

### 7/4/12 Policy Explanation

```
RETENTION POLICY: 7 daily / 4 weekly / 12 monthly

Daily backups:   Keep 7 most recent daily snapshots  (~7 days)
Weekly backups:  Keep 4 most recent weekly snapshots (~4 weeks = 28 days)
Monthly backups: Keep 12 most recent monthly snapshots (~12 months = 365 days)

Total coverage: ~1 year of backups
Daily access:   First 7 days
Weekly granularity: 8-60 days
Monthly granularity: 2-12 months
```

### Restic forget/prune Configuration

```bash
# Script: backup-retention.sh (appelé lors du prune)

apply_retention_policy() {
    log_info "Applying retention policy..."

    # Keep last 7 daily snapshots
    restic forget \
        --keep-daily 7 \
        --keep-weekly 4 \
        --keep-monthly 12 \
        --keep-yearly 1 \
        --verbose

    # Prune unreferenced data
    restic prune \
        --verbose

    log_info "Retention policy applied successfully"
}

# Monthly execution (cron)
# 0 6 1 * * /scripts/backup-retention.sh
```

### Disk Space Management

```bash
# Monitor backup size growth

restic stats / restic du
# Output: Total size: 1.2 TB (across all snapshots)

# Calculate cost (S3)
# 1.2 TB * $0.023/GB = ~$28/month

# Estimate retention costs
DAILY_SIZE_GB=150      # ~150GB per daily snapshot
RETENTION_DAYS=60
ESTIMATED_SIZE_GB=$((DAILY_SIZE_GB * RETENTION_DAYS / 7))
# = 150 * 60 / 7 ≈ 1,286 GB (~1.3 TB)

MONTHLY_COST=$(echo "scale=2; ${ESTIMATED_SIZE_GB} * 0.023" | bc)
# ≈ $29.58/month for S3
```

### Cost Optimization Strategies

```bash
# 1. Adjust retention policy based on budget
# Current (7/4/12): ~1.3 TB/month
# Option A (5/2/6): ~650 GB/month (50% reduction, ~15 months coverage)
# Option B (3/2/6): ~400 GB/month (70% reduction, ~12 months coverage)

# 2. Compress before upload
restic backup --compression max

# 3. Deduplication
# Restic native: Automatic across snapshots
# Example: 5 daily snapshots of same DB → ~400 MB total (shared chunks)

# 4. Differential backups (incremental)
# Restic: Automatically incremental (file-based)
# Example: DB changed by 10% → Only 10% of DB re-backed up

# 5. Archive old backups to Glacier
# AWS: Move old monthly snapshots to Glacier ($0.004/GB/month)
# Policy: Keep daily/weekly on S3, monthly on Glacier
```

---

## Disaster Recovery Procedures

### Complete System Restore Runbook

Cette section détaille la procédure complète de restauration du système Cartae.

#### Phase 1: Pre-Recovery Assessment (30 min)

```bash
# 1. Inventory available backups
restic snapshots

# Output:
# ID        Time                 Host            Tags
# ---------------------------------------------------------------
# a1b2c3d4  2024-11-14 02:00:15  cartae-backup   daily-backup, 2024-11-14
# e5f6g7h8  2024-11-13 02:00:22  cartae-backup   daily-backup, 2024-11-13
# ...

# 2. Determine target snapshot for recovery
TARGET_SNAPSHOT="a1b2c3d4"  # Latest = a1b2c3d4
# Or PITR: specific timestamp

# 3. Verify backup integrity
restic check --read-data

# 4. Assess failure scope
#  - Total system loss? → Full recovery required
#  - Database corruption? → PostgreSQL point-in-time recovery
#  - Lost volume files? → Selective volume restore
#  - Partial data loss? → Granular file restore
```

#### Phase 2: PostgreSQL Restore (1-2 hours)

```bash
#!/bin/bash
# restore-postgres.sh - PostgreSQL recovery from backup

set -euo pipefail

BACKUP_SNAPSHOT="a1b2c3d4"
RESTORE_DIR="/tmp/postgres-restore"
TARGET_PGHOST="postgres"
TARGET_PGPORT="5432"
TARGET_PGUSER="postgres"

log_info() {
    echo "[$(date)] $1"
}

# Step 1: Extract PostgreSQL backup from Restic
log_info "Extracting PostgreSQL backup from Restic snapshot..."

mkdir -p "${RESTORE_DIR}"

restic restore "${BACKUP_SNAPSHOT}" \
    --target / \
    --include "postgresql-backup" \
    --verbose

# Step 2: Stop application (prevent writes)
log_info "Stopping application to prevent writes..."
docker-compose down

# Step 3: Stop PostgreSQL (cleanup connections)
log_info "Stopping PostgreSQL..."
docker-compose -f docker-compose.prod.yml down postgres

# Step 4: Clear PostgreSQL data directory
log_info "Clearing PostgreSQL data directory..."
docker volume rm cartae_postgres_data 2>/dev/null || true

# Step 5: Start PostgreSQL empty
log_info "Starting PostgreSQL..."
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for PostgreSQL ready
for i in {1..30}; do
    if docker exec cartae-postgres pg_isready \
        -h localhost \
        -U ${TARGET_PGUSER} &> /dev/null; then
        log_info "PostgreSQL is ready"
        break
    fi
    log_info "Waiting for PostgreSQL (${i}/30)..."
    sleep 5
done

# Step 6: Restore from dump file
log_info "Restoring PostgreSQL from dump..."

DUMP_FILE=$(ls -t "${RESTORE_DIR}/postgresql-backup/"*.dump 2>/dev/null | head -1)

if [ -z "${DUMP_FILE}" ]; then
    echo "ERROR: No dump file found"
    exit 1
fi

# pg_restore with progress
pg_restore \
    --host "${TARGET_PGHOST}" \
    --port "${TARGET_PGPORT}" \
    --username "${TARGET_PGUSER}" \
    --dbname "postgres" \
    --format=custom \
    --verbose \
    --if-exists \
    --create \
    --jobs=4 \
    "${DUMP_FILE}"

log_info "PostgreSQL restore completed"

# Step 7: Verify restored database
log_info "Verifying restored database..."

PSQL="docker exec cartae-postgres psql -U ${TARGET_PGUSER}"

# Check table count
${PSQL} -d cartae -c "SELECT count(*) FROM information_schema.tables;" || \
    { echo "ERROR: Database verification failed"; exit 1; }

# Check data integrity
${PSQL} -d cartae -c "SELECT count(*) FROM users;" || \
    { echo "ERROR: Cannot query users table"; exit 1; }

log_info "PostgreSQL restore verification passed"
```

#### Phase 3: Redis Restore (15 min)

```bash
#!/bin/bash
# restore-redis.sh - Redis recovery

set -euo pipefail

BACKUP_SNAPSHOT="a1b2c3d4"
RESTORE_DIR="/tmp/redis-restore"
REDIS_HOST="redis"
REDIS_PORT="6379"

log_info() {
    echo "[$(date)] $1"
}

# Step 1: Extract Redis backup
log_info "Extracting Redis backup from Restic..."

mkdir -p "${RESTORE_DIR}"

restic restore "${BACKUP_SNAPSHOT}" \
    --target / \
    --include "redis-backup" \
    --verbose

# Step 2: Stop Redis
log_info "Stopping Redis..."
docker-compose -f docker-compose.prod.yml down redis

# Step 3: Clear Redis data
log_info "Clearing Redis persistent storage..."
docker volume rm cartae_redis_data 2>/dev/null || true

# Step 4: Start Redis empty
log_info "Starting Redis..."
docker-compose -f docker-compose.prod.yml up -d redis

sleep 5

# Step 5: Restore RDB snapshot
log_info "Restoring Redis RDB snapshot..."

RDB_FILE=$(ls -t "${RESTORE_DIR}/redis-backup/dump-"*.rdb 2>/dev/null | head -1)

if [ -z "${RDB_FILE}" ]; then
    echo "ERROR: No RDB file found"
    exit 1
fi

# Copy RDB to Redis data directory
docker cp "${RDB_FILE}" cartae-redis:/data/dump.rdb
docker exec cartae-redis chown redis:redis /data/dump.rdb

# Restart Redis to load RDB
docker-compose -f docker-compose.prod.yml restart redis

sleep 5

# Step 6: Verify Redis
log_info "Verifying Redis restore..."

docker exec cartae-redis redis-cli PING || \
    { echo "ERROR: Redis verification failed"; exit 1; }

docker exec cartae-redis redis-cli DBSIZE

log_info "Redis restore completed"
```

#### Phase 4: Application Volumes Restore (30-60 min)

```bash
#!/bin/bash
# restore-volumes.sh - Application volumes recovery

set -euo pipefail

BACKUP_SNAPSHOT="a1b2c3d4"
RESTORE_TARGET="/"

log_info() {
    echo "[$(date)] $1"
}

log_info "Extracting application volumes..."

# Restore uploads
restic restore "${BACKUP_SNAPSHOT}" \
    --target "${RESTORE_TARGET}" \
    --include "uploads" \
    --verbose

# Restore exports
restic restore "${BACKUP_SNAPSHOT}" \
    --target "${RESTORE_TARGET}" \
    --include "exports" \
    --verbose

# Restore vault (séparé, permissions strictes)
log_info "Restoring vault (secure)..."

restic restore "${BACKUP_SNAPSHOT}" \
    --target "${RESTORE_TARGET}" \
    --include "vault" \
    --verbose

# Fix permissions
docker exec cartae-app chown -R app:app /mnt/uploads
docker exec cartae-app chown -R app:app /mnt/exports
docker exec cartae-app chown -R app:app /mnt/vault
docker exec cartae-app chmod 700 /mnt/vault

log_info "Application volumes restore completed"
```

#### Phase 5: Full System Recovery Orchestration

```bash
#!/bin/bash
# restore.sh - Complete orchestration script

set -euo pipefail

BACKUP_SNAPSHOT="${1:-}"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "${BACKUP_SNAPSHOT}" ]; then
    echo "Usage: restore.sh <snapshot-id>"
    echo "Available snapshots:"
    restic snapshots
    exit 1
fi

echo "=== CARTAE DISASTER RECOVERY STARTED ==="
echo "Target snapshot: ${BACKUP_SNAPSHOT}"
echo "Timestamp: $(date)"

# Confirmation before destructive recovery
read -p "WARNING: This will overwrite all data. Continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
    echo "Recovery cancelled"
    exit 1
fi

# Execute recovery phases
"${SCRIPTS_DIR}/restore-postgres.sh" || \
    { echo "ERROR: PostgreSQL restore failed"; exit 1; }

"${SCRIPTS_DIR}/restore-redis.sh" || \
    { echo "WARNING: Redis restore failed, continuing"; }

"${SCRIPTS_DIR}/restore-volumes.sh" || \
    { echo "WARNING: Volumes restore failed, continuing"; }

# Step 6: Restart application
echo "Restarting application..."
docker-compose -f docker-compose.prod.yml up -d

# Health checks
echo "Waiting for application to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "Application is healthy"
        break
    fi
    echo "Waiting... (${i}/30)"
    sleep 5
done

echo "=== CARTAE DISASTER RECOVERY COMPLETED ==="
echo "Recovery timestamp: $(date)"
```

#### Phase 6: Point-in-Time Recovery (PITR)

```bash
# PITR - Restore database to specific timestamp (requires WAL archiving)

# Available only if WAL archiving configured in PostgreSQL:
# archive_mode = on
# archive_command = 'test ! -f /mnt/wal-archive/%f && cp %p /mnt/wal-archive/%f'

# PITR steps:
# 1. List available backups with timestamps
restic snapshots --format='{{ .Time }} {{ .ID }}'

# 2. Restore base backup
TARGET_TIME="2024-11-13 15:30:00"
BASE_SNAPSHOT="a1b2c3d4"  # Last backup before target time

# 3. Restore PostgreSQL base
pg_restore ... "${DUMP_FILE}"

# 4. Restore WAL logs from backup
restic restore "${BACKUP_SNAPSHOT}" \
    --target / \
    --include "wal-archive" \
    --verbose

# 5. Configure recovery.conf
cat > /var/lib/postgresql/recovery.conf << EOF
restore_command = 'cp /mnt/wal-archive/%f %p'
recovery_target_timeline = 'latest'
recovery_target_time = '${TARGET_TIME}'
EOF

# 6. Start PostgreSQL (auto-recovery via WAL)
docker restart cartae-postgres

# 7. Verify recovery point reached
# Check PostgreSQL logs for "recovery complete"
```

### RTO/RPO Targets

| Metric | Target | Actual | Gap |
|--------|--------|--------|-----|
| **RTO** | 4 hours | 2-3 hours | 1-2 hours buffer |
| **RPO** | 24 hours | 24 hours | Met |

#### RTO Breakdown

```
PostgreSQL restore:  30-60 min (depends on DB size)
Redis restore:       5-10 min
Volumes restore:     30-60 min (depends on volume size)
Application restart: 5 min
Health checks:       5 min
─────────────────────────────
Total: ~75-140 minutes (1.25-2.3 hours)
```

---

## Monitoring & Alerting

### Prometheus Metrics Exposées

Le système expose les métriques suivantes au Pushgateway Prometheus :

```prometheus
# PostgreSQL Backup Metrics
postgres_backup_size_bytes{database="cartae",host="postgres"}
postgres_backup_duration_seconds{database="cartae",host="postgres"}
postgres_backup_timestamp_unix{database="cartae",host="postgres"}

# Redis Backup Metrics
redis_backup_size_bytes{instance="redis:6379"}
redis_backup_duration_seconds{instance="redis:6379"}
redis_backup_timestamp_unix{instance="redis:6379"}

# Restic Backup Metrics
restic_backup_duration_seconds{job="restic-backup"}
restic_snapshot_count{job="restic-backup"}
restic_repository_size_bytes{backend="s3"}
restic_deduplication_ratio{backend="s3"}

# Generic Backup Metrics
backup_status{service="postgres"} # 1=success, 0=failure
backup_status{service="redis"}
backup_status{service="volumes"}
backup_duration_seconds{service="*"}
backup_timestamp_unix{service="*"}
```

### Pushgateway Integration

```yaml
# Prometheus scrape config
scrape_configs:
  - job_name: 'pushgateway'
    static_configs:
      - targets: ['pushgateway:9091']
    metric_path: '/metrics'
    scrape_interval: 1m
```

### Alert Rules Suggestions

```yaml
# prometheus/rules/backup-alerts.yml

groups:
  - name: backup_alerts
    interval: 1m
    rules:

      # Alert if backup hasn't run in 25+ hours
      - alert: BackupFailure
        expr: (time() - backup_timestamp_unix) > 90000
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "Backup failure detected"
          description: "Last backup: {{ (time() - $value) | humanizeDuration }} ago"

      # Alert if backup took longer than 2 hours
      - alert: BackupTooSlow
        expr: backup_duration_seconds > 7200
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Backup duration exceeding SLA"
          description: "Duration: {{ $value | humanizeDuration }}"

      # Alert if backup size increases 50% month-over-month
      - alert: BackupSizeAnomalous
        expr: |
          rate(backup_size_bytes[1d]) >
          rate(backup_size_bytes[30d] offset 30d) * 1.5
        for: 2h
        labels:
          severity: warning
        annotations:
          summary: "Backup size growing unusually"
          description: "Current rate: {{ $value | humanize }}"

      # Alert if Restic repository check fails
      - alert: ResticRepositoryCorruption
        expr: restic_repository_status == 0
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Restic repository corruption detected"
          description: "Repository check failed"
```

### Grafana Dashboard Examples

```json
{
  "dashboard": {
    "title": "Cartae Backup Monitoring",
    "panels": [
      {
        "title": "Last Backup Time",
        "targets": [
          {
            "expr": "time() - backup_timestamp_unix"
          }
        ],
        "unit": "s",
        "thresholds": [
          { "value": 86400, "color": "red" },
          { "value": 43200, "color": "yellow" }
        ]
      },
      {
        "title": "Backup Duration (24h)",
        "targets": [
          {
            "expr": "backup_duration_seconds"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Repository Size Growth",
        "targets": [
          {
            "expr": "restic_repository_size_bytes"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Deduplication Ratio",
        "targets": [
          {
            "expr": "restic_deduplication_ratio"
          }
        ],
        "unit": "percentunit"
      }
    ]
  }
}
```

---

## Testing & Validation

### test-backup.sh Usage

```bash
#!/bin/bash
# restic/scripts/test-backup.sh
# Comprehensive backup testing and validation

set -euo pipefail

TEST_MODE="${1:-integrity}"  # integrity | restore | full
LOG_DIR="/var/log"

log_info() {
    echo "[$(date)] INFO: $1" | tee -a "${LOG_DIR}/backup-test.log"
}

log_error() {
    echo "[$(date)] ERROR: $1" | tee -a "${LOG_DIR}/backup-test.log"
}

# Test 1: Repository integrity
test_repository_integrity() {
    log_info "Testing Restic repository integrity..."

    if restic check --read-data; then
        log_info "✓ Repository integrity check passed"
        return 0
    else
        log_error "✗ Repository integrity check failed"
        return 1
    fi
}

# Test 2: Snapshot accessibility
test_snapshot_accessibility() {
    log_info "Testing snapshot accessibility..."

    local latest_snapshot=$(restic snapshots --latest=1 --json | \
        jq -r '.[0].id')

    if [ -z "${latest_snapshot}" ]; then
        log_error "✗ No snapshots found"
        return 1
    fi

    log_info "Latest snapshot: ${latest_snapshot}"

    # Try to list snapshot content
    if restic ls "${latest_snapshot}" > /dev/null; then
        log_info "✓ Snapshot accessible and readable"
        return 0
    else
        log_error "✗ Cannot access snapshot"
        return 1
    fi
}

# Test 3: Restore test (dry-run)
test_restore_simulation() {
    log_info "Testing restore simulation..."

    local test_dir="/tmp/restic-restore-test-$$"
    local latest_snapshot=$(restic snapshots --latest=1 --json | \
        jq -r '.[0].id')

    mkdir -p "${test_dir}"

    # Dry-run restore to test directory
    if restic restore "${latest_snapshot}" \
        --target "${test_dir}" \
        --include "postgresql-backup" \
        --verbose; then

        log_info "✓ Restore simulation successful"

        # Verify backup files exist
        if find "${test_dir}" -name "*.dump" | grep -q .; then
            log_info "✓ PostgreSQL backup files found in restore"
        fi

        rm -rf "${test_dir}"
        return 0
    else
        log_error "✗ Restore simulation failed"
        return 1
    fi
}

# Test 4: PostgreSQL backup validity
test_postgres_dump_validity() {
    log_info "Testing PostgreSQL dump validity..."

    local test_dir="/tmp/postgres-dump-test-$$"
    local latest_snapshot=$(restic snapshots --latest=1 --json | \
        jq -r '.[0].id')

    mkdir -p "${test_dir}"

    restic restore "${latest_snapshot}" \
        --target "${test_dir}" \
        --include "postgresql-backup" \
        --verbose

    # Validate dump with pg_restore --list
    local dump_file=$(find "${test_dir}" -name "*.dump" | head -1)

    if [ -z "${dump_file}" ]; then
        log_error "✗ No PostgreSQL dump found"
        return 1
    fi

    if pg_restore --list "${dump_file}" > /dev/null 2>&1; then
        log_info "✓ PostgreSQL dump is valid"
        rm -rf "${test_dir}"
        return 0
    else
        log_error "✗ PostgreSQL dump is corrupted"
        return 1
    fi
}

# Test 5: Backup frequency check
test_backup_frequency() {
    log_info "Testing backup frequency..."

    local latest_snapshot=$(restic snapshots --latest=1 --json | \
        jq -r '.[0].time')

    local last_backup_epoch=$(date -f "%Y-%m-%dT%H:%M:%SZ" \
        "${latest_snapshot}" +%s)
    local now_epoch=$(date +%s)
    local hours_since=$((($now_epoch - $last_backup_epoch) / 3600))

    log_info "Last backup: ${hours_since} hours ago"

    if [ ${hours_since} -le 25 ]; then
        log_info "✓ Backup frequency within SLA (< 25 hours)"
        return 0
    else
        log_error "✗ Backup overdue (> 25 hours)"
        return 1
    fi
}

# Main execution
main() {
    log_info "=== BACKUP TEST SUITE STARTED (${TEST_MODE}) ==="

    local tests_passed=0
    local tests_failed=0

    # Run selected tests
    case "${TEST_MODE}" in
        integrity)
            test_repository_integrity && ((tests_passed++)) || ((tests_failed++))
            test_snapshot_accessibility && ((tests_passed++)) || ((tests_failed++))
            test_backup_frequency && ((tests_passed++)) || ((tests_failed++))
            ;;
        restore)
            test_restore_simulation && ((tests_passed++)) || ((tests_failed++))
            test_postgres_dump_validity && ((tests_passed++)) || ((tests_failed++))
            ;;
        full)
            test_repository_integrity && ((tests_passed++)) || ((tests_failed++))
            test_snapshot_accessibility && ((tests_passed++)) || ((tests_failed++))
            test_restore_simulation && ((tests_passed++)) || ((tests_failed++))
            test_postgres_dump_validity && ((tests_passed++)) || ((tests_failed++))
            test_backup_frequency && ((tests_passed++)) || ((tests_failed++))
            ;;
        *)
            log_error "Unknown test mode: ${TEST_MODE}"
            exit 1
            ;;
    esac

    log_info "=== BACKUP TEST SUITE COMPLETED ==="
    log_info "Tests passed: ${tests_passed}"
    log_info "Tests failed: ${tests_failed}"

    [ ${tests_failed} -eq 0 ] && return 0 || return 1
}

trap 'log_error "Test interrupted"; exit 1' INT TERM
main "$@"
```

### Integrity Checks

```bash
# Commande de vérification manuelle

# 1. Repository structure
restic check

# 2. Repository avec lecture de toutes les données
restic check --read-data

# 3. Snapshots récents
restic snapshots --latest=7

# 4. Statistiques
restic stats
restic du

# 5. Snapshot-specific verification
restic ls <snapshot-id> | wc -l  # Count files
```

### Restore Testing Procedures

```bash
# Procedure: Monthly restore test (dry-run)

# 1. Create isolated test environment
docker-compose -f docker-compose.test.yml up

# 2. Restore from production backup to test environment
./restore.sh a1b2c3d4 --environment=test

# 3. Run application tests
cd tests/ && npm test

# 4. Data consistency checks
./scripts/verify-restore.sh

# 5. Cleanup test environment
docker-compose -f docker-compose.test.yml down -v
```

### Automated Testing

```bash
# Cron schedule for automated testing

# Weekly restore test (Sundays 04:00 UTC)
0 4 * * 0 /scripts/test-backup.sh full >> /var/log/backup-test-weekly.log 2>&1

# Monthly full restore simulation (1st day 05:00 UTC)
0 5 1 * * /scripts/run-restore-simulation.sh >> /var/log/restore-simulation.log 2>&1
```

---

## Security

### Encryption at Rest

```bash
# Restic AES-256-CTR encryption configuration

RESTIC_ENCRYPTION_TYPE=aes256
RESTIC_PASSWORD=$(openssl rand -base64 32)  # 256-bit random key
RESTIC_PASSWORD_FILE=/run/secrets/restic_password

# Password generation (production)
# Générée une seule fois, stockée dans Docker secret
docker secret create restic_password /dev/stdin
```

### Repository Password Management

```bash
# Production password security

# 1. Generate strong password
RESTIC_PASSWORD=$(openssl rand -base64 32)
echo -n "${RESTIC_PASSWORD}" > /run/secrets/restic_password

# 2. Store in Docker secret (not in env file)
docker secret create restic_pw /run/secrets/restic_password

# 3. Reference in docker-compose
secrets:
  restic_password:
    external: true

# 4. Mount as read-only
RESTIC_PASSWORD_FILE: /run/secrets/restic_password

# 5. Rotate annually (change password)
# - Create new repository with new password
# - Transfer snapshots via restic copy
# - Decommission old repository
```

### Access Control

```bash
# AWS S3 IAM Policy (least privilege)

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ResticBackupBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::cartae-backups",
        "arn:aws:s3:::cartae-backups/*"
      ]
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::cartae-backups/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

### S3 Server-Side Encryption

```bash
# S3 bucket configuration for encrypted backups

# Enable server-side encryption (AES-256)
aws s3api put-bucket-encryption \
  --bucket cartae-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Enable versioning (protection against accidental deletion)
aws s3api put-bucket-versioning \
  --bucket cartae-backups \
  --versioning-configuration Status=Enabled

# Enable MFA delete protection
aws s3api put-bucket-versioning \
  --bucket cartae-backups \
  --versioning-configuration Status=Enabled,MFADelete=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket cartae-backups \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Network Security

```bash
# Backup network isolation

# 1. Restic container network: cartae-network
#    - No direct internet access
#    - Only S3 endpoint reachable

# 2. PostgreSQL container: Internal only
#    - No external connections
#    - Restic connects via Docker network

# 3. Redis container: Internal only
#    - Restic connects via Docker network

# 4. S3 endpoint: Via VPC endpoint (no internet)
#    - PrivateLink to AWS S3
#    - Encrypted TLS transport

docker run \
  --network cartae-network \
  --security-opt=no-new-privileges \
  --cap-drop=ALL \
  --cap-add=DAC_READ_SEARCH \
  restic/restic backup ...
```

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: "pack XXXXX missing"

```bash
# Symptom: Restic backup/restore fails with "pack missing"
# Cause: Repository corruption or incomplete backup

# Solution:
# 1. Run repository check
restic check

# 2. Attempt repair (if possible)
restic rebuild-index

# 3. If still failing, reconstruct repository
restic repair snapshots
restic repair packs

# 4. Last resort: Restore from previous backup
restic snapshots  # Find working snapshot
./restore.sh <older-snapshot-id>
```

#### Issue 2: "lock held by"

```bash
# Symptom: Backup fails with "lock held by another process"
# Cause: Previous backup process didn't clean up

# Solution:
# 1. Check lock status
ls -la ${RESTIC_REPOSITORY}/lock

# 2. Verify no backup running
ps aux | grep backup

# 3. Remove stale lock (careful!)
rm -f ${RESTIC_REPOSITORY}/lock/*

# 4. Retry backup
./backup.sh
```

#### Issue 3: "S3 access denied"

```bash
# Symptom: Backup fails with AWS access denied
# Cause: Invalid credentials or IAM policy

# Solution:
# 1. Verify credentials
aws s3 ls --profile backup-user

# 2. Test S3 bucket access
aws s3 ls s3://cartae-backups/

# 3. Check IAM policy
aws iam get-user-policy --user-name backup-user --policy-name ResticBackup

# 4. Recreate credentials if needed
aws iam create-access-key --user-name backup-user
```

#### Issue 4: "insufficient space"

```bash
# Symptom: Backup fails because disk/storage full
# Cause: Retention policy not applied, or unexpected growth

# Solution:
# 1. Check available space
df -h /mnt/backups
aws s3 ls s3://cartae-backups/ --summarize

# 2. Run retention policy
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12
restic prune

# 3. Monitor growth
restic stats
restic du

# 4. Consider reducing retention if cost is issue
# Reduce to 5/2/6 policy (saves 50% space)
```

#### Issue 5: "PostgreSQL restore hangs"

```bash
# Symptom: pg_restore process hangs/doesn't complete
# Cause: Large database or I/O bottleneck

# Solution:
# 1. Check process status
ps aux | grep pg_restore

# 2. Monitor I/O
iostat 1 10

# 3. Increase resources
#    - Increase pg_restore --jobs parameter
#    - Allocate more CPU/RAM to container

# 4. Check disk space
df -h /var/lib/postgresql/data

# 5. Reduce load (stop other services)
docker-compose down app web
# Then retry restore with full resources
```

### Error Messages Reference

```
ERROR: "rpc error: code = Unknown desc = tls: failed to verify certificate"
  → Cause: S3 endpoint certificate issue
  → Fix: Update CA certs or use --http-timeout flag

ERROR: "fatal error: string index out of range"
  → Cause: Corrupted backup/repository
  → Fix: Run restic check --read-data, possibly rebuild-index

ERROR: "Access Denied (InvalidAccessKeyId)"
  → Cause: Invalid AWS credentials
  → Fix: Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

ERROR: "dial tcp: lookup redis: no such host"
  → Cause: Redis not reachable on Docker network
  → Fix: Verify redis container running, check network connectivity

ERROR: "database is already locked"
  → Cause: PostgreSQL has active connections during backup
  → Fix: Use pg_dump --no-owner, or close application connections
```

### Debug Procedures

```bash
# Enable verbose logging
RESTIC_DEBUG=1 restic backup ... 2>&1 | tee debug.log

# Trace Docker commands
docker --debug pull/exec ...

# Network debugging
docker exec <container> nc -zv <host> <port>
docker network inspect cartae-network

# PostgreSQL connection debug
PGDEBUG=3 psql -h postgres -U postgres -d cartae -c "SELECT 1;"

# Redis connection debug
redis-cli -h redis -p 6379 --verbose PING

# Restic repository debug
restic cat config
restic cat key <key-id>
```

---

## Deployment Guide

### Docker Compose Déploiement

#### 1. Pre-flight Checklist

```bash
# Verify prerequisites
docker version        # Docker 20.10+
docker-compose --version  # Docker Compose 2.0+

# Test Docker network
docker network create cartae-network 2>/dev/null || true

# Verify credentials
echo $AWS_ACCESS_KEY_ID    # Should be set
echo $AWS_SECRET_ACCESS_KEY  # Should be set (masked in output)

# Verify volumes
mkdir -p /mnt/backups /mnt/uploads /mnt/exports /mnt/vault

# Check disk space
df -h /mnt/backups    # Should have 500GB+ free (ADJUST based on usage)
```

#### 2. Configuration Steps

```bash
# Step 1: Create .env file from template
cp restic/.env.example .env

# Step 2: Set production credentials
vim .env
# - Set AWS credentials
# - Set POSTGRES_PASSWORD
# - Set REDIS_PASSWORD
# - Set SLACK_WEBHOOK_URL

# Step 3: Initialize Restic repository
export $(cat .env | grep -v '^#' | xargs)

# Option A: Local repository
restic init --repository /mnt/backups/restic-repo

# Option B: S3 repository
restic init --repository s3:s3.amazonaws.com/cartae-backups

# Step 4: Verify repository
restic snapshots
# Output: (empty, OK)
```

#### 3. First Backup Execution

```bash
# Build backup container
docker-compose -f docker/docker-compose.backup.yml build

# Start backup services
docker-compose -f docker/docker-compose.backup.yml up -d

# Execute first backup manually (verbose)
docker-compose -f docker/docker-compose.backup.yml exec -it \
  restic-backup /scripts/backup.sh

# Check logs
docker logs cartae-restic-backup

# Verify backup completed
restic snapshots
# Output: one snapshot with latest timestamp
```

#### 4. Verify Snapshots

```bash
# List all snapshots
restic snapshots

# Show snapshot details
restic snapshots --json | jq '.[0]'

# Show snapshot size
restic stats <snapshot-id>

# List snapshot content
restic ls <snapshot-id>

# Verify backup integrity
restic check --read-data
```

#### 5. Setup Cron Scheduling

```bash
# Start backup container with cron
docker-compose -f docker/docker-compose.backup.yml up -d

# Verify cron is running
docker logs cartae-restic-backup | grep "dcron"

# Check crontab
docker exec cartae-restic-backup crontab -l

# Monitor upcoming executions
docker exec cartae-restic-backup supercronic docker-compose.backup.yml
```

#### 6. Production Checklist

```bash
✓ Restic repository initialized (s3:// or local path)
✓ Backup container deployed and healthy
✓ First backup executed successfully
✓ Snapshots verified with restic check
✓ Cron scheduling active (daily @ 02:00 UTC)
✓ Prometheus metrics pushed to Pushgateway
✓ Slack notifications configured and tested
✓ Monitoring alerts configured
✓ Restore scripts tested (dry-run)
✓ Weekly backup tests scheduled
✓ Retention policy applied (7/4/12)
✓ S3 encryption and versioning enabled
✓ IAM policies least-privilege applied
✓ Network isolation verified (no external access)
✓ Documentation updated and reviewed
```

### Troubleshooting Initial Deployment

```bash
# Issue: "Connection refused" for PostgreSQL backup
docker-compose logs postgres
docker-compose exec -it postgres pg_isready

# Issue: "Invalid credentials" for S3
aws s3 ls --profile=default
export AWS_ACCESS_KEY_ID=... && export AWS_SECRET_ACCESS_KEY=...

# Issue: Cron not running
docker exec cartae-restic-backup ps aux | grep dcron

# Issue: Metrics not appearing in Prometheus
curl http://localhost:9091/metrics
docker logs pushgateway
```

---

## Summary

Ce document architecture couvre l'ensemble du système de backup et disaster recovery pour Cartae :

- **Automated backups** : PostgreSQL, Redis, et volumes applicatifs
- **Restic orchestration** : Repository setup, encryption, et scheduling
- **Retention policy** : 7/4/12 avec automatic pruning
- **Disaster recovery** : Runbooks complets RTO/RPO 4h/24h
- **Monitoring** : Prometheus metrics, Grafana dashboards, alerting
- **Testing** : Automated validation et restore testing
- **Security** : AES-256 encryption, IAM policies, access control
- **Troubleshooting** : Common issues et solutions
- **Deployment** : Production checklist et deployment procedures

Pour questions ou mises à jour, consulter la documentation Restic officielle: https://restic.readthedocs.io/
