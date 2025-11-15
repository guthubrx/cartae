#!/bin/sh
# PostgreSQL Restore Script - Disaster Recovery
# Session 81e - Backup & Disaster Recovery
# Usage: ./restore-postgres.sh [snapshot-id|latest]

set -euo pipefail

# Configuration from environment
POSTGRES_HOST="${POSTGRES_HOST:-cartae-database}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-cartae}"
POSTGRES_USER="${POSTGRES_USER:-cartae}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

RESTORE_DIR="/tmp/postgres-restore"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_ID="${1:-latest}"

# Create restore directory
mkdir -p "${RESTORE_DIR}"

echo "[$(date)] Starting PostgreSQL restore..."
echo "  Database: ${POSTGRES_DB}"
echo "  Snapshot: ${SNAPSHOT_ID}"

# Find latest PostgreSQL backup snapshot if "latest" is specified
if [ "${SNAPSHOT_ID}" = "latest" ]; then
  SNAPSHOT_ID=$(restic snapshots --tag postgres --last --json | grep -oP '"short_id":\s*"\K[^"]+' | head -1)
  echo "  Using latest snapshot: ${SNAPSHOT_ID}"
fi

# Restore backup file from Restic repository
echo "[$(date)] Restoring backup from Restic..."
restic restore "${SNAPSHOT_ID}" \
  --target "${RESTORE_DIR}" \
  --tag postgres \
  --verify

# Find the restored SQL file
BACKUP_FILE=$(find "${RESTORE_DIR}" -name "postgres_*.sql.gz" | head -1)

if [ -z "${BACKUP_FILE}" ]; then
  echo "ERROR: No backup file found in restored snapshot!"
  exit 1
fi

echo "  Backup file: ${BACKUP_FILE}"

# Decompress backup
gunzip "${BACKUP_FILE}"
SQL_FILE="${BACKUP_FILE%.gz}"

# Stop application connections (optional, safer)
echo "[$(date)] Terminating existing connections to database..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" || true

# Drop existing database (DANGEROUS!)
echo "[$(date)] ⚠️  Dropping existing database..."
PGPASSWORD="${POSTGRES_PASSWORD}" dropdb \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  --if-exists \
  "${POSTGRES_DB}"

# Recreate database
echo "[$(date)] Creating fresh database..."
PGPASSWORD="${POSTGRES_PASSWORD}" createdb \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  "${POSTGRES_DB}"

# Restore from pg_dump
echo "[$(date)] Restoring database from backup..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_restore \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --verbose \
  --no-owner \
  --no-acl \
  "${SQL_FILE}"

RESTORE_EXIT=$?

if [ ${RESTORE_EXIT} -eq 0 ]; then
  echo "[$(date)] ✅ PostgreSQL restore successful!"

  # Verify restore
  RECORD_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | xargs)

  echo "  Restored tables: ${RECORD_COUNT}"
else
  echo "[$(date)] ❌ PostgreSQL restore FAILED!"
  exit ${RESTORE_EXIT}
fi

# Cleanup
rm -rf "${RESTORE_DIR}"

echo "[$(date)] PostgreSQL restore completed successfully."
exit 0
