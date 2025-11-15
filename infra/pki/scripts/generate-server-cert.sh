#!/bin/bash
# Cartae - PKI Internal - Server Certificate Generation
# Session 81b - TLS/mTLS End-to-End
#
# Génère certificat serveur pour Vault/PostgreSQL
# - RSA 2048 bits
# - Validité 1 an
# - SANs (Subject Alternative Names) pour DNS + IP
#
# Usage:
#   ./generate-server-cert.sh <service> <sans>
#
# Exemples:
#   ./generate-server-cert.sh vault "DNS:vault,DNS:localhost,IP:127.0.0.1"
#   ./generate-server-cert.sh postgres "DNS:postgres,DNS:localhost,IP:127.0.0.1"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKI_DIR="$(dirname "$SCRIPT_DIR")"
CA_DIR="$PKI_DIR/ca"
SERVER_DIR="$PKI_DIR/server"

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

# Vérifier arguments
if [[ $# -lt 2 ]]; then
  error "Usage: $0 <service> <sans>"
  echo ""
  echo "Exemples:"
  echo "  $0 vault \"DNS:vault,DNS:localhost,IP:127.0.0.1\""
  echo "  $0 postgres \"DNS:postgres,DNS:localhost,IP:127.0.0.1\""
  exit 1
fi

SERVICE=$1
SANS=$2

# Vérifier si CA existe
if [[ ! -f "$CA_DIR/ca.crt" || ! -f "$CA_DIR/ca.key" ]]; then
  error "CA root non trouvé. Générer d'abord avec: ./generate-ca.sh"
  exit 1
fi

# Créer répertoire server
mkdir -p "$SERVER_DIR"
cd "$SERVER_DIR"

info "Génération certificat serveur pour: $SERVICE"

# Générer clé privée serveur
info "Génération clé privée (RSA 2048 bits)..."
openssl genrsa -out "${SERVICE}.key" 2048 2>/dev/null
chmod 600 "${SERVICE}.key"
log "Clé privée créée: ${SERVICE}.key"

# Générer CSR (Certificate Signing Request)
info "Génération CSR (Certificate Signing Request)..."
openssl req -new \
  -key "${SERVICE}.key" \
  -out "${SERVICE}.csr" \
  -subj "/C=FR/ST=France/L=Paris/O=Cartae/OU=Infrastructure/CN=${SERVICE}" \
  -sha256 \
  2>/dev/null

log "CSR créé: ${SERVICE}.csr"

# Créer fichier extensions avec SANs
cat > "${SERVICE}.ext" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = ${SANS}
EOF

# Signer CSR avec CA
info "Signature CSR avec CA root..."
openssl x509 -req \
  -in "${SERVICE}.csr" \
  -CA "$CA_DIR/ca.crt" \
  -CAkey "$CA_DIR/ca.key" \
  -CAcreateserial \
  -out "${SERVICE}.crt" \
  -days 365 \
  -sha256 \
  -extfile "${SERVICE}.ext" \
  2>/dev/null

chmod 644 "${SERVICE}.crt"
log "Certificat signé: ${SERVICE}.crt"

# Vérifier certificat
info "Vérification certificat..."
SUBJECT=$(openssl x509 -in "${SERVICE}.crt" -noout -subject)
ISSUER=$(openssl x509 -in "${SERVICE}.crt" -noout -issuer)
NOT_AFTER=$(openssl x509 -in "${SERVICE}.crt" -noout -enddate | cut -d= -f2)
SAN_LIST=$(openssl x509 -in "${SERVICE}.crt" -noout -ext subjectAltName 2>/dev/null || echo "")

echo ""
log "✅ Certificat serveur généré avec succès"
echo ""
echo "Service: $SERVICE"
echo "  • Subject: ${SUBJECT#*=}"
echo "  • Issuer:  ${ISSUER#*=}"
echo "  • Expire:  $NOT_AFTER"
if [[ -n "$SAN_LIST" ]]; then
  echo "  • SANs:    $(echo "$SAN_LIST" | grep -v "X509v3")"
fi
echo ""
echo "Fichiers créés:"
echo "  • Clé privée:  $SERVER_DIR/${SERVICE}.key (privée, 600)"
echo "  • Certificat:  $SERVER_DIR/${SERVICE}.crt (publique, 644)"
echo "  • CSR:         $SERVER_DIR/${SERVICE}.csr (archive)"
echo "  • Extensions:  $SERVER_DIR/${SERVICE}.ext (archive)"
echo ""

# Vérifier validité contre CA
if openssl verify -CAfile "$CA_DIR/ca.crt" "${SERVICE}.crt" &>/dev/null; then
  log "✅ Certificat validé contre CA root"
else
  error "❌ Certificat invalide (non signé par CA root)"
  exit 1
fi

exit 0
