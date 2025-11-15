#!/bin/bash
# Cartae - Tests d'Isolation Réseau (Defense-in-Depth)
# Session 81a - Network Segmentation & Firewall
#
# Vérifie que les zones réseau sont correctement isolées:
# - DMZ ne peut PAS accéder DATA/SECRETS directement
# - DATA ne peut PAS accéder SECRETS
# - APP peut UNIQUEMENT accéder services autorisés
# - SECRETS est ultra-isolé (accès APP uniquement)
#
# Usage:
#   ./test-network-isolation.sh
#
# Retour:
#   0 = Tous tests passent (isolation correcte)
#   1 = Au moins un test échoue (faille de sécurité)

set -euo pipefail

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
  echo -e "${GREEN}✓ PASS${NC} $1"
  ((TESTS_PASSED++))
}

log_fail() {
  echo -e "${RED}✗ FAIL${NC} $1"
  ((TESTS_FAILED++))
}

log_warn() {
  echo -e "${YELLOW}⚠ WARN${NC} $1"
}

# Vérifier si Docker Compose est lancé
check_containers_running() {
  log_test "Vérification containers en cours..."

  if ! docker ps | grep -q "cartae-traefik"; then
    log_fail "Container cartae-traefik non démarré"
    echo "Lancez d'abord: docker-compose up -d"
    exit 1
  fi

  log_pass "Containers Cartae démarrés"
}

# Test 1: DMZ (Traefik) NE PEUT PAS accéder PostgreSQL (DATA zone)
test_dmz_cannot_access_postgres() {
  log_test "Test 1: DMZ → PostgreSQL (doit être bloqué)"

  # Tenter connexion depuis Traefik vers PostgreSQL
  if docker exec cartae-traefik sh -c "nc -zv -w2 postgres 5432" &>/dev/null; then
    log_fail "DMZ peut accéder PostgreSQL (FAILLE DE SÉCURITÉ)"
  else
    log_pass "DMZ ne peut pas accéder PostgreSQL (isolation OK)"
  fi
}

# Test 2: DMZ (Traefik) NE PEUT PAS accéder Redis (DATA zone)
test_dmz_cannot_access_redis() {
  log_test "Test 2: DMZ → Redis (doit être bloqué)"

  if docker exec cartae-traefik sh -c "nc -zv -w2 redis 6379" &>/dev/null; then
    log_fail "DMZ peut accéder Redis (FAILLE DE SÉCURITÉ)"
  else
    log_pass "DMZ ne peut pas accéder Redis (isolation OK)"
  fi
}

# Test 3: DMZ (Traefik) NE PEUT PAS accéder Vault (SECRETS zone)
test_dmz_cannot_access_vault() {
  log_test "Test 3: DMZ → Vault (doit être bloqué)"

  if docker exec cartae-traefik sh -c "nc -zv -w2 vault 8200" &>/dev/null; then
    log_fail "DMZ peut accéder Vault (FAILLE DE SÉCURITÉ CRITIQUE)"
  else
    log_pass "DMZ ne peut pas accéder Vault (isolation OK)"
  fi
}

# Test 4: APP (database-api) PEUT accéder PostgreSQL (autorisé)
test_app_can_access_postgres() {
  log_test "Test 4: APP → PostgreSQL (doit être autorisé)"

  if docker exec cartae-database-api sh -c "nc -zv -w2 postgres 5432" &>/dev/null; then
    log_pass "APP peut accéder PostgreSQL (règle firewall OK)"
  else
    log_fail "APP ne peut pas accéder PostgreSQL (règle firewall manquante)"
  fi
}

# Test 5: APP (database-api) PEUT accéder Redis (autorisé)
test_app_can_access_redis() {
  log_test "Test 5: APP → Redis (doit être autorisé)"

  if docker exec cartae-database-api sh -c "nc -zv -w2 redis 6379" &>/dev/null; then
    log_pass "APP peut accéder Redis (règle firewall OK)"
  else
    log_fail "APP ne peut pas accéder Redis (règle firewall manquante)"
  fi
}

# Test 6: APP (database-api) PEUT accéder Vault (autorisé)
test_app_can_access_vault() {
  log_test "Test 6: APP → Vault (doit être autorisé)"

  if docker exec cartae-database-api sh -c "nc -zv -w2 vault 8200" &>/dev/null; then
    log_pass "APP peut accéder Vault (règle firewall OK)"
  else
    log_fail "APP ne peut pas accéder Vault (règle firewall manquante)"
  fi
}

# Test 7: PostgreSQL NE PEUT PAS accéder Vault (isolation DATA/SECRETS)
test_postgres_cannot_access_vault() {
  log_test "Test 7: PostgreSQL → Vault (doit être bloqué)"

  # Installer netcat si absent dans postgres
  docker exec cartae-postgres sh -c "command -v nc || apk add --no-cache netcat-openbsd" &>/dev/null

  if docker exec cartae-postgres sh -c "nc -zv -w2 vault 8200" &>/dev/null; then
    log_fail "PostgreSQL peut accéder Vault (FAILLE DE SÉCURITÉ)"
  else
    log_pass "PostgreSQL ne peut pas accéder Vault (isolation OK)"
  fi
}

