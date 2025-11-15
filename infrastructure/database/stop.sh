#!/bin/bash

# ============================================================================
# Script d'arrêt de la stack Cartae Database
# ============================================================================

set -e

echo "🛑 Arrêt de la stack Cartae Database..."

docker compose stop

echo "✅ Stack arrêtée avec succès !"
echo ""
echo "💡 Pour redémarrer : ./start.sh"
echo "💡 Pour supprimer les données : ./reset.sh"
