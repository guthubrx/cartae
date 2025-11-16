#!/bin/bash
# Cartae - Vault Initialization Script
# Session 84 - Security Hardening
#
# Usage: ./infra/scripts/vault-init.sh
# Description: Initialize Vault in production mode, unseal, and store secrets
#
# Pre-requisites:
# - Vault container running (cartae-vault)
# - .env file with generated secrets
#
# Output:
# - vault-keys.json (unseal keys + root token)
# - Secrets stored in Vault at secret/data/cartae/*

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Configuration
VAULT_CONTAINER="cartae-vault"
VAULT_ADDR="http://localhost:8200"
KEYS_FILE="./vault-keys.json"

log "Vault Initialization Script - Session 84"
echo ""

# Step 1: Wait for Vault to be ready
log "Waiting for Vault to be ready..."
TIMEOUT=60
ELAPSED=0

while ! docker exec "$VAULT_CONTAINER" vault status >/dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    error "Vault container not responding after ${TIMEOUT}s"
    exit 1
  fi

  printf "."
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

echo ""
success "Vault container is up"

# Step 2: Check if Vault is already initialized
log "Checking Vault initialization status..."

VAULT_INITIALIZED=$(docker exec "$VAULT_CONTAINER" vault status -format=json | jq -r '.initialized')

if [ "$VAULT_INITIALIZED" = "true" ]; then
  warning "Vault is already initialized"
  echo ""
  echo "To re-initialize Vault, you need to:"
  echo "  1. Stop containers: docker compose down"
  echo "  2. Remove Vault data volume: docker volume rm cartae_vault-data"
  echo "  3. Re-run deploy-standalone.sh"
  exit 0
fi

# Step 3: Initialize Vault
log "Initializing Vault (5 key shares, threshold 3)..."

INIT_OUTPUT=$(docker exec "$VAULT_CONTAINER" vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json)

# Save keys to file (IMPORTANT: Keep this file secure!)
echo "$INIT_OUTPUT" > "$KEYS_FILE"
chmod 600 "$KEYS_FILE"

success "Vault initialized successfully"
success "Unseal keys and root token saved to: $KEYS_FILE"
warning "⚠️  IMPORTANT: Backup $KEYS_FILE in a secure location (KeePass, 1Password, etc.)"

# Extract keys
UNSEAL_KEY_1=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[0]')
UNSEAL_KEY_2=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[1]')
UNSEAL_KEY_3=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[2]')
ROOT_TOKEN=$(echo "$INIT_OUTPUT" | jq -r '.root_token')

echo ""
log "Unsealing Vault (3 keys required)..."

# Unseal with 3 keys
docker exec "$VAULT_CONTAINER" vault operator unseal "$UNSEAL_KEY_1" >/dev/null
log "  Key 1/3 applied"

docker exec "$VAULT_CONTAINER" vault operator unseal "$UNSEAL_KEY_2" >/dev/null
log "  Key 2/3 applied"

docker exec "$VAULT_CONTAINER" vault operator unseal "$UNSEAL_KEY_3" >/dev/null
log "  Key 3/3 applied"

success "Vault unsealed successfully"

# Step 4: Login with root token
log "Authenticating with root token..."
docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault login "$ROOT_TOKEN" >/dev/null

success "Authenticated as root"

# Step 5: Enable KV v2 secrets engine (if not already enabled)
log "Enabling KV v2 secrets engine..."

docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault secrets enable -version=2 -path=secret kv 2>/dev/null || {
  warning "KV v2 engine already enabled at secret/"
}

success "Secrets engine ready"

# Step 6: Store secrets from .env into Vault
log "Storing secrets in Vault..."

if [ ! -f ".env" ]; then
  error ".env file not found - cannot store secrets"
  exit 1
fi

# Load .env variables
source .env

# Store PostgreSQL password
docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault kv put secret/cartae/postgres_password \
  value="$POSTGRES_PASSWORD" >/dev/null

success "  POSTGRES_PASSWORD stored at secret/cartae/postgres_password"

# Store JWT secret
docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault kv put secret/cartae/jwt_secret \
  value="$JWT_SECRET" >/dev/null

success "  JWT_SECRET stored at secret/cartae/jwt_secret"

# Store Redis password
if [ -n "$REDIS_PASSWORD" ]; then
  docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault kv put secret/cartae/redis_password \
    value="$REDIS_PASSWORD" >/dev/null

  success "  REDIS_PASSWORD stored at secret/cartae/redis_password"
fi

# Store Vault token (for API to authenticate)
docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault kv put secret/cartae/vault_token \
  value="$ROOT_TOKEN" >/dev/null

success "  VAULT_TOKEN stored at secret/cartae/vault_token"

echo ""
success "All secrets stored successfully in Vault"

# Step 7: Verify secrets
log "Verifying secrets..."

POSTGRES_PW=$(docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault kv get -field=value secret/cartae/postgres_password)

if [ "$POSTGRES_PW" = "$POSTGRES_PASSWORD" ]; then
  success "  Verification OK: POSTGRES_PASSWORD matches"
else
  error "  Verification FAILED: POSTGRES_PASSWORD mismatch"
  exit 1
fi

echo ""
success "✅ Vault initialization complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update .env: Set VAULT_TOKEN=$ROOT_TOKEN"
echo "   2. Update .env: Set VAULT_ENABLED=true"
echo "   3. Restart API: docker compose restart database-api"
echo ""
warning "⚠️  Keep $KEYS_FILE secure - you need these keys to unseal Vault after restart"
echo ""
