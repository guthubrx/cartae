#!/bin/bash
# Health check pour HashiCorp Vault
# Retourne exit code 0 si OK, 1 si erreur

set -e

VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}

echo "🔍 Health Check Vault..."
echo "📍 Vault address: $VAULT_ADDR"
echo ""

# Vérifier que Vault répond
if ! curl -s "$VAULT_ADDR/v1/sys/health" >/dev/null 2>&1; then
  echo "❌ Vault ne répond pas"
  exit 1
fi

# Récupérer le status JSON
STATUS=$(curl -s "$VAULT_ADDR/v1/sys/health")

# Parser les informations importantes
INITIALIZED=$(echo "$STATUS" | jq -r '.initialized')
SEALED=$(echo "$STATUS" | jq -r '.sealed')
STANDBY=$(echo "$STATUS" | jq -r '.standby')
VERSION=$(echo "$STATUS" | jq -r '.version')

echo "📊 Vault Status:"
echo "   Version: $VERSION"
echo "   Initialized: $INITIALIZED"
echo "   Sealed: $SEALED"
echo "   Standby: $STANDBY"
echo ""

# Vérifier état critique
if [ "$INITIALIZED" != "true" ]; then
  echo "❌ Vault non initialisé"
  exit 1
fi

if [ "$SEALED" = "true" ]; then
  echo "⚠️  Vault est SEALED (verrouillé)"
  echo "   Exécutez 'vault operator unseal' avec vos clés"
  exit 1
fi

echo "✅ Vault est opérationnel !"

# Si token fourni, tester l'accès
if [ -n "$VAULT_TOKEN" ]; then
  echo ""
  echo "🔑 Test d'authentification..."

  if vault token lookup >/dev/null 2>&1; then
    echo "✅ Token valide"

    # Afficher les policies attachées
    POLICIES=$(vault token lookup -format=json | jq -r '.data.policies[]' | tr '\n' ', ')
    echo "   Policies: ${POLICIES%,}"
  else
    echo "❌ Token invalide"
    exit 1
  fi
fi

exit 0
