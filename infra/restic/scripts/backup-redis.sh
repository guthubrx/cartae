#!/bin/sh
# Redis Backup Script - Restic + RDB Snapshot
# Session 81e - Backup & Disaster Recovery
# Usage: ./backup-redis.sh

set -euo pipefail

# Configuration from environment
REDIS_HOST="${REDIS_HOST:-cartae-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_DATA_DIR="/redis-data"
BACKUP_DIR="/tmp/redis-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting Redis backup..."
echo "  Host: ${REDIS_HOST}:${REDIS_PORT}"

# Trigger Redis BGSAVE (background save, no blocking)
echo "[$(date)] Triggering Redis BGSAVE..."
redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" BGSAVE

# Wait for BGSAVE to complete (poll LASTSAVE timestamp)
INITIAL_LASTSAVE=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" LASTSAVE)
echo "  Initial LASTSAVE: ${INITIAL_LASTSAVE}"

# Poll until LASTSAVE changes (max 5 minutes)
TIMEOUT=300
ELAPSED=0
while [ ${ELAPSED} -lt ${TIMEOUT} ]; do
  sleep 2
  ELAPSED=$((ELAPSED + 2))

  CURRENT_LASTSAVE=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" LASTSAVE)

  if [ "${CURRENT_LASTSAVE}" != "${INITIAL_LASTSAVE}" ]; then
    echo "[$(date)] BGSAVE completed (new LASTSAVE: ${CURRENT_LASTSAVE})"
    break
  fi

  if [ ${ELAPSED} -ge ${TIMEOUT} ]; then
    echo "ERROR: BGSAVE timeout after ${TIMEOUT}s"
    exit 1
  fi
done

# Copy RDB snapshot to backup directory
if [ -f "${REDIS_DATA_DIR}/dump.rdb" ]; then
  cp "${REDIS_DATA_DIR}/dump.rdb" "${BACKUP_DIR}/redis_dump_${TIMESTAMP}.rdb"
  echo "[$(date)] RDB snapshot copied: redis_dump_${TIMESTAMP}.rdb"
else
  echo "ERROR: RDB snapshot not found at ${REDIS_DATA_DIR}/dump.rdb"
  exit 1
fi

# Also backup AOF if exists (append-only file)
if [ -f "${REDIS_DATA_DIR}/appendonly.aof" ]; then
  cp "${REDIS_DATA_DIR}/appendonly.aof" "${BACKUP_DIR}/redis_aof_${TIMESTAMP}.aof"
  echo "[$(date)] AOF file copied: redis_aof_${TIMESTAMP}.aof"
fi

# Compress backup files
cd "${BACKUP_DIR}"
tar czf "redis_backup_${TIMESTAMP}.tar.gz" redis_*_${TIMESTAMP}.*

BACKUP_FILE="${BACKUP_DIR}/redis_backup_${TIMESTAMP}.tar.gz"
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "  Backup size: ${BACKUP_SIZE}"

# Backup to Restic repository
echo "[$(date)] Uploading to Restic repository..."

restic backup "${BACKUP_FILE}" \
  --tag redis \
  --tag "backup-date-${TIMESTAMP}" \
  --verbose

# Verify Restic backup
RESTIC_EXIT=$?
if [ ${RESTIC_EXIT} -eq 0 ]; then
  echo "[$(date)] ✅ Redis backup successful!"

  # Send metrics to Prometheus Pushgateway (if configured)
  if [ -n "${PROMETHEUS_PUSHGATEWAY:-}" ]; then
    cat <<EOF | curl --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/restic-backup/instance/redis"
# TYPE backup_success gauge
backup_success{service="redis"} 1
# TYPE backup_size_bytes gauge
backup_size_bytes{service="redis"} $(stat -c%s "${BACKUP_FILE}")
# TYPE backup_timestamp gauge
backup_timestamp{service="redis"} $(date +%s)
EOF
  fi
else
  echo "[$(date)] ❌ Redis backup FAILED!"

  # Send failure metric
  if [ -n "${PROMETHEUS_PUSHGATEWAY:-}" ]; then
    cat <<EOF | curl --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/restic-backup/instance/redis"
# TYPE backup_success gauge
backup_success{service="redis"} 0
EOF
  fi

  exit ${RESTIC_EXIT}
fi

# Cleanup temporary files
rm -f "${BACKUP_DIR}"/redis_*_${TIMESTAMP}.*
rm -f "${BACKUP_FILE}"

echo "[$(date)] Redis backup completed successfully."
exit 0
