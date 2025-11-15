#!/bin/bash
# Cartae - PKI Internal - CA Root Generation
# Session 81b - TLS/mTLS End-to-End
#
# Génère CA root pour PKI interne Cartae
# - RSA 4096 bits (sécurité maximale)
# - Validité 10 ans
# - Usage: sign certificats server/client
#
# Usage:
#   ./generate-ca.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKI_DIR="$(dirname "$SCRIPT_DIR")"
CA_DIR="$PKI_DIR/ca"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }

header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

header "CARTAE PKI - CA ROOT GENERATION"

# Vérifier si CA existe déjà
if [[ -f "$CA_DIR/ca.crt" ]]; then
  warn "CA root existe déjà: $CA_DIR/ca.crt"
  read -p "Régénérer CA (⚠️  invalidera tous certificats existants) ? [y/N]: " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    info "Annulé - CA root conservé"
    exit 0
  fi
  warn "Suppression ancien CA..."
  rm -f "$CA_DIR/ca.key" "$CA_DIR/ca.crt" "$CA_DIR/ca.srl"
fi

# Créer répertoire CA
mkdir -p "$CA_DIR"
cd "$CA_DIR"

info "Génération clé privée CA (RSA 4096 bits)..."
openssl genrsa -out ca.key 4096 2>/dev/null
chmod 600 ca.key
log "Clé privée CA créée: ca.key"

info "Génération certificat CA root (validité 10 ans)..."
openssl req -new -x509 \
  -key ca.key \
  -out ca.crt \
  -days 3650 \
  -subj "/C=FR/ST=France/L=Paris/O=Cartae/OU=Security/CN=Cartae Root CA" \
  -sha256 \
  2>/dev/null

chmod 644 ca.crt
log "Certificat CA root créé: ca.crt"

# Vérifier certificat
info "Vérification certificat CA..."
SUBJECT=$(openssl x509 -in ca.crt -noout -subject)
ISSUER=$(openssl x509 -in ca.crt -noout -issuer)
NOT_AFTER=$(openssl x509 -in ca.crt -noout -enddate | cut -d= -f2)

echo ""
log "✅ CA Root généré avec succès"
echo ""
echo "Détails CA:"
echo "  • Subject: ${SUBJECT#*=}"
echo "  • Issuer:  ${ISSUER#*=}"
echo "  • Expire:  $NOT_AFTER"
echo ""
echo "Fichiers créés:"
echo "  • Clé privée: $CA_DIR/ca.key (privée, 600)"
echo "  • Certificat: $CA_DIR/ca.crt (publique, 644)"
echo ""
warn "IMPORTANT: Sauvegardez ca.key dans un endroit sécurisé (Vault recommended)"
echo ""

exit 0
