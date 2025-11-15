# Database Migrations

Système de migrations pour Cartae Database.

## Structure

Les migrations SQL sont appliquées automatiquement au démarrage de PostgreSQL via les scripts dans `infrastructure/database/postgresql/init-scripts/`.

Ces scripts sont exécutés dans l'ordre alphabétique:

1. `01-extensions.sql` - Extensions PostgreSQL (pgvector, uuid-ossp, etc.)
2. `02-schema.sql` - Schema cartae_items + indexes

## Migrations futures

Pour ajouter de nouvelles migrations:

1. **Créer un nouveau script SQL** dans `infrastructure/database/postgresql/init-scripts/`
   - Nommer avec préfixe numérique: `03-add-new-feature.sql`
   - Utiliser `CREATE TABLE IF NOT EXISTS` pour idempotence
   - Utiliser `CREATE INDEX IF NOT EXISTS` pour les indexes

2. **Rebuild le container PostgreSQL**
   ```bash
   cd infrastructure/database
   docker-compose down -v  # Attention: supprime les données!
   docker-compose up -d --build
   ```

## Migrations sans perte de données

Pour modifier le schema sans perdre les données existantes:

1. **Se connecter à PostgreSQL**

   ```bash
   docker exec -it cartae-db psql -U cartae -d cartae
   ```

2. **Exécuter les commandes SQL manuellement**

   ```sql
   -- Exemple: Ajouter une colonne
   ALTER TABLE cartae_items ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);

   -- Créer un index
   CREATE INDEX IF NOT EXISTS idx_new_field ON cartae_items(new_field);
   ```

3. **Sauvegarder la migration** dans un nouveau fichier SQL pour futur redéploiement

## Backup avant migration

Toujours faire un backup avant de modifier le schema:

```bash
# Backup
docker exec cartae-db pg_dump -U cartae cartae > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore si problème
docker exec -i cartae-db psql -U cartae cartae < backup-20251110-101500.sql
```
