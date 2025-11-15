#!/bin/sh
# Main Restore Script - Disaster Recovery
# Session 81e - Backup & Disaster Recovery
# Usage: ./restore.sh [postgres|redis|volumes|all] [snapshot-id|latest]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/var/log/restic"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/restore_${TIMESTAMP}.log"

# Create log directory
mkdir -p "${LOG_DIR}"

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

# Error handler
error_exit() {
  log "ERROR: $1"
  exit 1
}

# Restore mode (default: all)
RESTORE_MODE="${1:-all}"
SNAPSHOT_ID="${2:-latest}"

log "========================================="
log "Cartae Restore System - Disaster Recovery"
log "========================================="
log "Mode: ${RESTORE_MODE}"
log "Snapshot: ${SNAPSHOT_ID}"
log "Timestamp: ${TIMESTAMP}"
log ""

# Verify Restic repository is accessible
log "Verifying Restic repository..."
if ! restic snapshots > /dev/null 2>&1; then
  error_exit "Restic repository not accessible or not initialized"
fi

# List available snapshots
log "Available snapshots:"
restic snapshots --compact | tail -10 | tee -a "${LOG_FILE}"
log ""

# Confirm restore (safety check)
log "⚠️  WARNING: This will OVERWRITE existing data!"
log "Press Ctrl+C within 10 seconds to cancel..."
sleep 10

# Restore PostgreSQL
if [ "${RESTORE_MODE}" = "postgres" ] || [ "${RESTORE_MODE}" = "all" ]; then
  log "Starting PostgreSQL restore..."
  if "${SCRIPT_DIR}/restore-postgres.sh" "${SNAPSHOT_ID}" >> "${LOG_FILE}" 2>&1; then
    log "✅ PostgreSQL restore completed"
  else
    error_exit "PostgreSQL restore failed"
  fi
fi

# Restore Redis
if [ "${RESTORE_MODE}" = "redis" ] || [ "${RESTORE_MODE}" = "all" ]; then
  log "Starting Redis restore..."
  if "${SCRIPT_DIR}/restore-redis.sh" "${SNAPSHOT_ID}" >> "${LOG_FILE}" 2>&1; then
    log "✅ Redis restore completed"
  else
    error_exit "Redis restore failed"
  fi
fi

# Restore application volumes
if [ "${RESTORE_MODE}" = "volumes" ] || [ "${RESTORE_MODE}" = "all" ]; then
  log "Starting application volumes restore..."

  RESTORE_DIR="/tmp/restore_${TIMESTAMP}"
  mkdir -p "${RESTORE_DIR}"

  # Find latest snapshot with volumes tag
  if [ "${SNAPSHOT_ID}" = "latest" ]; then
    SNAPSHOT_ID=$(restic snapshots --tag volumes --last --json | grep -oP '"short_id":\s*"\K[^"]+' | head -1)
    log "Using latest volumes snapshot: ${SNAPSHOT_ID}"
  fi

  # Restore uploads
  log "  Restoring uploads directory..."
  restic restore "${SNAPSHOT_ID}" \
    --target "${RESTORE_DIR}" \
    --path /app-data/uploads \
    --verify >> "${LOG_FILE}" 2>&1
  log "  ✅ Uploads restored to ${RESTORE_DIR}/app-data/uploads"

  # Restore exports
  log "  Restoring exports directory..."
  restic restore "${SNAPSHOT_ID}" \
    --target "${RESTORE_DIR}" \
    --path /app-data/exports \
    --verify >> "${LOG_FILE}" 2>&1
  log "  ✅ Exports restored to ${RESTORE_DIR}/app-data/exports"

  log "✅ Application volumes restore completed"
  log "   Restored files are in: ${RESTORE_DIR}"
  log "   Copy them manually to production volumes"
fi

log ""
log "========================================="
log "Restore completed successfully! 🎉"
log "Log file: ${LOG_FILE}"
log "========================================="

exit 0
