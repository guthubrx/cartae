#!/bin/sh
# Redis Restore Script - Disaster Recovery
# Session 81e - Backup & Disaster Recovery
# Usage: ./restore-redis.sh [snapshot-id|latest]

set -euo pipefail

# Configuration from environment
REDIS_HOST="${REDIS_HOST:-cartae-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_DATA_DIR="/redis-data"
RESTORE_DIR="/tmp/redis-restore"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_ID="${1:-latest}"

# Create restore directory
mkdir -p "${RESTORE_DIR}"

echo "[$(date)] Starting Redis restore..."
echo "  Host: ${REDIS_HOST}:${REDIS_PORT}"
echo "  Snapshot: ${SNAPSHOT_ID}"

# Find latest Redis backup snapshot if "latest" is specified
if [ "${SNAPSHOT_ID}" = "latest" ]; then
  SNAPSHOT_ID=$(restic snapshots --tag redis --last --json | grep -oP '"short_id":\s*"\K[^"]+' | head -1)
  echo "  Using latest snapshot: ${SNAPSHOT_ID}"
fi

# Restore backup file from Restic repository
echo "[$(date)] Restoring backup from Restic..."
restic restore "${SNAPSHOT_ID}" \
  --target "${RESTORE_DIR}" \
  --tag redis \
  --verify

# Find the restored tar.gz file
BACKUP_FILE=$(find "${RESTORE_DIR}" -name "redis_backup_*.tar.gz" | head -1)

if [ -z "${BACKUP_FILE}" ]; then
  echo "ERROR: No backup file found in restored snapshot!"
  exit 1
fi

echo "  Backup file: ${BACKUP_FILE}"

# Extract backup
cd "${RESTORE_DIR}"
tar xzf "${BACKUP_FILE}"

# Find RDB and AOF files
RDB_FILE=$(find "${RESTORE_DIR}" -name "redis_dump_*.rdb" | head -1)
AOF_FILE=$(find "${RESTORE_DIR}" -name "redis_aof_*.aof" | head -1)

if [ -z "${RDB_FILE}" ]; then
  echo "ERROR: No RDB file found in backup!"
  exit 1
fi

echo "  RDB file: ${RDB_FILE}"
if [ -n "${AOF_FILE}" ]; then
  echo "  AOF file: ${AOF_FILE}"
fi

# Stop Redis gracefully
echo "[$(date)] Stopping Redis..."
redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" SHUTDOWN SAVE || true
sleep 5

# Replace RDB file
echo "[$(date)] Replacing RDB file..."
cp "${RDB_FILE}" "${REDIS_DATA_DIR}/dump.rdb"
chown redis:redis "${REDIS_DATA_DIR}/dump.rdb" 2>/dev/null || true

# Replace AOF file if exists
if [ -n "${AOF_FILE}" ] && [ -f "${AOF_FILE}" ]; then
  echo "[$(date)] Replacing AOF file..."
  cp "${AOF_FILE}" "${REDIS_DATA_DIR}/appendonly.aof"
  chown redis:redis "${REDIS_DATA_DIR}/appendonly.aof" 2>/dev/null || true
fi

# Start Redis (assume it's managed by Docker/systemd)
echo "[$(date)] ⚠️  Please restart Redis container manually:"
echo "  docker restart cartae-redis"
echo ""
echo "  Or with Docker Compose:"
echo "  docker-compose restart redis"

# Wait for manual restart confirmation
echo ""
echo "Waiting for Redis to be available..."
TIMEOUT=60
ELAPSED=0

while [ ${ELAPSED} -lt ${TIMEOUT} ]; do
  if redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" PING > /dev/null 2>&1; then
    echo "[$(date)] ✅ Redis is UP!"
    break
  fi

  sleep 2
  ELAPSED=$((ELAPSED + 2))

  if [ ${ELAPSED} -ge ${TIMEOUT} ]; then
    echo "⚠️  Redis not responding after ${TIMEOUT}s"
    echo "Please check Redis container status manually"
    exit 1
  fi
done

# Verify restore
echo "[$(date)] Verifying restore..."
DBSIZE=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" DBSIZE)
echo "  Database size: ${DBSIZE} keys"

if [ "${DBSIZE}" -gt 0 ]; then
  echo "[$(date)] ✅ Redis restore successful!"
else
  echo "[$(date)] ⚠️  Redis restore completed but database is empty"
  echo "  This may be expected if backup was empty"
fi

# Cleanup
rm -rf "${RESTORE_DIR}"

echo "[$(date)] Redis restore completed."
exit 0
