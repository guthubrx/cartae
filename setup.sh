#!/bin/bash

# Cartae - Script d'Installation Automatique
# Usage: ./setup.sh [mode]
# Modes: simple | full | dev

set -e  # Exit on error

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║                                       ║"
echo "  ║   🚀 CARTAE SETUP WIZARD 🚀          ║"
echo "  ║                                       ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Fonction d'erreur
error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    exit 1
}

# Fonction de succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction d'info
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Fonction de warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Vérifier prérequis
check_prerequisites() {
    info "Vérification des prérequis..."

    # Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js n'est pas installé. Téléchargez-le depuis https://nodejs.org/"
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18+ requise. Vous avez: $(node -v)"
    fi
    success "Node.js $(node -v) ✅"

    # pnpm
    if ! command -v pnpm &> /dev/null; then
        warning "pnpm n'est pas installé. Installation en cours..."
        npm install -g pnpm || error "Installation de pnpm échouée"
    fi
    success "pnpm $(pnpm -v) ✅"

    # Docker (pour modes full et dev)
    if [ "$MODE" != "simple" ]; then
        if ! command -v docker &> /dev/null; then
            error "Docker n'est pas installé. Téléchargez-le depuis https://www.docker.com/"
        fi

        if ! docker ps &> /dev/null; then
            error "Docker daemon n'est pas démarré. Lancez Docker Desktop."
        fi
        success "Docker $(docker -v | cut -d' ' -f3 | tr -d ',') ✅"
    fi

    # Git
    if ! command -v git &> /dev/null; then
        error "Git n'est pas installé. Téléchargez-le depuis https://git-scm.com/"
    fi
    success "Git $(git --version | cut -d' ' -f3) ✅"

    echo ""
}

# Installation mode simple (frontend only)
setup_simple() {
    info "Installation Mode Simple (Frontend + IndexedDB)"
    echo ""

    # Install dependencies
    info "Installation des dépendances npm..."
    pnpm install || error "pnpm install échoué"
    success "Dépendances installées"

    echo ""
    success "Installation Mode Simple terminée !"
    echo ""
    info "Pour démarrer l'application:"
    echo -e "  ${GREEN}pnpm dev${NC}"
    echo ""
    info "Puis ouvrir: http://localhost:5173"
}

# Installation mode full (PostgreSQL + Vault + Frontend)
setup_full() {
    info "Installation Mode Complet (PostgreSQL + Vault + Frontend)"
    echo ""

    # Install dependencies
    info "Installation des dépendances npm..."
    pnpm install || error "pnpm install échoué"
    success "Dépendances installées"

    echo ""

    # PostgreSQL setup
    info "Configuration PostgreSQL + pgvector..."
    cd infrastructure/database

    if [ ! -f .env ]; then
        cp .env.example .env
        success ".env créé depuis .env.example"
    fi

    info "Démarrage PostgreSQL + pgAdmin..."
    ./start.sh || error "Démarrage PostgreSQL échoué"
    success "PostgreSQL démarré sur localhost:5432"
    success "pgAdmin démarré sur http://localhost:5050"

    cd ../..
    echo ""

    # Vault setup (optionnel)
    read -p "$(echo -e ${YELLOW}Voulez-vous installer Vault pour la gestion de secrets? [y/N]${NC} ) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Configuration Vault..."
        cd infra/vault

        if [ ! -f .env ]; then
            cp .env.example .env
            success ".env créé depuis .env.example"
        fi

        info "Démarrage Vault (mode développement)..."
        docker-compose up -d || error "Démarrage Vault échoué"

        info "Initialisation Vault (15 secondes)..."
        sleep 15

        docker-compose exec -T vault sh -c "cd /vault/scripts && ./init-vault.sh dev" || warning "Init Vault échoué (à faire manuellement)"
        success "Vault démarré sur http://localhost:8200"

        cd ../..
        echo ""
    fi

    # Database API setup
    info "Configuration Database API..."
    cd packages/database-api

    if [ ! -f .env ]; then
        cp .env.example .env
        success ".env créé depuis .env.example"
    fi

    cd ../..
    echo ""

    # Frontend setup
    info "Configuration Frontend..."
    cd apps/web

    if [ ! -f .env ]; then
        cp .env.example .env
        success ".env créé depuis .env.example"
    fi

    cd ../..
    echo ""

    success "Installation Mode Complet terminée !"
    echo ""
    info "Pour démarrer tous les services:"
    echo ""
    echo -e "  ${GREEN}# Terminal 1 - Database API${NC}"
    echo -e "  ${GREEN}cd packages/database-api && pnpm dev${NC}"
    echo ""
    echo -e "  ${GREEN}# Terminal 2 - Frontend${NC}"
    echo -e "  ${GREEN}cd apps/web && pnpm dev${NC}"
    echo ""
    info "Services disponibles:"
    echo "  - Frontend:   http://localhost:5173"
    echo "  - Database:   http://localhost:3001/health"
    echo "  - pgAdmin:    http://localhost:5050 (admin@cartae.dev / admin)"
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "  - Vault UI:   http://localhost:8200"
    fi
}

# Installation mode dev (tout + outils dev)
setup_dev() {
    info "Installation Mode Développement (Full + Dev Tools)"

    # Lancer setup full
    setup_full

    # Outils dev additionnels
    info "Installation des outils de développement..."

    # Husky pour git hooks
    if command -v husky &> /dev/null; then
        pnpm exec husky install || warning "Husky install échoué"
        success "Git hooks (husky) installés"
    fi

    echo ""
    success "Installation Mode Développement terminée !"
    echo ""
    info "Scripts de développement disponibles:"
    echo "  - pnpm dev              # Démarre frontend"
    echo "  - pnpm test             # Lance tous les tests"
    echo "  - pnpm lint             # Linter TypeScript/ESLint"
    echo "  - pnpm build            # Build production"
    echo "  - pnpm typecheck        # Vérification TypeScript"
}

# Main
main() {
    # Déterminer le mode
    MODE="${1:-full}"  # Par défaut: full

    case "$MODE" in
        simple)
            info "Mode: Simple (Frontend seulement)"
            ;;
        full)
            info "Mode: Complet (PostgreSQL + Vault + Frontend)"
            ;;
        dev)
            info "Mode: Développement (Full + Dev Tools)"
            ;;
        *)
            error "Mode invalide. Usage: ./setup.sh [simple|full|dev]"
            ;;
    esac

    echo ""

    # Vérifier prérequis
    check_prerequisites

    # Lancer setup selon mode
    case "$MODE" in
        simple)
            setup_simple
            ;;
        full)
            setup_full
            ;;
        dev)
            setup_dev
            ;;
    esac

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                       ║${NC}"
    echo -e "${GREEN}║   ✅ INSTALLATION TERMINÉE !         ║${NC}"
    echo -e "${GREEN}║                                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
    echo ""
    info "Pour plus d'infos, consultez GETTING-STARTED.md"
}

# Lancer le script
main "$@"
