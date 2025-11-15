# Cartae Database Infrastructure

Infrastructure PostgreSQL avec pgvector pour Cartae Project.

## 🚀 Quick Start

**Méthode recommandée (automatique) :**

```bash
# Tout-en-un : Démarre PostgreSQL + pgAdmin avec config automatique
./start.sh
```

Ensuite, ouvre **http://localhost:5050** :

- Login : `admin@cartae.dev` / `admin`
- Le serveur PostgreSQL est **déjà configuré** ✅
- Clique sur "Cartae PostgreSQL" → Databases → cartae → Tables

**Méthode manuelle :**

```bash
# 1. Démarrer la stack (PostgreSQL + pgAdmin)
docker compose up -d

# 2. Vérifier que tout tourne
docker compose ps

# 3. Voir les logs
docker compose logs -f postgres
```

## 📦 Services

### PostgreSQL 16 + pgvector

- **Port:** 5432 (configurable via `.env`)
- **Database:** cartae
- **Extensions:**
  - `pgvector` - Recherche vectorielle avec indexes HNSW
  - `pg_trgm` - Full-text search amélioré
  - `uuid-ossp` - Génération UUID v4

### pgAdmin 4

- **Port:** 5050 (configurable via `.env`)
- **URL:** http://localhost:5050
- **Login:** admin@cartae.dev / admin (par défaut)
- **🎯 Configuration automatique :** Le serveur PostgreSQL est pré-configuré au démarrage

## 🗄️ Schema

Le schema `cartae_items` est automatiquement créé au premier démarrage via les scripts:

1. `postgresql/init-scripts/01-extensions.sql` - Extensions PostgreSQL
2. `postgresql/init-scripts/02-schema.sql` - Table + indexes

### Indexes créés

- **HNSW vector index** sur `embedding` (recherche sémantique ultra-rapide)
- **GIN full-text** sur `title_tsv` et `content_tsv`
- **GIN** sur `tags` (recherche par tags)
- **B-tree composite** sur `(type, archived, created_at DESC)`
- **JSONB GIN** sur `metadata` (recherches dans champs custom)

## 🔌 Connection String

```bash
# Development
postgresql://cartae:changeme_in_production@localhost:5432/cartae

# Production (à adapter)
postgresql://user:password@host:port/database?sslmode=require
```

## 📊 Performance

Configuration optimisée pour 100k+ items:

- `shared_buffers = 256MB`
- `effective_cache_size = 1GB`
- `maintenance_work_mem = 128MB` (pour création indexes)
- `work_mem = 16MB`

## 🛠️ Commandes utiles

```bash
# Démarrer
docker-compose up -d

# Arrêter
docker-compose down

# Voir les logs
docker-compose logs -f postgres

# Backup manuel
docker exec cartae-db pg_dump -U cartae cartae > backup.sql

# Restore
docker exec -i cartae-db psql -U cartae cartae < backup.sql

# Se connecter au shell PostgreSQL
docker exec -it cartae-db psql -U cartae -d cartae

# Rebuild si changements Dockerfile
docker-compose up -d --build
```

## 📁 Structure

```
infrastructure/database/
├── docker-compose.yml          # Stack complète
├── .env.example                # Template variables
├── .env                        # Variables (git-ignored)
├── postgresql/
│   ├── Dockerfile              # Image custom avec pgvector
│   └── init-scripts/
│       ├── 01-extensions.sql   # Extensions PostgreSQL
│       └── 02-schema.sql       # Schema cartae_items
├── backups/                    # Backups SQL (git-ignored)
└── README.md                   # Ce fichier
```

## 🔐 Sécurité

**IMPORTANT en production:**

1. ✅ Changer les passwords dans `.env`
2. ✅ Activer SSL/TLS (`sslmode=require`)
3. ✅ Firewall sur port 5432 (seulement IP autorisées)
4. ✅ Backups automatiques quotidiens
5. ✅ Ne JAMAIS commit `.env` (dans .gitignore)

## 📚 Documentation

- [PostgreSQL](https://www.postgresql.org/docs/16/)
- [pgvector](https://github.com/pgvector/pgvector)
- [HNSW Algorithm](https://arxiv.org/abs/1603.09320)
