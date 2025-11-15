#!/bin/bash
# Rolling Update Script - Zero Downtime Deployment
# Session 81f - High Availability & Load Balancing
# Cartae Infrastructure

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

INSTANCES=("api-1" "api-2" "api-3")
IMAGE="${1:-cartae-database-api:latest}"
MAX_WAIT=60
HEALTH_ENDPOINT="/health"
HEALTH_PORT=3001
PAUSE_BETWEEN_INSTANCES=10

# ============================================================
# Colors
# ============================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# Logging Functions
# ============================================================

log() {
  echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"
}

warn() {
  echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} ⚠️  $*"
}

error() {
  echo -e "${RED}[$(date '+%H:%M:%S')]${NC} ❌ $*"
  exit 1
}

info() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} ℹ️  $*"
}

# ============================================================
# Health Check Functions
# ============================================================

check_health() {
  local instance=$1
  local url="http://${instance}:${HEALTH_PORT}${HEALTH_ENDPOINT}"

  if curl -sf "$url" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

wait_for_health() {
  local instance=$1
  local elapsed=0

  log "Waiting for ${instance} to be healthy..."

  while [ $elapsed -lt $MAX_WAIT ]; do
    if check_health "$instance"; then
      log "✅ ${instance} is healthy! (${elapsed}s)"
      return 0
    fi

    sleep 2
    elapsed=$((elapsed + 2))

    # Show progress
    if [ $((elapsed % 10)) -eq 0 ]; then
      info "Still waiting... (${elapsed}s / ${MAX_WAIT}s)"
    fi
  done

  error "${instance} failed to become healthy after ${MAX_WAIT}s"
}

check_all_instances() {
  log "Checking all instances..."

  local healthy=0
  local degraded=0
  local unhealthy=0

  for INSTANCE in "${INSTANCES[@]}"; do
    if check_health "$INSTANCE"; then
      log "✅ ${INSTANCE}: HEALTHY"
      healthy=$((healthy + 1))
    else
      warn "${INSTANCE}: UNHEALTHY"
      unhealthy=$((unhealthy + 1))
    fi
  done

  log ""
  log "Summary: ${healthy} healthy, ${unhealthy} unhealthy"

  if [ $unhealthy -gt 0 ]; then
    return 1
  else
    return 0
  fi
}

# ============================================================
# Docker Functions
# ============================================================

stop_instance() {
  local container=$1

  log "Stopping ${container}..."
  if docker stop "$container" 2>/dev/null; then
    log "✅ ${container} stopped"
  else
    warn "${container} was not running"
  fi
}

remove_instance() {
  local container=$1

  log "Removing ${container}..."
  if docker rm "$container" 2>/dev/null; then
    log "✅ ${container} removed"
  else
    warn "${container} did not exist"
  fi
}

start_instance() {
  local instance=$1
  local container="cartae-${instance}"

  log "Starting ${container} with image ${IMAGE}..."

  docker run -d \
    --name "$container" \
    --network cartae-app-network \
    --network cartae-data-network \
    --network cartae-monitoring-network \
    -e INSTANCE_ID="$instance" \
    -e NODE_ENV=production \
    -e PORT="${HEALTH_PORT}" \
    -e POSTGRES_HOST="${POSTGRES_HOST:-postgres}" \
    -e POSTGRES_PORT="${POSTGRES_PORT:-5432}" \
    -e POSTGRES_DB="${POSTGRES_DB:-cartae}" \
    -e POSTGRES_USER="${POSTGRES_USER:-cartae_user}" \
    -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
    -e REDIS_HOST="${REDIS_HOST:-redis}" \
    -e REDIS_PORT="${REDIS_PORT:-6379}" \
    -e REDIS_PASSWORD="${REDIS_PASSWORD}" \
    -e JWT_SECRET="${JWT_SECRET}" \
    -e PROMETHEUS_ENABLED="true" \
    -e LOG_LEVEL="${LOG_LEVEL:-info}" \
    "$IMAGE"

  log "✅ ${container} started"
}

# ============================================================
# Backup & Rollback Functions
# ============================================================

backup_current_state() {
  log "Creating backup of current state..."

  BACKUP_DIR="/tmp/cartae-rollback-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"

  for INSTANCE in "${INSTANCES[@]}"; do
    CONTAINER="cartae-${INSTANCE}"

    if docker inspect "$CONTAINER" > /dev/null 2>&1; then
      docker inspect "$CONTAINER" > "$BACKUP_DIR/${INSTANCE}.json"
      log "✅ Backed up ${INSTANCE} state to ${BACKUP_DIR}/${INSTANCE}.json"
    fi
  done

  log "Backup directory: ${BACKUP_DIR}"
}

rollback() {
  error "Rolling back changes..."

  # This is a placeholder for rollback logic
  # In production, you would restore from backup
  # or revert to previous Docker image

  warn "Rollback not implemented - manual intervention required"
  exit 1
}

# ============================================================
# Pre-flight Checks
# ============================================================

preflight_checks() {
  log "Running pre-flight checks..."

  # Check if Docker is running
  if ! docker info > /dev/null 2>&1; then
    error "Docker is not running"
  fi
  log "✅ Docker is running"

  # Check if image exists
  if ! docker image inspect "$IMAGE" > /dev/null 2>&1; then
    error "Image ${IMAGE} does not exist"
  fi
  log "✅ Image ${IMAGE} exists"

  # Check if networks exist
  for NETWORK in cartae-app-network cartae-data-network cartae-monitoring-network; do
    if ! docker network inspect "$NETWORK" > /dev/null 2>&1; then
      error "Network ${NETWORK} does not exist"
    fi
  done
  log "✅ All required networks exist"

  # Check environment variables
  if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    error "POSTGRES_PASSWORD is not set"
  fi
  if [ -z "${JWT_SECRET:-}" ]; then
    error "JWT_SECRET is not set"
  fi
  log "✅ Required environment variables are set"

  log "Pre-flight checks completed"
}

# ============================================================
# Main Update Logic
# ============================================================

main() {
  log "================================================="
  log "🚀 Starting Rolling Update"
  log "================================================="
  log "Image: ${IMAGE}"
  log "Instances: ${INSTANCES[*]}"
  log "Max wait: ${MAX_WAIT}s"
  log "Pause between instances: ${PAUSE_BETWEEN_INSTANCES}s"
  log ""

  # Pre-flight checks
  preflight_checks
  log ""

  # Backup current state
  backup_current_state
  log ""

  # Update each instance
  for INSTANCE in "${INSTANCES[@]}"; do
    CONTAINER="cartae-${INSTANCE}"

    log "================================================="
    log "📦 Updating ${INSTANCE}"
    log "================================================="

    # 1. Stop old container
    stop_instance "$CONTAINER"

    # 2. Remove old container
    remove_instance "$CONTAINER"

    # 3. Start new container
    start_instance "$INSTANCE"

    # 4. Wait for health check
    wait_for_health "$INSTANCE"

    # 5. Verify instance is accepting traffic
    log "Verifying ${INSTANCE} is accepting traffic..."
    sleep 2
    if ! check_health "$INSTANCE"; then
      error "${INSTANCE} is not healthy after startup"
    fi
    log "✅ ${INSTANCE} is accepting traffic"

    # 6. Pause between instances
    if [ "$INSTANCE" != "${INSTANCES[-1]}" ]; then
      log "Pausing ${PAUSE_BETWEEN_INSTANCES}s before next instance..."
      sleep "$PAUSE_BETWEEN_INSTANCES"
    fi

    log ""
  done

  log "================================================="
  log "🎉 Rolling Update Completed Successfully!"
  log "================================================="
  log ""

  # Final verification
  log "Running final verification..."
  if check_all_instances; then
    log ""
    log "✅ All instances are healthy"
    log "Deployment completed successfully!"
  else
    error "Some instances are unhealthy - rolling back"
    rollback
  fi
}

# ============================================================
# Help
# ============================================================

show_help() {
  cat << EOF
Rolling Update Script - Zero Downtime Deployment

Usage:
  $0 [IMAGE]

Arguments:
  IMAGE    Docker image to deploy (default: cartae-database-api:latest)

Environment Variables (required):
  POSTGRES_PASSWORD    PostgreSQL password
  JWT_SECRET           JWT secret key
  REDIS_PASSWORD       Redis password (optional)

Environment Variables (optional):
  POSTGRES_HOST        PostgreSQL host (default: postgres)
  POSTGRES_PORT        PostgreSQL port (default: 5432)
  POSTGRES_DB          PostgreSQL database (default: cartae)
  POSTGRES_USER        PostgreSQL user (default: cartae_user)
  REDIS_HOST           Redis host (default: redis)
  REDIS_PORT           Redis port (default: 6379)
  LOG_LEVEL            Log level (default: info)

Examples:
  # Update to latest image
  $0

  # Update to specific version
  $0 cartae-database-api:1.2.3

  # Update with environment variables
  POSTGRES_PASSWORD=secret JWT_SECRET=secret $0

EOF
}

# ============================================================
# Entry Point
# ============================================================

if [ "${1:-}" == "--help" ] || [ "${1:-}" == "-h" ]; then
  show_help
  exit 0
fi

# Run main function
main
