#!/bin/bash
# Cartae - Standalone Deployment Script
# Usage: ./deploy-standalone.sh [minimal|standard|full]
# Description: Installation 1-click complète avec health checks et rollback automatique

set -e  # Exit on error
set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROFILE="${1:-standard}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_EXAMPLE="${PROJECT_ROOT}/.env.example"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.standalone.yml"
HEALTH_CHECK_SCRIPT="${PROJECT_ROOT}/infra/scripts/health-check.sh"

# Services health check timeouts (seconds)
POSTGRES_TIMEOUT=60
REDIS_TIMEOUT=30
VAULT_TIMEOUT=45
API_TIMEOUT=60

# Logging
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
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

# Spinner function
spinner() {
  local pid=$1
  local delay=0.1
  local spinstr='|/-\'
  while ps -p "$pid" > /dev/null 2>&1; do
    local temp=${spinstr#?}
    printf " [%c]  " "$spinstr"
    local spinstr=$temp${spinstr%"$temp"}
    sleep $delay
    printf "\b\b\b\b\b\b"
  done
  printf "    \b\b\b\b"
}

# Rollback function
rollback() {
  error "Déploiement échoué. Rollback en cours..."
  docker compose -f "$COMPOSE_FILE" --profile "$PROFILE" down -v 2>/dev/null || true
  exit 1
}

# Trap errors
trap rollback ERR

# Header
clear
echo -e "${BLUE}"
cat << "EOF"
   ____           _
  / ___|__ _ _ __| |_ __ _  ___
 | |   / _` | '__| __/ _` |/ _ \
 | |__| (_| | |  | || (_| |  __/
  \____\__,_|_|   \__\__,_|\___|

  Standalone Deployment Script
EOF
echo -e "${NC}"
echo "Profile: ${GREEN}${PROFILE}${NC}"
echo ""

# Validate profile
if [[ ! "$PROFILE" =~ ^(minimal|standard|full)$ ]]; then
  error "Profil invalide: $PROFILE"
  echo "Profils valides: minimal, standard, full"
  exit 1
fi

# Step 1: Check prerequisites
log "Vérification des prérequis..."

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
  error "Docker n'est pas installé"
  echo ""
  echo "Installation Docker:"
  echo "  macOS: https://docs.docker.com/desktop/install/mac-install/"
  echo "  Linux: https://docs.docker.com/engine/install/"
  echo "  Windows: https://docs.docker.com/desktop/install/windows-install/"
  exit 1
fi
success "Docker installé ($(docker --version | awk '{print $3}' | tr -d ','))"

# Check Docker Compose
if ! docker compose version >/dev/null 2>&1; then
  error "Docker Compose n'est pas installé"
  echo ""
  echo "Docker Compose est requis (version 2.0+)"
  echo "Installation: https://docs.docker.com/compose/install/"
  exit 1
fi
success "Docker Compose installé ($(docker compose version --short))"

# Check Docker daemon
if ! docker info >/dev/null 2>&1; then
  error "Docker daemon n'est pas démarré"
  echo ""
  echo "Démarrez Docker Desktop ou le daemon Docker:"
  echo "  macOS: Ouvrir Docker Desktop"
  echo "  Linux: sudo systemctl start docker"
  exit 1
fi
success "Docker daemon actif"

# Check resources (RAM)
total_ram=$(docker info --format '{{.MemTotal}}' 2>/dev/null | awk '{print int($1/1024/1024/1024)}')
if [ -z "$total_ram" ] || [ "$total_ram" -eq 0 ]; then
  total_ram=2  # Default if can't detect
fi

required_ram=1
if [ "$PROFILE" = "standard" ]; then
  required_ram=2
elif [ "$PROFILE" = "full" ]; then
  required_ram=4
fi

if [ "$total_ram" -lt "$required_ram" ]; then
  warning "RAM insuffisante: ${total_ram}GB détecté, ${required_ram}GB recommandé pour profil ${PROFILE}"
  echo "Continuer quand même? (y/N)"
  read -r response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
success "Ressources suffisantes (RAM: ${total_ram}GB)"

echo ""

# Step 2: Generate .env file
log "Configuration de l'environnement..."

if [ -f "$ENV_FILE" ]; then
  warning ".env existant détecté"
  echo "Écraser? (y/N)"
  read -r response
  if [[ "$response" =~ ^[Yy]$ ]]; then
    rm "$ENV_FILE"
  else
    success "Conservation de .env existant"
  fi
fi

if [ ! -f "$ENV_FILE" ]; then
  if [ ! -f "$ENV_EXAMPLE" ]; then
    error ".env.example introuvable dans $PROJECT_ROOT"
    exit 1
  fi

  log "Génération de .env depuis .env.example..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"

  # Auto-generate secrets
  log "Génération des secrets aléatoires..."

  # Generate secure random strings
  if command -v openssl >/dev/null 2>&1; then
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+' | cut -c1-32)
    VAULT_TOKEN=$(openssl rand -base64 32 | tr -d '=/+' | cut -c1-32)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '=/+' | cut -c1-64)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+' | cut -c1-32)
  else
    # Fallback to /dev/urandom
    POSTGRES_PASSWORD=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    VAULT_TOKEN=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    JWT_SECRET=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    REDIS_PASSWORD=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
  fi

  # Update .env with generated secrets
  sed -i.bak "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${POSTGRES_PASSWORD}/" "$ENV_FILE"
  sed -i.bak "s/VAULT_TOKEN=.*/VAULT_TOKEN=${VAULT_TOKEN}/" "$ENV_FILE"
  sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" "$ENV_FILE"
  sed -i.bak "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASSWORD}/" "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"

  success "Secrets générés et configurés"
fi

success "Configuration .env prête"
echo ""

# Step 3: Pull Docker images
log "Téléchargement des images Docker (peut prendre plusieurs minutes)..."

{
  docker compose -f "$COMPOSE_FILE" --profile "$PROFILE" pull
} > /tmp/docker-pull.log 2>&1 &
PULL_PID=$!
spinner $PULL_PID
wait $PULL_PID

success "Images Docker téléchargées"
echo ""

# Step 4: Start services
log "Démarrage des services (profil: ${PROFILE})..."

docker compose -f "$COMPOSE_FILE" --profile "$PROFILE" up -d

success "Services démarrés"
echo ""

# Step 5: Health checks
log "Vérification de la santé des services..."

# PostgreSQL health check
log "  PostgreSQL..."
POSTGRES_HEALTHY=0
for i in $(seq 1 $POSTGRES_TIMEOUT); do
  if docker compose -f "$COMPOSE_FILE" exec -T cartae-postgres pg_isready -U cartae >/dev/null 2>&1; then
    POSTGRES_HEALTHY=1
    break
  fi
  sleep 1
done

if [ $POSTGRES_HEALTHY -eq 0 ]; then
  error "PostgreSQL timeout après ${POSTGRES_TIMEOUT}s"
  rollback
fi
success "  PostgreSQL: OK"

# Redis health check
if [[ "$PROFILE" =~ ^(standard|full)$ ]]; then
  log "  Redis..."
  REDIS_HEALTHY=0
  for i in $(seq 1 $REDIS_TIMEOUT); do
    if docker compose -f "$COMPOSE_FILE" exec -T cartae-redis redis-cli ping >/dev/null 2>&1; then
      REDIS_HEALTHY=1
      break
    fi
    sleep 1
  done

  if [ $REDIS_HEALTHY -eq 0 ]; then
    error "Redis timeout après ${REDIS_TIMEOUT}s"
    rollback
  fi
  success "  Redis: OK"
fi

# Vault health check
if [[ "$PROFILE" =~ ^(standard|full)$ ]]; then
  log "  Vault..."
  VAULT_HEALTHY=0
  for i in $(seq 1 $VAULT_TIMEOUT); do
    if curl -sf http://localhost:8200/v1/sys/health >/dev/null 2>&1; then
      VAULT_HEALTHY=1
      break
    fi
    sleep 1
  done

  if [ $VAULT_HEALTHY -eq 0 ]; then
    warning "Vault timeout après ${VAULT_TIMEOUT}s (peut nécessiter unseal manuel)"
  else
    success "  Vault: OK"
  fi
fi

# API health check
log "  API..."
API_HEALTHY=0
for i in $(seq 1 $API_TIMEOUT); do
  if curl -sf http://localhost:3001/health >/dev/null 2>&1; then
    API_HEALTHY=1
    break
  fi
  sleep 1
done

if [ $API_HEALTHY -eq 0 ]; then
  error "API timeout après ${API_TIMEOUT}s"
  rollback
fi
success "  API: OK"

echo ""

# Success banner
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✅  Déploiement Complété Avec Succès!                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo "🌐 Accès Cartae:"
echo "   Frontend:    http://localhost:5173"
echo "   API Health:  http://localhost:3001/health"
if [[ "$PROFILE" =~ ^(standard|full)$ ]]; then
  echo "   Vault UI:    http://localhost:8200/ui"
fi
echo ""

echo "📋 Prochaines étapes:"
echo "   1. Ouvrir http://localhost:5173 dans votre navigateur"
echo "   2. Compléter l'assistant de configuration (setup wizard)"
echo "   3. Créer votre premier élément (item)"
echo ""

echo "🔧 Commandes utiles:"
echo "   docker compose -f $COMPOSE_FILE --profile $PROFILE ps      # Voir status services"
echo "   docker compose -f $COMPOSE_FILE --profile $PROFILE logs -f # Voir logs"
echo "   docker compose -f $COMPOSE_FILE --profile $PROFILE down    # Arrêter services"
echo "   docker compose -f $COMPOSE_FILE --profile $PROFILE restart # Redémarrer services"
echo ""

echo "📖 Documentation:"
echo "   Guide complet: ${SCRIPT_DIR}/DEPLOY-STANDALONE.md"
echo "   Troubleshooting: ${SCRIPT_DIR}/TROUBLESHOOTING.md"
echo ""

success "Profitez de Cartae!"
