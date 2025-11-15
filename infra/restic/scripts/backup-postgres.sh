#!/bin/sh
# PostgreSQL Backup Script - Restic + pg_dump
# Session 81e - Backup & Disaster Recovery
# Usage: ./backup-postgres.sh

set -euo pipefail

# Configuration from environment
POSTGRES_HOST="${POSTGRES_HOST:-cartae-database}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-cartae}"
POSTGRES_USER="${POSTGRES_USER:-cartae}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

BACKUP_DIR="/tmp/postgres-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/postgres_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting PostgreSQL backup..."
echo "  Database: ${POSTGRES_DB}"
echo "  Host: ${POSTGRES_HOST}:${POSTGRES_PORT}"

# Perform pg_dump (compressed with gzip)
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_FILE%.gz}"

# Compress with gzip
gzip -9 "${BACKUP_FILE%.gz}"

echo "[$(date)] pg_dump completed: ${BACKUP_FILE}"

# Verify backup file
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not created!"
  exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "  Backup size: ${BACKUP_SIZE}"

# Backup to Restic repository
echo "[$(date)] Uploading to Restic repository..."

restic backup "${BACKUP_FILE}" \
  --tag postgres \
  --tag "${POSTGRES_DB}" \
  --tag "backup-date-${TIMESTAMP}" \
  --verbose

# Verify Restic backup
RESTIC_EXIT=$?
if [ ${RESTIC_EXIT} -eq 0 ]; then
  echo "[$(date)] ✅ PostgreSQL backup successful!"

  # Send metrics to Prometheus Pushgateway (if configured)
  if [ -n "${PROMETHEUS_PUSHGATEWAY:-}" ]; then
    cat <<EOF | curl --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/restic-backup/instance/postgres"
# TYPE backup_success gauge
backup_success{service="postgres",database="${POSTGRES_DB}"} 1
# TYPE backup_size_bytes gauge
backup_size_bytes{service="postgres",database="${POSTGRES_DB}"} $(stat -c%s "${BACKUP_FILE}")
# TYPE backup_timestamp gauge
backup_timestamp{service="postgres",database="${POSTGRES_DB}"} $(date +%s)
EOF
  fi
else
  echo "[$(date)] ❌ PostgreSQL backup FAILED!"

  # Send failure metric
  if [ -n "${PROMETHEUS_PUSHGATEWAY:-}" ]; then
    cat <<EOF | curl --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/restic-backup/instance/postgres"
# TYPE backup_success gauge
backup_success{service="postgres",database="${POSTGRES_DB}"} 0
EOF
  fi

  exit ${RESTIC_EXIT}
fi

# Cleanup temporary backup file
rm -f "${BACKUP_FILE}"

echo "[$(date)] PostgreSQL backup completed successfully."
exit 0
