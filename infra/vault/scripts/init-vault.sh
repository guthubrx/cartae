#!/bin/bash
# Script d'initialisation de HashiCorp Vault
# Usage: ./init-vault.sh [dev|prod]

set -e # Exit on error

MODE=${1:-dev}
VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}

echo "🔐 Initialisation de Vault en mode: $MODE"
echo "📍 Vault address: $VAULT_ADDR"

# Fonction: Attendre que Vault soit prêt
wait_for_vault() {
  echo "⏳ Attente de Vault..."
  for i in {1..30}; do
    if vault status >/dev/null 2>&1 || [ $? -eq 2 ]; then
      echo "✅ Vault est prêt !"
      return 0
    fi
    echo "   Tentative $i/30..."
    sleep 2
  done
  echo "❌ Vault n'a pas démarré dans les temps"
  exit 1
}

# Fonction: Initialiser Vault (mode production)
init_vault_prod() {
  echo "🔧 Initialisation Vault (production)..."

  # Vérifier si déjà initialisé
  if vault status 2>&1 | grep -q "Initialized.*true"; then
    echo "⚠️  Vault déjà initialisé"
    return 0
  fi

  # Initialiser avec Shamir Secret Sharing (5 clés, seuil de 3)
  vault operator init \
    -key-shares=5 \
    -key-threshold=3 \
    -format=json > /tmp/vault-init-output.json

  echo "✅ Vault initialisé !"
  echo ""
  echo "⚠️  IMPORTANT - Sauvegardez ces clés de manière sécurisée !"
  echo ""
  echo "📋 Unseal Keys:"
  jq -r '.unseal_keys_b64[]' /tmp/vault-init-output.json | nl
  echo ""
  echo "🔑 Root Token:"
  jq -r '.root_token' /tmp/vault-init-output.json
  echo ""
  echo "⚠️  Ces clés ne seront JAMAIS affichées à nouveau !"
  echo "⚠️  Sans ces clés, vous ne pourrez PAS déverrouiller Vault après redémarrage !"
  echo ""

  # Extraire pour unseal automatique
  UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' /tmp/vault-init-output.json)
  UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' /tmp/vault-init-output.json)
  UNSEAL_KEY_3=$(jq -r '.unseal_keys_b64[2]' /tmp/vault-init-output.json)
  export VAULT_TOKEN=$(jq -r '.root_token' /tmp/vault-init-output.json)

  # Unseal Vault (nécessite 3 clés sur 5)
  echo "🔓 Unseal de Vault..."
  vault operator unseal "$UNSEAL_KEY_1"
  vault operator unseal "$UNSEAL_KEY_2"
  vault operator unseal "$UNSEAL_KEY_3"

  echo "✅ Vault déverrouillé !"
}

# Fonction: Configurer secrets engine KV v2
setup_secrets_engine() {
  echo "🗂️  Configuration du secrets engine (KV v2)..."

  # Activer KV v2 secrets engine
  vault secrets enable -path=secret kv-v2 2>/dev/null || echo "   KV engine déjà activé"

  echo "✅ Secrets engine configuré !"
}

# Fonction: Charger les policies ACL
load_policies() {
  echo "📜 Chargement des policies ACL..."

  # Policy pour l'application Cartae
  vault policy write cartae-app /vault/policies/cartae-app-policy.hcl
  echo "   ✅ cartae-app policy chargée"

  # Policy pour les administrateurs
  vault policy write cartae-admin /vault/policies/cartae-admin-policy.hcl
  echo "   ✅ cartae-admin policy chargée"

  echo "✅ Policies chargées !"
}

# Fonction: Créer des secrets de test (dev only)
create_test_secrets() {
  echo "🧪 Création de secrets de test..."

  # Office 365 credentials (factices)
  vault kv put secret/office365/tenant1 \
    client_id="00000000-0000-0000-0000-000000000000" \
    client_secret="dev-secret-office365" \
    tenant_id="common" \
    redirect_uri="http://localhost:3000/callback"

  # Gmail credentials (factices)
  vault kv put secret/gmail/user1 \
    client_id="fake-gmail-client-id" \
    client_secret="dev-secret-gmail" \
    refresh_token="fake-refresh-token"

  # Database credentials
  vault kv put secret/database/postgresql \
    host="localhost" \
    port="5432" \
    database="cartae_db" \
    username="cartae_user" \
    password="dev-only-password"

  # Encryption key (AES-256-GCM)
  vault kv put secret/encryption/master-key \
    key="$(openssl rand -base64 32)" \
    algorithm="AES-256-GCM" \
    created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  echo "✅ Secrets de test créés !"
}

# Fonction: Créer un token pour l'application
create_app_token() {
  echo "🎫 Création d'un token pour l'application..."

  # Token avec policy cartae-app (TTL: 30 jours)
  APP_TOKEN=$(vault token create \
    -policy=cartae-app \
    -ttl=720h \
    -renewable=true \
    -format=json | jq -r '.auth.client_token')

  echo "✅ Token application créé !"
  echo ""
  echo "📋 Utilisez ce token dans votre application:"
  echo "VAULT_TOKEN=$APP_TOKEN"
  echo ""
}

# Main workflow
main() {
  wait_for_vault

  if [ "$MODE" = "prod" ]; then
    init_vault_prod
    setup_secrets_engine
    load_policies
    create_app_token
    echo ""
    echo "✅ Vault initialisé en mode PRODUCTION"
    echo "⚠️  N'oubliez pas de sauvegarder les unseal keys !"
  else
    # Mode dev: Vault est déjà initialisé et unseal par Docker
    export VAULT_TOKEN="dev-only-token"
    setup_secrets_engine
    load_policies
    create_test_secrets
    create_app_token
    echo ""
    echo "✅ Vault initialisé en mode DÉVELOPPEMENT"
    echo "🔑 Root token: dev-only-token"
  fi

  echo ""
  echo "🌐 Vault UI: http://localhost:8200/ui"
  echo "🌐 Vault UI (djenriquez): http://localhost:8000"
}

main
