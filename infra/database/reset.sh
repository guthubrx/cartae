#!/bin/bash

# Cartae - PostgreSQL Reset Script
# Purge complète + restart

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  ATTENTION: Cette opération va SUPPRIMER toutes les données PostgreSQL !${NC}"
echo ""
read -p "Êtes-vous sûr de vouloir continuer? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}✅ Opération annulée${NC}"
    exit 0
fi

echo -e "${RED}🗑️  Arrêt et suppression des containers...${NC}"
docker-compose down -v

echo -e "${GREEN}✅ Containers et volumes supprimés${NC}"
echo ""

echo -e "${GREEN}🚀 Redémarrage de PostgreSQL...${NC}"
./start.sh

echo ""
echo -e "${GREEN}✅ Reset terminé !${NC}"
echo -e "${GREEN}PostgreSQL est prêt avec une base vierge${NC}"
