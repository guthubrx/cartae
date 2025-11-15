#!/bin/sh
# Main Backup Orchestration Script
# Session 81e - Backup & Disaster Recovery
# Usage: ./backup.sh [postgres|redis|volumes|all]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/var/log/restic"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/backup_${TIMESTAMP}.log"

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

# Backup mode (default: all)
BACKUP_MODE="${1:-all}"

log "========================================="
log "Cartae Backup System - Session 81e"
log "========================================="
log "Mode: ${BACKUP_MODE}"
log "Timestamp: ${TIMESTAMP}"
log ""

# Verify Restic repository is initialized
log "Verifying Restic repository..."
if ! restic snapshots > /dev/null 2>&1; then
  log "Initializing Restic repository..."
  restic init || error_exit "Failed to initialize Restic repository"
fi

# Backup PostgreSQL
if [ "${BACKUP_MODE}" = "postgres" ] || [ "${BACKUP_MODE}" = "all" ]; then
  log "Starting PostgreSQL backup..."
  if "${SCRIPT_DIR}/backup-postgres.sh" >> "${LOG_FILE}" 2>&1; then
    log "✅ PostgreSQL backup completed"
  else
    error_exit "PostgreSQL backup failed"
  fi
fi

# Backup Redis
if [ "${BACKUP_MODE}" = "redis" ] || [ "${BACKUP_MODE}" = "all" ]; then
  log "Starting Redis backup..."
  if "${SCRIPT_DIR}/backup-redis.sh" >> "${LOG_FILE}" 2>&1; then
    log "✅ Redis backup completed"
  else
    error_exit "Redis backup failed"
  fi
fi

# Backup application volumes
if [ "${BACKUP_MODE}" = "volumes" ] || [ "${BACKUP_MODE}" = "all" ]; then
  log "Starting application volumes backup..."

  # Backup uploads directory
  if [ -d "/app-data/uploads" ]; then
    log "  Backing up uploads directory..."
    restic backup /app-data/uploads \
      --tag volumes \
      --tag uploads \
      --tag "backup-date-${TIMESTAMP}" \
      --verbose >> "${LOG_FILE}" 2>&1
    log "  ✅ Uploads backed up"
  fi

  # Backup exports directory
  if [ -d "/app-data/exports" ]; then
    log "  Backing up exports directory..."
    restic backup /app-data/exports \
      --tag volumes \
      --tag exports \
      --tag "backup-date-${TIMESTAMP}" \
      --verbose >> "${LOG_FILE}" 2>&1
    log "  ✅ Exports backed up"
  fi

  # Backup Vault data (secrets)
  if [ -d "/vault-data" ]; then
    log "  Backing up Vault secrets..."
    restic backup /vault-data \
      --tag volumes \
      --tag vault \
      --tag "backup-date-${TIMESTAMP}" \
      --verbose >> "${LOG_FILE}" 2>&1
    log "  ✅ Vault data backed up"
  fi

  log "✅ Application volumes backup completed"
fi

# Apply retention policy
log ""
log "Applying retention policy..."
log "  Daily: ${BACKUP_RETENTION_DAILY:-7} snapshots"
log "  Weekly: ${BACKUP_RETENTION_WEEKLY:-4} snapshots"
log "  Monthly: ${BACKUP_RETENTION_MONTHLY:-12} snapshots"

restic forget \
  --keep-daily "${BACKUP_RETENTION_DAILY:-7}" \
  --keep-weekly "${BACKUP_RETENTION_WEEKLY:-4}" \
  --keep-monthly "${BACKUP_RETENTION_MONTHLY:-12}" \
  --prune \
  --verbose >> "${LOG_FILE}" 2>&1

log "✅ Retention policy applied"

# Check repository integrity (once a week)
DAY_OF_WEEK=$(date +%u)
if [ "${DAY_OF_WEEK}" = "7" ]; then  # Sunday
  log ""
  log "Running weekly integrity check..."
  if restic check --read-data-subset=5% >> "${LOG_FILE}" 2>&1; then
    log "✅ Repository integrity check passed"
  else
    log "⚠️  Repository integrity check failed!"
  fi
fi

# Backup statistics
log ""
log "Backup Statistics:"
restic stats --mode raw-data | tee -a "${LOG_FILE}"

# Send summary metrics to Prometheus
if [ -n "${PROMETHEUS_PUSHGATEWAY:-}" ]; then
  BACKUP_SUCCESS=1
  TOTAL_SIZE=$(restic stats --mode raw-data --json | grep -oP '"total_size":\s*\K\d+' || echo "0")

  cat <<EOF | curl --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/restic-backup/instance/all"
# TYPE backup_success gauge
backup_success{mode="${BACKUP_MODE}"} ${BACKUP_SUCCESS}
# TYPE backup_total_size_bytes gauge
backup_total_size_bytes ${TOTAL_SIZE}
# TYPE backup_timestamp gauge
backup_timestamp $(date +%s)
EOF
fi

log ""
log "========================================="
log "Backup completed successfully! 🎉"
log "Log file: ${LOG_FILE}"
log "========================================="

exit 0
