#!/bin/bash
# Cartae - PKI Internal - Complete Setup
# Session 81b - TLS/mTLS End-to-End
#
# Script master qui génère toute la PKI:
# 1. CA root
# 2. Certificat serveur Vault
# 3. Certificat serveur PostgreSQL
# 4. Certificat client database-api
#
# Usage:
#   ./setup-pki.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }

header() {
  echo ""
  echo -e "${CYAN}========================================${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}========================================${NC}"
  echo ""
}

header "CARTAE PKI - COMPLETE SETUP"

info "Ce script va générer toute la PKI interne Cartae:"
echo "  1. CA root (validité 10 ans)"
echo "  2. Certificat serveur Vault (TLS)"
echo "  3. Certificat serveur PostgreSQL (TLS)"
echo "  4. Certificat client database-api (mTLS)"
echo ""

read -p "Continuer ? [Y/n]: " confirm
if [[ "$confirm" == "n" || "$confirm" == "N" ]]; then
  info "Annulé"
  exit 0
fi

# Étape 1: CA Root
header "ÉTAPE 1/4 - CA ROOT"
"$SCRIPT_DIR/generate-ca.sh"

# Étape 2: Certificat serveur Vault
header "ÉTAPE 2/4 - CERTIFICAT SERVEUR VAULT"
"$SCRIPT_DIR/generate-server-cert.sh" vault "DNS:vault,DNS:cartae-vault,DNS:localhost,IP:127.0.0.1,IP:172.23.0.10"

# Étape 3: Certificat serveur PostgreSQL
header "ÉTAPE 3/4 - CERTIFICAT SERVEUR POSTGRESQL"
"$SCRIPT_DIR/generate-server-cert.sh" postgres "DNS:postgres,DNS:cartae-postgres,DNS:localhost,IP:127.0.0.1,IP:172.22.0.10"

# Étape 4: Certificat client database-api
header "ÉTAPE 4/4 - CERTIFICAT CLIENT DATABASE-API"
"$SCRIPT_DIR/generate-client-cert.sh" database-api

# Résumé
header "✅ PKI SETUP COMPLET"

echo "Tous les certificats ont été générés avec succès !"
echo ""
echo "Structure PKI créée:"
echo "  • CA root:              infra/pki/ca/ca.{crt,key}"
echo "  • Vault server:         infra/pki/server/vault.{crt,key}"
echo "  • PostgreSQL server:    infra/pki/server/postgres.{crt,key}"
echo "  • Database-API client:  infra/pki/client/database-api.{crt,key}"
echo ""
warn "IMPORTANT: Sauvegardez les clés privées (*.key) dans un endroit sécurisé"
warn "           Recommandation: Stocker dans HashiCorp Vault"
echo ""
info "Prochaines étapes:"
echo "  1. Configurer Vault avec mTLS (infra/vault/config.mtls.hcl)"
echo "  2. Configurer PostgreSQL avec TLS (infra/database/postgresql.conf)"
echo "  3. Mettre à jour database-api pour utiliser mTLS (packages/database-api)"
echo ""

exit 0
