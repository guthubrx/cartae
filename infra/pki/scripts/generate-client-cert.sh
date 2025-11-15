#!/bin/bash
# Cartae - PKI Internal - Client Certificate Generation
# Session 81b - TLS/mTLS End-to-End
#
# Génère certificat client pour database-api (mTLS)
# - RSA 2048 bits
# - Validité 1 an
# - CN (Common Name) pour identification client
#
# Usage:
#   ./generate-client-cert.sh <client_name>
#
# Exemples:
#   ./generate-client-cert.sh database-api
#   ./generate-client-cert.sh backup-service

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKI_DIR="$(dirname "$SCRIPT_DIR")"
CA_DIR="$PKI_DIR/ca"
CLIENT_DIR="$PKI_DIR/client"

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
if [[ $# -lt 1 ]]; then
  error "Usage: $0 <client_name>"
  echo ""
  echo "Exemples:"
  echo "  $0 database-api"
  echo "  $0 backup-service"
  exit 1
fi

CLIENT=$1

# Vérifier si CA existe
if [[ ! -f "$CA_DIR/ca.crt" || ! -f "$CA_DIR/ca.key" ]]; then
  error "CA root non trouvé. Générer d'abord avec: ./generate-ca.sh"
  exit 1
fi

# Créer répertoire client
mkdir -p "$CLIENT_DIR"
cd "$CLIENT_DIR"

info "Génération certificat client pour: $CLIENT"

# Générer clé privée client
info "Génération clé privée (RSA 2048 bits)..."
openssl genrsa -out "${CLIENT}.key" 2048 2>/dev/null
chmod 600 "${CLIENT}.key"
log "Clé privée créée: ${CLIENT}.key"

# Générer CSR (Certificate Signing Request)
info "Génération CSR (Certificate Signing Request)..."
openssl req -new \
  -key "${CLIENT}.key" \
  -out "${CLIENT}.csr" \
  -subj "/C=FR/ST=France/L=Paris/O=Cartae/OU=Applications/CN=${CLIENT}" \
  -sha256 \
  2>/dev/null

log "CSR créé: ${CLIENT}.csr"

# Créer fichier extensions pour client
cat > "${CLIENT}.ext" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

# Signer CSR avec CA
info "Signature CSR avec CA root..."
openssl x509 -req \
  -in "${CLIENT}.csr" \
  -CA "$CA_DIR/ca.crt" \
  -CAkey "$CA_DIR/ca.key" \
  -CAcreateserial \
  -out "${CLIENT}.crt" \
  -days 365 \
  -sha256 \
  -extfile "${CLIENT}.ext" \
  2>/dev/null

chmod 644 "${CLIENT}.crt"
log "Certificat signé: ${CLIENT}.crt"

# Vérifier certificat
info "Vérification certificat..."
SUBJECT=$(openssl x509 -in "${CLIENT}.crt" -noout -subject)
ISSUER=$(openssl x509 -in "${CLIENT}.crt" -noout -issuer)
NOT_AFTER=$(openssl x509 -in "${CLIENT}.crt" -noout -enddate | cut -d= -f2)
EKU=$(openssl x509 -in "${CLIENT}.crt" -noout -ext extendedKeyUsage 2>/dev/null || echo "")

echo ""
log "✅ Certificat client généré avec succès"
echo ""
echo "Client: $CLIENT"
echo "  • Subject: ${SUBJECT#*=}"
echo "  • Issuer:  ${ISSUER#*=}"
echo "  • Expire:  $NOT_AFTER"
if [[ -n "$EKU" ]]; then
  echo "  • Usage:   $(echo "$EKU" | grep -v "X509v3")"
fi
echo ""
echo "Fichiers créés:"
echo "  • Clé privée:  $CLIENT_DIR/${CLIENT}.key (privée, 600)"
echo "  • Certificat:  $CLIENT_DIR/${CLIENT}.crt (publique, 644)"
echo "  • CSR:         $CLIENT_DIR/${CLIENT}.csr (archive)"
echo "  • Extensions:  $CLIENT_DIR/${CLIENT}.ext (archive)"
echo ""

# Vérifier validité contre CA
if openssl verify -CAfile "$CA_DIR/ca.crt" "${CLIENT}.crt" &>/dev/null; then
  log "✅ Certificat validé contre CA root"
else
  error "❌ Certificat invalide (non signé par CA root)"
  exit 1
fi

exit 0
