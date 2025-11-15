#!/bin/bash

# Cartae - Vault Start Script
# Wrapper docker-compose pour démarrer Vault

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Démarrage HashiCorp Vault...${NC}"

# Vérifier .env
if [ ! -f .env ]; then
    echo -e "${GREEN}📄 Création .env depuis .env.example${NC}"
    cp .env.example .env
fi

# Démarrer Vault
docker-compose up -d

echo ""
echo -e "${GREEN}✅ Vault démarré !${NC}"
echo ""
echo -e "  🌐 Vault API:  ${BLUE}http://localhost:8200${NC}"
echo -e "  🎛️  Vault UI:   ${BLUE}http://localhost:8000${NC}"
echo -e "  🔑 Token dev:  ${BLUE}dev-only-token${NC}"
echo ""
echo -e "${GREEN}Initialisation Vault (optionnel):${NC}"
echo -e "  ${BLUE}cd scripts && ./init-vault.sh dev${NC}"
