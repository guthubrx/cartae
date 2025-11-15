#!/bin/bash

# Cartae - Vault Stop Script
# Wrapper docker-compose pour arrêter Vault

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}🛑 Arrêt HashiCorp Vault...${NC}"

docker-compose down

echo ""
echo -e "${GREEN}✅ Vault arrêté${NC}"
