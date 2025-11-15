#!/bin/bash
# Cartae - Setup Wizard (3 modes: DEV / STAGING / PROD)
# Session 81a - Network Segmentation & Firewall
#
# Démarrage simplifié avec auto-détection du mode:
# - DEV: Rapide, localhost, pas de sécurité (30s à démarrer)
# - STAGING: Sécurisé, 1 serveur, TLS auto-généré, identique PROD
# - PROD: Multi-serveurs, HA, TLS vérifié
#
# Usage:
#   ./setup.sh              # Mode interactif (choix 1/2/3)
#   ./setup.sh dev          # Démarrage direct en DEV
#   ./setup.sh staging      # Démarrage direct en STAGING

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }

header() {
  echo ""
  echo -e "${CYAN}========================================${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}========================================${NC}"
  echo ""
}

check_prerequisites() {
  info "Vérification des prérequis..."
  if ! command -v docker &> /dev/null; then
    error "Docker non installé"
    exit 1
  fi
  log "Docker OK ($(docker --version | cut -d' ' -f3))"
  
  if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose non installé"
    exit 1
  fi
  log "Docker Compose OK"
}

detect_mode() {
  if [[ -n "${1:-}" ]]; then
    case "${1,,}" in
      dev|development) echo "development"; return ;;
      staging|stage) echo "staging"; return ;;
      *) error "Mode invalide: $1"; exit 1 ;;
    esac
  fi
  
  if [[ -f ".env" ]]; then
    MODE=$(grep "^NODE_ENV=" .env | cut -d'=' -f2 || echo "")
    if [[ -n "$MODE" ]]; then echo "$MODE"; return; fi
  fi
  
  echo ""
}

interactive_mode_selection() {
  header "CARTAE - SETUP WIZARD"
  
  echo "Quel mode voulez-vous démarrer ?"
  echo ""
  echo -e "${GREEN}1) DEV${NC}      - Développement rapide (localhost, 30s)"
  echo -e "${YELLOW}2) STAGING${NC}  - Pré-production sécurisée (TLS auto)"
  echo ""
  
  read -p "Choix [1-2]: " choice
  
  case $choice in
    1) echo "development" ;;
    2) echo "staging" ;;
    *) error "Choix invalide"; exit 1 ;;
  esac
}

create_env_file() {
  local MODE=$1
  
  if [[ -f ".env" ]]; then
    info "Fichier .env existant (conservé)"
    return
  fi
  
  info "Création .env pour mode $MODE..."
  
  case $MODE in
    development)
      cat > .env <<EOF
NODE_ENV=development
POSTGRES_PASSWORD=changeme123
REDIS_PASSWORD=
VAULT_TOKEN=root-dev-token
DOMAIN=localhost
ACME_EMAIL=dev@localhost
EOF
      ;;
      
    staging)
      POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
      REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
      VAULT_TOKEN=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
      
      cat > .env <<EOF
NODE_ENV=staging
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
VAULT_TOKEN=$VAULT_TOKEN
DOMAIN=staging.example.com
ACME_EMAIL=admin@example.com
TRAEFIK_DASHBOARD_AUTH=admin:\$\$apr1\$\$...
EOF
      warn "IMPORTANT: Éditez .env et changez DOMAIN + ACME_EMAIL"
      ;;
  esac
  
  log "Fichier .env créé"
}

start_dev() {
  header "DÉMARRAGE MODE DEV"
  
  info "Création des réseaux Docker..."
  docker-compose -f infra/docker/docker-compose.networks.yml up --no-start 2>/dev/null || true
  
  info "Démarrage des containers..."
  docker-compose -f infra/docker/docker-compose.networks.yml \
                 -f infra/docker/docker-compose.base.yml \
                 -f infra/docker/docker-compose.dev.yml \
                 up -d
  
  echo ""
  log "✅ Cartae démarré en mode DEV"
  echo ""
  echo "Services disponibles:"
  echo "  • API:       http://localhost:3001/health"
  echo "  • Traefik:   http://localhost:8080"
  echo "  • PostgreSQL: localhost:5432 (cartae/changeme123)"
  echo "  • Redis:     localhost:6379"
  echo "  • Vault:     http://localhost:8200 (token: root-dev-token)"
  echo ""
  echo "Logs:  docker-compose logs -f database-api"
  echo "Arrêt: docker-compose down"
  echo ""
}

start_staging() {
  header "DÉMARRAGE MODE STAGING"
  
  if [[ ! -f ".env" ]]; then
    error "Fichier .env manquant"
    exit 1
  fi
  
  source .env
  
  if [[ "$DOMAIN" == "staging.example.com" || "$DOMAIN" == "localhost" ]]; then
    error "DOMAIN non configuré dans .env"
    exit 1
  fi
  
  info "Création des réseaux Docker..."
  docker-compose -f infra/docker/docker-compose.networks.yml up --no-start 2>/dev/null || true
  
  info "Démarrage des containers..."
  docker-compose -f infra/docker/docker-compose.networks.yml \
                 -f infra/docker/docker-compose.base.yml \
                 -f infra/docker/docker-compose.staging.yml \
                 up -d
  
  echo ""
  log "✅ Cartae démarré en mode STAGING"
  echo ""
  echo "Services:"
  echo "  • API:    https://api.$DOMAIN"
  echo "  • Traefik: https://traefik.$DOMAIN"
  echo ""
  echo "Initialiser Vault:"
  echo "  docker exec -it cartae-vault vault operator init"
  echo ""
}

# MAIN
check_prerequisites

MODE=$(detect_mode "${1:-}")

if [[ -z "$MODE" ]]; then
  MODE=$(interactive_mode_selection)
fi

create_env_file "$MODE"

case $MODE in
  development) start_dev ;;
  staging) start_staging ;;
  *) error "Mode inconnu"; exit 1 ;;
esac

exit 0
