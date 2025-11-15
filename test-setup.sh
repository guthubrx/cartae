#!/bin/bash

# Cartae - Test Setup Script
# Valide que le setup complet fonctionne

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Compteurs
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Fonction test
run_test() {
    local test_name="$1"
    local test_command="$2"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -n "  Testing: $test_name... "

    if eval "$test_command" &>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║                                       ║"
echo "║   🧪 CARTAE SETUP TESTS 🧪           ║"
echo "║                                       ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Test 1: Structure projet
echo -e "${BLUE}📁 Testing Project Structure...${NC}"
run_test "pnpm-workspace.yaml exists" "[ -f pnpm-workspace.yaml ]"
run_test "turbo.json exists" "[ -f turbo.json ]"
run_test "infra/ directory exists" "[ -d infra ]"
run_test "infra/database/ exists" "[ -d infra/database ]"
run_test "infra/vault/ exists" "[ -d infra/vault ]"
echo ""

# Test 2: .env files
echo -e "${BLUE}📄 Testing .env Files...${NC}"
run_test "infra/database/.env exists" "[ -f infra/database/.env ]"
run_test "infra/vault/.env exists" "[ -f infra/vault/.env ]"
run_test "packages/database-api/.env exists" "[ -f packages/database-api/.env ]"
run_test "apps/web/.env exists" "[ -f apps/web/.env ]"
echo ""

# Test 3: Node.js dependencies
echo -e "${BLUE}📦 Testing Node.js Dependencies...${NC}"
run_test "node_modules exists" "[ -d node_modules ]"
run_test "pnpm installed" "command -v pnpm"
run_test "turbo installed" "command -v turbo || [ -f node_modules/.bin/turbo ]"
echo ""

# Test 4: PostgreSQL (si running)
echo -e "${BLUE}🐘 Testing PostgreSQL...${NC}"
run_test "PostgreSQL container running" "docker ps | grep -q cartae-db"
run_test "PostgreSQL port 5432 accessible" "nc -z localhost 5432"
if run_test "PostgreSQL accepts connections" "psql postgresql://cartae:cartae_dev_password@localhost:5432/cartae -c 'SELECT 1' 2>/dev/null"; then
    echo -e "  ${GREEN}PostgreSQL is fully operational${NC}"
fi
echo ""

# Test 5: Vault (si running)
echo -e "${BLUE}🔐 Testing HashiCorp Vault...${NC}"
run_test "Vault container running" "docker ps | grep -q cartae-vault"
run_test "Vault port 8200 accessible" "nc -z localhost 8200"
run_test "Vault health check" "curl -sf http://localhost:8200/v1/sys/health"
run_test "Vault unsealed" "curl -sf http://localhost:8200/v1/sys/health | grep -q '\"sealed\":false'"
echo ""

# Test 6: Database API (si running)
echo -e "${BLUE}🔌 Testing Database API...${NC}"
if run_test "Database API port 3001 accessible" "nc -z localhost 3001"; then
    run_test "Database API health endpoint" "curl -sf http://localhost:3001/health"
    run_test "Database API responds with JSON" "curl -sf http://localhost:3001/health | jq '.status' | grep -q 'ok'"
fi
echo ""

# Test 7: Frontend (si running)
echo -e "${BLUE}🎨 Testing Frontend...${NC}"
if run_test "Frontend port 5173 accessible" "nc -z localhost 5173"; then
    run_test "Frontend serves content" "curl -sf http://localhost:5173 | head -1"
fi
echo ""

# Résumé
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED ($TESTS_PASSED/$TESTS_TOTAL)${NC}"
    echo ""
    echo -e "${GREEN}🎉 Setup is complete and working!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  SOME TESTS FAILED${NC}"
    echo ""
    echo -e "  Total:  $TESTS_TOTAL"
    echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
    echo ""
    echo -e "${YELLOW}Note: Some tests may fail if services are not running.${NC}"
    echo -e "${YELLOW}Run './setup.sh full' to start all services.${NC}"
    exit 1
fi