# Test 8: Redis NE PEUT PAS accéder Vault (isolation DATA/SECRETS)
test_redis_cannot_access_vault() {
  log_test "Test 8: Redis → Vault (doit être bloqué)"

  # Installer netcat si absent dans redis
  docker exec cartae-redis sh -c "command -v nc || apk add --no-cache netcat-openbsd" &>/dev/null

  if docker exec cartae-redis sh -c "nc -zv -w2 vault 8200" &>/dev/null; then
    log_fail "Redis peut accéder Vault (FAILLE DE SÉCURITÉ)"
  else
    log_pass "Redis ne peut pas accéder Vault (isolation OK)"
  fi
}

# Test 9: Vault NE PEUT PAS accéder Internet (ultra-isolation)
test_vault_cannot_access_internet() {
  log_test "Test 9: Vault → Internet (doit être bloqué)"

  # Tenter ping Google DNS
  if docker exec cartae-vault sh -c "ping -c 1 -W 2 8.8.8.8" &>/dev/null; then
    log_warn "Vault peut accéder Internet (peut être OK en dev, PAS en prod)"
  else
    log_pass "Vault ne peut pas accéder Internet (ultra-isolation OK)"
  fi
}

# Test 10: Vérifier IPs des containers dans bonnes zones
test_container_ips_in_correct_zones() {
  log_test "Test 10: Containers dans bonnes zones IP"

  # Traefik doit être dans DMZ (172.20.0.x)
  TRAEFIK_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cartae-traefik | grep "172.20" || true)
  if [[ -n "$TRAEFIK_IP" ]]; then
    log_pass "Traefik dans DMZ zone (172.20.0.x)"
  else
    log_fail "Traefik PAS dans DMZ zone"
  fi

  # Database-API doit être dans APP (172.21.0.x)
  API_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cartae-database-api | grep "172.21" || true)
  if [[ -n "$API_IP" ]]; then
    log_pass "Database-API dans APP zone (172.21.0.x)"
  else
    log_fail "Database-API PAS dans APP zone"
  fi

  # PostgreSQL doit être dans DATA (172.22.0.x)
  POSTGRES_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cartae-postgres | grep "172.22" || true)
  if [[ -n "$POSTGRES_IP" ]]; then
    log_pass "PostgreSQL dans DATA zone (172.22.0.x)"
  else
    log_fail "PostgreSQL PAS dans DATA zone"
  fi

  # Vault doit être dans SECRETS (172.23.0.x)
  VAULT_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cartae-vault | grep "172.23" || true)
  if [[ -n "$VAULT_IP" ]]; then
    log_pass "Vault dans SECRETS zone (172.23.0.x)"
  else
    log_fail "Vault PAS dans SECRETS zone"
  fi
}

# Test 11: Vérifier que réseaux Docker sont 'internal' (sauf DMZ)
test_networks_internal_flag() {
  log_test "Test 11: Réseaux marqués 'internal' (sauf DMZ)"

  # APP network doit être internal
  if docker network inspect app-network | grep -q '"Internal": true'; then
    log_pass "app-network est internal (pas d'accès Internet)"
  else
    log_fail "app-network N'EST PAS internal (faille potentielle)"
  fi

  # DATA network doit être internal
  if docker network inspect data-network | grep -q '"Internal": true'; then
    log_pass "data-network est internal"
  else
    log_fail "data-network N'EST PAS internal"
  fi

  # SECRETS network doit être internal
  if docker network inspect secrets-network | grep -q '"Internal": true'; then
    log_pass "secrets-network est internal"
  else
    log_fail "secrets-network N'EST PAS internal"
  fi

  # DMZ ne doit PAS être internal (exposition Internet)
  if docker network inspect dmz-network | grep -q '"Internal": false'; then
    log_pass "dmz-network N'EST PAS internal (exposition Internet OK)"
  else
    log_warn "dmz-network est internal (peut bloquer accès Internet)"
  fi
}

# ========================================
# MAIN
# ========================================

echo ""
echo "=========================================="
echo "  CARTAE - TESTS ISOLATION RÉSEAU"
echo "=========================================="
echo ""

check_containers_running
echo ""

# Tests de sécurité (isolation)
test_dmz_cannot_access_postgres
test_dmz_cannot_access_redis
test_dmz_cannot_access_vault
test_postgres_cannot_access_vault
test_redis_cannot_access_vault
test_vault_cannot_access_internet

echo ""

# Tests de connectivité (règles autorisées)
test_app_can_access_postgres
test_app_can_access_redis
test_app_can_access_vault

echo ""

# Tests de configuration
test_container_ips_in_correct_zones
test_networks_internal_flag

echo ""
echo "=========================================="
echo "  RÉSULTATS"
echo "=========================================="
echo -e "${GREEN}Tests passés:${NC} $TESTS_PASSED"
echo -e "${RED}Tests échoués:${NC} $TESTS_FAILED"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
  echo -e "${GREEN}✅ TOUS LES TESTS PASSENT - Isolation réseau correcte${NC}"
  exit 0
else
  echo -e "${RED}❌ ÉCHEC - Failles de sécurité détectées${NC}"
  echo "Vérifiez les règles firewall et la configuration réseau"
  exit 1
fi
