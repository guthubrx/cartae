# 🚀 Cartae - Guide de Démarrage Complet

Bienvenue dans **Cartae** ! Ce guide vous permettra de setup l'application complète depuis zéro.

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#-vue-densemble)
2. [Prérequis](#-prérequis)
3. [Installation Rapide (Mode Simple)](#-installation-rapide-mode-simple)
4. [Installation Complète (Mode Avancé)](#-installation-complète-mode-avancé)
5. [Vérification du Setup](#-vérification-du-setup)
6. [Premiers Pas](#-premiers-pas)
7. [Troubleshooting](#-troubleshooting)

---

## 🎯 Vue d'Ensemble

**Cartae** est une application de gestion de connaissances personnelle (Personal Knowledge Management) qui centralise vos emails, tâches, notes et événements depuis plusieurs sources (Office 365, Gmail, etc.).

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Web App  │  │  Desktop App │  │  Plugin Marketplace  │ │
│  └─────┬─────┘  └──────┬───────┘  └──────────┬───────────┘ │
└────────┼────────────────┼───────────────────┬─┼─────────────┘
         │                │                   │ │
         ▼                ▼                   │ │
┌────────────────────────────────────────────┼─┼─────────────┐
│           Database API (Express)           │ │             │
│         http://localhost:3001              │ │             │
└─────────────┬────────────────────────────┬─┼─┘             │
              │                            │ │               │
              ▼                            │ │               │
┌─────────────────────────────┐            │ │               │
│  PostgreSQL 16 + pgvector   │            │ │               │
│    localhost:5432           │            │ │               │
│  ┌──────────────────────┐   │            │ │               │
│  │ cartae_items table   │   │            │ │               │
│  │ - Full-text search   │   │            │ │               │
│  │ - Vector embeddings  │   │            │ │               │
│  │ - HNSW index         │   │            │ │               │
│  └──────────────────────┘   │            │ │               │
└─────────────────────────────┘            │ │               │
                                           │ │               │
                                           ▼ ▼               │
                              ┌──────────────────────────┐   │
                              │  HashiCorp Vault         │   │
                              │  localhost:8200          │   │
                              │  - Office 365 secrets    │   │
                              │  - Database credentials  │   │
                              │  - Encryption keys       │   │
                              └──────────────────────────┘   │
                                           │                 │
                                           ▼                 │
                              ┌──────────────────────────┐   │
                              │  Cache Local (IndexedDB) │   │
                              │  - LRU Management        │   │
                              │  - Smart Eviction        │   │
                              │  - 150 MB max            │   │
                              └──────────────────────────┘   │
```

---

## ✅ Prérequis

### Obligatoire

- **Node.js** ≥ 18.0.0 ([télécharger](https://nodejs.org/))
- **pnpm** ≥ 8.0.0 (gestionnaire de packages)
- **Docker** + **Docker Compose** ([télécharger](https://www.docker.com/))
- **Git** ([télécharger](https://git-scm.com/))

### Optionnel (selon usage)

- **Rust** ≥ 1.70 (si vous voulez builder l'app desktop Tauri)
- **Office 365** ou **Gmail** account (pour connecter vos emails)

### Installation pnpm

```bash
npm install -g pnpm
```

### Vérification

```bash
node --version   # v18.0.0+
pnpm --version   # 8.0.0+
docker --version # 20.0.0+
git --version    # 2.0.0+
```

---

## 🚀 Installation Rapide (Mode Simple)

**Temps estimé:** 10-15 minutes

Cette méthode lance **uniquement** le frontend avec cache local (IndexedDB). Pas de PostgreSQL, pas de Vault, pas de synchronisation serveur.

### 1. Cloner le Repository

```bash
git clone https://github.com/guthubrx/cartae.git
cd cartae
```

### 2. Installer les Dépendances

```bash
pnpm install
```

**⏱️ Durée:** ~5 minutes (dépend de votre connexion)

### 3. Lancer l'Application Web

```bash
pnpm dev
```

**Output attendu:**

```
  VITE v5.x ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h to show help
```

### 4. Ouvrir dans le Navigateur

Ouvrir **http://localhost:5173**

✅ **C'est tout !** L'app fonctionne en mode local avec IndexedDB uniquement.

**Limitations mode simple:**
- ❌ Pas de recherche full-text PostgreSQL
- ❌ Pas de recherche sémantique (embeddings)
- ❌ Pas de synchronisation multi-device
- ✅ Cache local intelligent (LRU, 150 MB max)
- ✅ Toutes les fonctionnalités UI fonctionnent

---

## 🔧 Installation Complète (Mode Avancé)

**Temps estimé:** 30-45 minutes

Cette méthode lance **tout** : Frontend + Database API + PostgreSQL + Vault + Cache intelligent.

### Étape 1️⃣: Cloner et Installer

```bash
git clone https://github.com/guthubrx/cartae.git
cd cartae
pnpm install
```

### Étape 2️⃣: Démarrer PostgreSQL + pgvector

```bash
cd infrastructure/database

# Copier la config (si pas encore fait)
cp .env.example .env

# Démarrer PostgreSQL + pgAdmin
./start.sh
```

**Output attendu:**

```
🚀 Démarrage de l'infrastructure PostgreSQL + pgAdmin...
✅ PostgreSQL container démarré
✅ pgAdmin container démarré
✅ Base de données 'cartae' créée
✅ Extensions installées (pgvector, pg_trgm, uuid-ossp)
✅ Schema 'cartae_items' créé
✅ Indexes créés (HNSW, GIN full-text, B-tree composite)

📊 Services disponibles:
  - PostgreSQL: localhost:5432
  - pgAdmin:    http://localhost:5050
    Login: admin@cartae.dev / admin

🎯 PostgreSQL est pré-configuré dans pgAdmin !
```

**Vérification:**

Ouvrir **http://localhost:5050** :
- Login: `admin@cartae.dev` / `admin`
- Cliquer sur **"Cartae PostgreSQL"** → **Databases** → **cartae** → **Tables**
- Vous devez voir la table `cartae_items` ✅

### Étape 3️⃣: Démarrer HashiCorp Vault (Optionnel mais Recommandé)

```bash
cd ../../infra/vault

# Copier la config
cp .env.example .env

# Démarrer Vault (mode développement)
docker-compose up -d

# Attendre 10-15 secondes que Vault soit prêt
sleep 15

# Initialiser Vault avec secrets de test
docker-compose exec vault sh -c "cd /vault/scripts && ./init-vault.sh dev"
```

**Output attendu:**

```
🔐 Initializing Vault in DEVELOPMENT mode...
✅ Vault unsealed successfully
✅ Policies created: cartae-admin, cartae-app
✅ Test secrets stored:
   - secret/database/postgres
   - secret/office365/test
   - secret/encryption/master-key

🎯 Vault UI: http://localhost:8200
   Token: hvs.xxxxxxxxxxxxxxxxxxxxxxxx

⚠️  DEVELOPMENT MODE - Store this token in .env:
   VAULT_TOKEN=hvs.xxxxxxxxxxxxxxxxxxxxxxxx
```

**Vérification:**

```bash
# Health check
docker-compose exec vault sh -c "cd /vault/scripts && ./health-check.sh"
```

**Output attendu:**

```
✅ Vault is initialized
✅ Vault is unsealed
✅ Health status: active
✅ Version: 1.15.x
```

### Étape 4️⃣: Configurer Database API

```bash
cd ../../packages/database-api

# Copier la config
cp .env.example .env

# Éditer .env (optionnel si PostgreSQL et Vault démarrés avec config par défaut)
nano .env
```

**Configuration `.env` :**

```bash
# PostgreSQL Connection
DATABASE_URL=postgresql://cartae:changeme_in_production@localhost:5432/cartae

# Server
PORT=3001
NODE_ENV=development

# Vault (optionnel)
VAULT_ENABLED=true
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=hvs.xxxxxxxxxxxxxxxxxxxxxxxx  # Token depuis Étape 3
VAULT_MOUNT_POINT=secret
```

**💡 Note:** Si `VAULT_ENABLED=false`, les credentials PostgreSQL seront lus depuis `DATABASE_URL` directement.

### Étape 5️⃣: Démarrer Database API

```bash
pnpm dev
```

**Output attendu:**

```
🔐 Initializing Vault client...
✅ Vault client initialized and ready
🔌 Testing PostgreSQL connection...
✅ PostgreSQL connected: {
  time: 2025-11-15T...,
  version: 'PostgreSQL 16.x'
}
✅ pgvector extension installed

🚀 Cartae Database API started
📍 Environment: development
🌐 Server: http://localhost:3001
💚 Health check: http://localhost:3001/health

📋 Available endpoints:
   POST   /api/parse          - Parse and store CartaeItem
   POST   /api/parse/batch    - Batch parse items
   GET    /api/search         - Full-text search
   GET    /api/search/stats   - Database statistics
   POST   /api/semantic       - Vector similarity search
   POST   /api/semantic/batch - Batch vector search
   POST   /api/hybrid         - Hybrid search (text + vector)
   POST   /api/hybrid/auto    - Auto-weighted hybrid search
   POST   /api/vault/secrets  - Store secret in Vault
   GET    /api/vault/secrets/:path - Retrieve secret from Vault
   DELETE /api/vault/secrets/:path - Delete secret from Vault
   GET    /api/vault/health   - Vault health check
```

**Vérification:**

```bash
curl http://localhost:3001/health
```

**Response attendue:**

```json
{
  "status": "ok",
  "timestamp": "2025-11-15T...",
  "environment": "development"
}
```

### Étape 6️⃣: Démarrer le Frontend

```bash
cd ../../apps/web

# Copier la config
cp .env.example .env

# Éditer .env (pointer vers Database API)
nano .env
```

**Configuration `.env` :**

```bash
# Database API
VITE_DATABASE_API_URL=http://localhost:3001

# Cache Local
VITE_CACHE_ENABLED=true
VITE_CACHE_MAX_SIZE_MB=150
VITE_CACHE_MAX_ITEMS=500
```

**Démarrer le dev server:**

```bash
pnpm dev
```

**Output attendu:**

```
  VITE v5.x ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### Étape 7️⃣: Ouvrir l'Application

Ouvrir **http://localhost:5173**

✅ **Setup complet terminé !**

---

## ✅ Vérification du Setup

### Checklist Complète

Vérifier que tous les services sont UP :

```bash
# PostgreSQL
docker ps | grep postgres

# Vault (si activé)
docker ps | grep vault

# Database API
curl http://localhost:3001/health

# Frontend
curl http://localhost:5173
```

### Tester l'API REST

**1. Stocker un item:**

```bash
curl -X POST http://localhost:3001/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-123",
    "type": "note",
    "title": "Ma première note",
    "content": "Ceci est un test de Cartae",
    "metadata": {},
    "tags": ["test", "demo"]
  }'
```

**Response:**

```json
{
  "status": "created",
  "item": { ... },
  "message": "Item created successfully"
}
```

**2. Rechercher l'item:**

```bash
curl "http://localhost:3001/api/search?q=première&limit=10"
```

**Response:**

```json
{
  "query": { "text": "première" },
  "count": 1,
  "results": [
    {
      "item": { ... },
      "score": 0.95,
      "textScore": 0.95
    }
  ]
}
```

✅ **Si vous obtenez ces réponses, l'API fonctionne !**

### Tester Vault (si activé)

```bash
curl "http://localhost:3001/api/vault/health"
```

**Response:**

```json
{
  "success": true,
  "vault": {
    "initialized": true,
    "sealed": false,
    "version": "1.15.x"
  }
}
```

---

## 🎮 Premiers Pas

### 1. Interface Web

Ouvrir **http://localhost:5173**

**Fonctionnalités disponibles:**

- ✅ **Dashboard** - Vue d'ensemble de tous vos items
- ✅ **Recherche** - Full-text + sémantique (si PostgreSQL activé)
- ✅ **Filtres** - Par type, tags, dates, source
- ✅ **Plugins** - Office 365, Gmail, Tasks, Notes, Events
- ✅ **Marketplace** - Installer des plugins additionnels
- ✅ **Thèmes** - Mode clair/sombre

### 2. Connecter Office 365 (Optionnel)

1. Cliquer sur **"Plugins"** → **"Office 365 Connector"**
2. Cliquer sur **"Connect to Office 365"**
3. Se connecter avec votre compte Microsoft
4. Autoriser l'accès (permissions: Mail.Read, Calendars.Read)
5. Les emails/calendriers sont importés automatiquement

### 3. Explorer les Données

**Via pgAdmin:**

1. Ouvrir **http://localhost:5050**
2. Cliquer sur **"Cartae PostgreSQL"** → **cartae** → **Tables** → **cartae_items**
3. Clic droit → **"View/Edit Data"** → **"All Rows"**

**Via API:**

```bash
# Statistiques globales
curl http://localhost:3001/api/search/stats

# Response:
# {
#   "totalItems": 42,
#   "byType": { "email": 30, "task": 10, "note": 2 },
#   "byConnector": { "office365": 35, "manual": 7 },
#   "storageUsedMB": 12.5,
#   "oldestItem": "2025-01-01T...",
#   "newestItem": "2025-11-15T..."
# }
```

### 4. Recherche Sémantique (Avancé)

**Prérequis:** Avoir des embeddings générés (nécessite OpenAI API key ou modèle local)

```bash
# Recherche vectorielle
curl -X POST http://localhost:3001/api/semantic \
  -H "Content-Type: application/json" \
  -d '{
    "embedding": [0.123, 0.456, ...],  # 1536 dimensions
    "limit": 10,
    "minSimilarity": 0.7
  }'
```

---

## 🐛 Troubleshooting

### PostgreSQL ne démarre pas

**Erreur:** `port 5432 already in use`

**Solution:**

```bash
# Trouver le processus qui utilise le port 5432
lsof -i :5432

# Tuer le processus (remplacer PID par le numéro)
kill -9 PID

# Ou changer le port dans infrastructure/database/.env
POSTGRES_PORT=5433
```

---

### Vault reste "sealed"

**Erreur:** `Vault is sealed`

**Solution:**

```bash
cd infra/vault

# Unseal Vault manuellement
docker-compose exec vault sh -c "cd /vault/scripts && ./init-vault.sh dev"

# Ou vérifier les logs
docker-compose logs vault
```

---

### Database API ne se connecte pas à PostgreSQL

**Erreur:** `Connection timeout`

**Solution:**

```bash
# Vérifier que PostgreSQL tourne
docker ps | grep postgres

# Vérifier la connexion directe
docker exec -it cartae-postgres psql -U cartae -d cartae -c "SELECT version();"

# Vérifier DATABASE_URL dans packages/database-api/.env
DATABASE_URL=postgresql://cartae:changeme_in_production@localhost:5432/cartae
```

---

### Frontend ne charge pas

**Erreur:** `Cannot GET /`

**Solution:**

```bash
cd apps/web

# Nettoyer le cache
rm -rf node_modules/.vite

# Relancer
pnpm dev
```

---

### npm install échoue avec "workspace:" errors

**Erreur:** `Unsupported URL Type "workspace:"`

**Solution:**

Utiliser **pnpm** au lieu de npm :

```bash
npm install -g pnpm
pnpm install
```

---

## 📚 Documentation Avancée

### Architecture Détaillée

- [Database Schema](./infrastructure/database/README.md)
- [Vault Setup](./infra/vault/README.md)
- [Database API](./packages/database-api/README.md)
- [Plugin System](./packages/plugin-system/README.md)
- [Cache Policies](./packages/core/src/storage/README.md)

### Développement

- [Contributing Guide](./CONTRIBUTING.md) *(à créer)*
- [Plugin Development](./packages/plugin-system/README.md)
- [Testing Guide](./tests/README.md) *(à créer)*

### Production

- [Deployment Guide](./DEPLOYMENT.md) *(à créer)*
- [Security Best Practices](./infra/vault/SECURITY-README.md)
- [Performance Tuning](./infrastructure/database/README.md)

---

## 🆘 Support

- **Issues GitHub:** https://github.com/guthubrx/cartae/issues
- **Discussions:** https://github.com/guthubrx/cartae/discussions
- **Email:** support@cartae.dev *(à configurer)*

---

## 📝 Licence

MIT License - Voir [LICENSE](./LICENSE)

---

**🎉 Félicitations ! Vous êtes prêt à utiliser Cartae !**

Pour les prochaines étapes, consultez la [Documentation](./README.md) ou explorez les [Plugins disponibles](./packages).
