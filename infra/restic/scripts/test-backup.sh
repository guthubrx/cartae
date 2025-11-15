#!/bin/sh
# Backup System Test Script
# Session 81e - Backup & Disaster Recovery
# Usage: ./test-backup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="/tmp/backup-test-$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Logging function
log() {
  echo "$*" | tee -a "${LOG_FILE}"
}

# Test function
test_case() {
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  TEST_NAME="$1"
  log ""
  log "========================================="
  log "TEST ${TESTS_TOTAL}: ${TEST_NAME}"
  log "========================================="
}

# Assert function
assert() {
  if eval "$1"; then
    log "${GREEN}✅ PASS${NC}: $2"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    log "${RED}❌ FAIL${NC}: $2"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

log "========================================="
log "Cartae Backup System - Test Suite"
log "========================================="
log "Started at: $(date)"
log ""

# TEST 1: Restic repository initialization
test_case "Restic Repository Initialization"
assert "restic snapshots > /dev/null 2>&1" "Restic repository is accessible"

# TEST 2: Scripts exist and are executable
test_case "Backup Scripts Existence"
assert "[ -f '${SCRIPT_DIR}/backup.sh' ]" "backup.sh exists"
assert "[ -x '${SCRIPT_DIR}/backup.sh' ]" "backup.sh is executable"
assert "[ -f '${SCRIPT_DIR}/backup-postgres.sh' ]" "backup-postgres.sh exists"
assert "[ -x '${SCRIPT_DIR}/backup-postgres.sh' ]" "backup-postgres.sh is executable"
assert "[ -f '${SCRIPT_DIR}/backup-redis.sh' ]" "backup-redis.sh exists"
assert "[ -x '${SCRIPT_DIR}/backup-redis.sh' ]" "backup-redis.sh is executable"

# TEST 3: Restore scripts exist and are executable
test_case "Restore Scripts Existence"
assert "[ -f '${SCRIPT_DIR}/restore.sh' ]" "restore.sh exists"
assert "[ -x '${SCRIPT_DIR}/restore.sh' ]" "restore.sh is executable"
assert "[ -f '${SCRIPT_DIR}/restore-postgres.sh' ]" "restore-postgres.sh exists"
assert "[ -x '${SCRIPT_DIR}/restore-postgres.sh' ]" "restore-postgres.sh is executable"
assert "[ -f '${SCRIPT_DIR}/restore-redis.sh' ]" "restore-redis.sh exists"
assert "[ -x '${SCRIPT_DIR}/restore-redis.sh' ]" "restore-redis.sh is executable"

# TEST 4: Environment variables
test_case "Environment Variables Configuration"
assert "[ -n '${RESTIC_REPOSITORY:-}' ]" "RESTIC_REPOSITORY is set"
assert "[ -n '${RESTIC_PASSWORD:-}' ]" "RESTIC_PASSWORD is set"
assert "[ -n '${POSTGRES_HOST:-}' ]" "POSTGRES_HOST is set"
assert "[ -n '${POSTGRES_DB:-}' ]" "POSTGRES_DB is set"
assert "[ -n '${REDIS_HOST:-}' ]" "REDIS_HOST is set"

# TEST 5: PostgreSQL connectivity
test_case "PostgreSQL Connectivity"
if command -v pg_isready > /dev/null 2>&1; then
  assert "pg_isready -h '${POSTGRES_HOST:-localhost}' -p '${POSTGRES_PORT:-5432}' -U '${POSTGRES_USER:-cartae}'" \
    "PostgreSQL is reachable"
else
  log "${YELLOW}⚠️  SKIP${NC}: pg_isready not available"
fi

# TEST 6: Redis connectivity
test_case "Redis Connectivity"
if command -v redis-cli > /dev/null 2>&1; then
  assert "redis-cli -h '${REDIS_HOST:-localhost}' -p '${REDIS_PORT:-6379}' PING > /dev/null 2>&1" \
    "Redis is reachable"
else
  log "${YELLOW}⚠️  SKIP${NC}: redis-cli not available"
fi

# TEST 7: Backup directory permissions
test_case "Backup Directory Permissions"
BACKUP_DIR="${RESTIC_REPOSITORY:-/backups/repo}"
if [ -d "${BACKUP_DIR}" ]; then
  assert "[ -w '${BACKUP_DIR}' ]" "Backup directory is writable"
else
  log "${YELLOW}⚠️  INFO${NC}: Backup directory doesn't exist yet (will be created on first backup)"
fi

# TEST 8: Crontab configuration
test_case "Crontab Configuration"
assert "[ -f '/etc/crontabs/root' ]" "Crontab file exists"

if [ -f "/etc/crontabs/root" ]; then
  assert "grep -q 'backup.sh' /etc/crontabs/root" "Crontab contains backup.sh schedule"
  assert "grep -q 'restic check' /etc/crontabs/root" "Crontab contains integrity check schedule"
fi

# TEST 9: Restic repository integrity
test_case "Restic Repository Integrity"

# Check if repository has snapshots
SNAPSHOT_COUNT=$(restic snapshots --json 2>/dev/null | grep -c '"id"' || echo "0")
log "Repository contains ${SNAPSHOT_COUNT} snapshot(s)"

if [ "${SNAPSHOT_COUNT}" -gt 0 ]; then
  # Run quick integrity check (5% sample)
  log "Running quick integrity check (5% sample)..."
  if restic check --read-data-subset=5% >> "${LOG_FILE}" 2>&1; then
    log "${GREEN}✅ PASS${NC}: Repository integrity check passed"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log "${RED}❌ FAIL${NC}: Repository integrity check failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
else
  log "${YELLOW}⚠️  INFO${NC}: No snapshots yet, integrity check skipped"
fi

# TEST 10: Retention policy verification
test_case "Retention Policy Configuration"
assert "[ -n '${BACKUP_RETENTION_DAILY:-}' ]" "Daily retention is configured"
assert "[ -n '${BACKUP_RETENTION_WEEKLY:-}' ]" "Weekly retention is configured"
assert "[ -n '${BACKUP_RETENTION_MONTHLY:-}' ]" "Monthly retention is configured"

# TEST 11: Monitoring integration
test_case "Monitoring Integration"
if [ -n "${PROMETHEUS_PUSHGATEWAY:-}" ]; then
  log "Prometheus Pushgateway: ${PROMETHEUS_PUSHGATEWAY}"
  # Try to ping Pushgateway
  if command -v curl > /dev/null 2>&1; then
    if curl -s -o /dev/null -w "%{http_code}" "${PROMETHEUS_PUSHGATEWAY}/-/ready" | grep -q "200"; then
      log "${GREEN}✅ PASS${NC}: Prometheus Pushgateway is reachable"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      log "${YELLOW}⚠️  WARN${NC}: Prometheus Pushgateway not reachable (may not be started yet)"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
  fi
else
  log "${YELLOW}⚠️  INFO${NC}: Prometheus Pushgateway not configured"
fi

# TEST 12: Disk space check
test_case "Disk Space Availability"
BACKUP_PATH="${RESTIC_BACKUP_PATH:-./backups}"
if [ -d "${BACKUP_PATH}" ]; then
  AVAILABLE_GB=$(df -BG "${BACKUP_PATH}" | tail -1 | awk '{print $4}' | sed 's/G//')
  log "Available disk space: ${AVAILABLE_GB}GB"

  if [ "${AVAILABLE_GB}" -ge 10 ]; then
    log "${GREEN}✅ PASS${NC}: Sufficient disk space (${AVAILABLE_GB}GB >= 10GB)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log "${YELLOW}⚠️  WARN${NC}: Low disk space (${AVAILABLE_GB}GB < 10GB recommended)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
fi

# Summary
log ""
log "========================================="
log "TEST SUMMARY"
log "========================================="
log "Total tests: ${TESTS_TOTAL}"
log "${GREEN}Passed: ${TESTS_PASSED}${NC}"
log "${RED}Failed: ${TESTS_FAILED}${NC}"
log ""

if [ ${TESTS_FAILED} -eq 0 ]; then
  log "${GREEN}✅ ALL TESTS PASSED!${NC}"
  log ""
  log "Backup system is ready to use."
  log "Run: /scripts/backup.sh all"
  EXIT_CODE=0
else
  log "${RED}❌ SOME TESTS FAILED!${NC}"
  log ""
  log "Please fix the issues before using the backup system."
  EXIT_CODE=1
fi

log ""
log "Full log: ${LOG_FILE}"
log "========================================="

exit ${EXIT_CODE}
