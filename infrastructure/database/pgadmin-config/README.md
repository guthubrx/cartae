# pgAdmin Auto-Configuration

Ce répertoire contient la configuration automatique de pgAdmin.

## Fichiers

### `servers.json`

Définit le serveur PostgreSQL qui sera automatiquement ajouté dans pgAdmin au premier démarrage.

### `pgpass`

Contient le mot de passe PostgreSQL en clair (format pgAdmin).
**⚠️ Ne jamais commiter ce fichier en production !**

## Fonctionnement

Au démarrage de pgAdmin (via Docker Compose), ces fichiers sont montés dans le conteneur :

- `servers.json` → `/pgadmin4/servers.json`
- `pgpass` → `/pgpass`

pgAdmin lit automatiquement ces fichiers et configure la connexion PostgreSQL.

## Résultat

Lorsque tu ouvres http://localhost:5050 :

1. Login avec `admin@cartae.dev` / `admin`
2. Le serveur "Cartae PostgreSQL" est **déjà configuré** ✅
3. Clic sur "Cartae PostgreSQL" → Databases → cartae → Schemas → public → Tables → cartae_items

**Plus besoin de configuration manuelle !**

## Personnalisation

Pour changer les credentials PostgreSQL, modifie :

1. `pgpass` : Nouvelle ligne avec `postgres:5432:cartae:username:password`
2. `servers.json` : Change `Username` si nécessaire
3. `docker-compose.yml` : Variables d'environnement PostgreSQL

Puis redémarre :

```bash
docker compose down
docker volume rm cartae-pgadmin-data
docker compose up -d
```
