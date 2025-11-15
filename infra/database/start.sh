#!/bin/bash

# ============================================================================
# Script de démarrage automatique de la stack Cartae Database
# ============================================================================

set -e  # Arrêter en cas d'erreur

echo "🚀 Démarrage de la stack Cartae Database..."
echo ""

# Vérifier que Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker n'est pas démarré. Lance Docker Desktop puis réessaie."
  exit 1
fi

# Vérifier que le fichier .env existe
if [ ! -f ".env" ]; then
  echo "⚠️  Fichier .env manquant. Copie depuis .env.example..."
  cp .env.example .env
  echo "⚠️  ⚠️  ⚠️  ATTENTION ⚠️  ⚠️  ⚠️"
  echo "Édite le fichier .env et personnalise les mots de passe avant de continuer !"
  echo "Puis relance ./start.sh"
  exit 1
fi

# Génère pgpass depuis .env
echo "🔑 Génération pgpass depuis .env..."
cd pgadmin-config && ./generate-pgpass.sh && cd ..
if [ $? -ne 0 ]; then
  echo "❌ Erreur lors de la génération de pgpass"
  exit 1
fi

# Démarrer les services Docker
echo "🐳 Démarrage des conteneurs Docker..."
docker compose up -d

# Attendre que PostgreSQL soit prêt
echo ""
echo "⏳ Attente de PostgreSQL..."
for i in {1..30}; do
  if docker exec cartae-db pg_isready -U cartae > /dev/null 2>&1; then
    echo "✅ PostgreSQL est prêt !"
    break
  fi

  if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL n'a pas démarré après 30 secondes"
    exit 1
  fi

  sleep 1
done

# Vérifier pgAdmin
echo ""
echo "⏳ Attente de pgAdmin..."
sleep 5

# Afficher les URLs
echo ""
echo "✅ Stack Cartae Database démarrée avec succès !"
echo ""
echo "📍 Services disponibles :"
echo "   - PostgreSQL     : localhost:5432"
echo "   - pgAdmin        : http://localhost:5050"
echo "   - Database API   : À lancer manuellement (voir README)"
echo ""
echo "🔑 Credentials pgAdmin :"
echo "   - Email    : admin@cartae.dev"
echo "   - Password : admin"
echo ""
echo "📊 Le serveur PostgreSQL est déjà configuré dans pgAdmin !"
echo "   → Ouvre http://localhost:5050 et connecte-toi"
echo "   → Clique sur 'Cartae PostgreSQL' dans la sidebar"
echo ""
