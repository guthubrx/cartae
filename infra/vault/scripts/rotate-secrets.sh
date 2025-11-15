#!/bin/bash
# Script de rotation automatique des secrets
# Usage: ./rotate-secrets.sh [secret-path]

set -e

VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}
SECRET_PATH=${1:-}

if [ -z "$VAULT_TOKEN" ]; then
  echo "❌ VAULT_TOKEN non défini"
  exit 1
fi

if [ -z "$SECRET_PATH" ]; then
  echo "Usage: $0 <secret-path>"
  echo ""
  echo "Exemples:"
  echo "  $0 secret/data/encryption/master-key"
  echo "  $0 secret/data/office365/tenant1"
  exit 1
fi

echo "🔄 Rotation du secret: $SECRET_PATH"

# Lire le secret actuel
CURRENT_SECRET=$(vault kv get -format=json "$SECRET_PATH" 2>/dev/null || echo "{}")

if [ "$CURRENT_SECRET" = "{}" ]; then
  echo "❌ Secret non trouvé: $SECRET_PATH"
  exit 1
fi

# Extraire les métadonnées
VERSION=$(echo "$CURRENT_SECRET" | jq -r '.data.metadata.version')
CREATED_TIME=$(echo "$CURRENT_SECRET" | jq -r '.data.metadata.created_time')

echo "📋 Version actuelle: $VERSION"
echo "📅 Créé le: $CREATED_TIME"
echo ""

# Déterminer le type de secret et générer nouvelle valeur
SECRET_TYPE=$(basename "$SECRET_PATH")

case "$SECRET_TYPE" in
  master-key|encryption-key)
    echo "🔐 Génération nouvelle clé de chiffrement (AES-256)..."
    NEW_KEY=$(openssl rand -base64 32)

    # Mettre à jour avec nouvelle clé
    vault kv put "$SECRET_PATH" \
      key="$NEW_KEY" \
      algorithm="AES-256-GCM" \
      created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      rotated_from_version="$VERSION"
    ;;

  *)
    echo "⚠️  Type de secret non supporté pour rotation automatique: $SECRET_TYPE"
    echo "   Rotation manuelle requise"
    exit 1
    ;;
esac

# Vérifier nouvelle version
NEW_VERSION=$(vault kv metadata get -format=json "$SECRET_PATH" | jq -r '.current_version')

echo ""
echo "✅ Secret roté avec succès !"
echo "📋 Nouvelle version: $NEW_VERSION"
echo "📋 Ancienne version: $VERSION (toujours accessible avec -version=$VERSION)"
echo ""
echo "⚠️  N'oubliez pas de mettre à jour l'application avec la nouvelle clé !"
