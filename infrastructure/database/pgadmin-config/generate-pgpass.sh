#!/bin/bash

# ============================================================================
# Génère le fichier pgpass depuis les variables .env
# ============================================================================

# Charge les variables depuis .env
if [ -f ../.env ]; then
  export $(cat ../.env | grep -v '^#' | xargs)
else
  echo "❌ Fichier .env manquant"
  exit 1
fi

# Génère pgpass
cat > pgpass << PGPASS
postgres:5432:${POSTGRES_DB}:${POSTGRES_USER}:${POSTGRES_PASSWORD}
PGPASS

chmod 600 pgpass

echo "✅ Fichier pgpass généré avec:"
echo "   Database: ${POSTGRES_DB}"
echo "   User: ${POSTGRES_USER}"
echo "   Password: ********"
