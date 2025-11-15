#!/bin/bash
# Génération de certificats TLS pour architecture Zero Trust
# Session 78 - Security Hardening
# Usage: ./generate-certs.sh

set -e

CERTS_DIR="../certs"
VALIDITY_DAYS=3650 # 10 ans (certificats internes)

echo "🔐 Génération des certificats TLS pour Cartae (Zero Trust)"
echo ""

# Créer répertoire certs
mkdir -p "$CERTS_DIR"
cd "$CERTS_DIR"

# ============================================================
# 1. Certificate Authority (CA) - Root cert
# ============================================================

echo "📜 Étape 1/6: Génération de la Certificate Authority (CA)..."

# Générer clé privée CA (RSA 4096 bits)
openssl genrsa -out ca.key 4096

# Générer certificat auto-signé CA (valide 10 ans)
openssl req -new -x509 -days "$VALIDITY_DAYS" -key ca.key -out ca.crt \
  -subj "/C=FR/ST=France/L=Paris/O=Cartae/OU=Security/CN=Cartae Root CA"

echo "   ✅ CA créée: ca.crt, ca.key"
echo ""

# ============================================================
# 2. Vault - Certificat serveur
# ============================================================

echo "🔒 Étape 2/6: Génération certificat Vault..."

# Clé privée Vault
openssl genrsa -out vault.key 4096

# CSR (Certificate Signing Request)
openssl req -new -key vault.key -out vault.csr \
  -subj "/C=FR/ST=France/L=Paris/O=Cartae/OU=Vault/CN=vault"

# Créer fichier de config pour SAN (Subject Alternative Names)
cat > vault-san.cnf <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = vault

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = vault
DNS.2 = localhost
DNS.3 = cartae-vault
IP.1 = 127.0.0.1
IP.2 = 172.25.3.10
EOF

# Signer avec CA (valide 10 ans)
openssl x509 -req -in vault.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out vault.crt -days "$VALIDITY_DAYS" -sha256 \
  -extfile vault-san.cnf -extensions v3_req

# Nettoyer
rm vault.csr vault-san.cnf

echo "   ✅ Vault cert créé: vault.crt, vault.key"
echo ""

# ============================================================
# 3. PostgreSQL - Certificat serveur
# ============================================================

echo "🐘 Étape 3/6: Génération certificat PostgreSQL..."

openssl genrsa -out postgres.key 4096

openssl req -new -key postgres.key -out postgres.csr \
  -subj "/C=FR/ST=France/L=Paris/O=Cartae/OU=Database/CN=postgresql"

cat > postgres-san.cnf <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = postgresql

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = postgresql
DNS.2 = cartae-postgresql
IP.1 = 172.25.4.10
EOF

openssl x509 -req -in postgres.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out postgres.crt -days "$VALIDITY_DAYS" -sha256 \
  -extfile postgres-san.cnf -extensions v3_req

rm postgres.csr postgres-san.cnf

# PostgreSQL nécessite permissions strictes
chmod 600 postgres.key
chmod 644 postgres.crt

echo "   ✅ PostgreSQL cert créé: postgres.crt, postgres.key"
echo ""

# ============================================================
# 4. Cartae Web App - Certificat client/serveur
# ============================================================

echo "🌐 Étape 4/6: Génération certificat Cartae Web..."

openssl genrsa -out cartae.key 4096

openssl req -new -key cartae.key -out cartae.csr \
  -subj "/C=FR/ST=France/L=Paris/O=Cartae/OU=Application/CN=app.cartae.local"

cat > cartae-san.cnf <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = app.cartae.local

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = app.cartae.local
DNS.2 = cartae.local
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

openssl x509 -req -in cartae.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out cartae.crt -days "$VALIDITY_DAYS" -sha256 \
  -extfile cartae-san.cnf -extensions v3_req

rm cartae.csr cartae-san.cnf

echo "   ✅ Cartae Web cert créé: cartae.crt, cartae.key"
echo ""

# ============================================================
# 5. pgAdmin - Certificat serveur
# ============================================================

echo "🛠️  Étape 5/6: Génération certificat pgAdmin..."

openssl genrsa -out pgadmin.key 4096

openssl req -new -key pgadmin.key -out pgadmin.csr \
  -subj "/C=FR/ST=France/L=Paris/O=Cartae/OU=Admin/CN=pgadmin.cartae.local"

cat > pgadmin-san.cnf <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = pgadmin.cartae.local

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = pgadmin.cartae.local
DNS.2 = localhost
EOF

openssl x509 -req -in pgadmin.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out pgadmin.crt -days "$VALIDITY_DAYS" -sha256 \
  -extfile pgadmin-san.cnf -extensions v3_req

rm pgadmin.csr pgadmin-san.cnf

echo "   ✅ pgAdmin cert créé: pgadmin.crt, pgadmin.key"
echo ""

# ============================================================
# 6. Default certificate (Traefik fallback)
# ============================================================

echo "🔧 Étape 6/6: Génération certificat par défaut..."

openssl genrsa -out default.key 4096

openssl req -new -key default.key -out default.csr \
  -subj "/C=FR/ST=France/L=Paris/O=Cartae/OU=Default/CN=default.cartae.local"

openssl x509 -req -in default.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out default.crt -days "$VALIDITY_DAYS" -sha256

rm default.csr

echo "   ✅ Default cert créé: default.crt, default.key"
echo ""

# ============================================================
# Résumé et vérifications
# ============================================================

echo "✅ Tous les certificats générés avec succès !"
echo ""
echo "📋 Résumé des certificats:"
echo ""
echo "  CA (Root):"
echo "    - ca.crt (à installer dans trust store du système)"
echo "    - ca.key (⚠️  À protéger absolument !)"
echo ""
echo "  Vault:"
echo "    - vault.crt, vault.key"
echo "    - SANs: vault, localhost, cartae-vault, 127.0.0.1, 172.25.3.10"
echo ""
echo "  PostgreSQL:"
echo "    - postgres.crt, postgres.key"
echo "    - SANs: postgresql, cartae-postgresql, 172.25.4.10"
echo ""
echo "  Cartae Web:"
echo "    - cartae.crt, cartae.key"
echo "    - SANs: app.cartae.local, cartae.local, localhost"
echo ""
echo "  pgAdmin:"
echo "    - pgadmin.crt, pgadmin.key"
echo "    - SANs: pgadmin.cartae.local, localhost"
echo ""
echo "  Default (Traefik):"
echo "    - default.crt, default.key"
echo ""
echo "🔍 Vérification du certificat Vault:"
openssl x509 -in vault.crt -text -noout | grep -A 1 "Subject Alternative Name"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Installez ca.crt dans votre trust store système:"
echo "      - macOS: sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt"
echo "      - Linux: sudo cp ca.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates"
echo "   2. Protégez ca.key (ne JAMAIS commit dans Git)"
echo "   3. Ajoutez 'app.cartae.local' et 'pgadmin.cartae.local' à /etc/hosts:"
echo "      127.0.0.1 app.cartae.local pgadmin.cartae.local"
echo ""
