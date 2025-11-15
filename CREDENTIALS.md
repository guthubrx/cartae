# 🔐 Cartae - Credentials & Access Guide

**⚠️ IMPORTANT : Ce fichier contient des credentials de DÉVELOPPEMENT UNIQUEMENT.**
**NE JAMAIS commiter ce fichier avec des credentials de production !**

---

## 📍 Où Trouver Vos Tokens et Mots de Passe

### 🗂️ **1. Fichiers de Configuration Locaux**

| Fichier | Contenu | Localisation |
|---------|---------|--------------|
| **PostgreSQL** | DB credentials | `/infra/database/docker-compose.yml` |
| **Vault** | Token root, config | `/infra/vault/.env` |
| **Database API** | Connection string, Vault token | `/packages/database-api/.env` |
| **Frontend** | API endpoints | `/apps/web/.env` |

---

### 🔒 **2. HashiCorp Vault (Secrets Centralisés)**

**Accès Vault UI :**
- **URL :** http://localhost:8000
- **Token :** `dev-only-token` (voir `/infra/vault/.env`)

**Secrets stockés dans Vault :**

| Path Vault | Contenu | Créé par |
|------------|---------|----------|
| `secret/data/test` | Test password | Setup initial |
| `secret/data/cartae/postgres` | Credentials PostgreSQL | Setup full stack |
| `secret/data/plugins/gmail/*` | OAuth tokens Gmail | Plugin Gmail |
| `secret/data/plugins/office365/*` | OAuth tokens Office365 | Plugin Office365 |

**Comment lire un secret depuis Vault :**
```bash
# Via curl
curl -s http://localhost:8200/v1/secret/data/cartae/postgres \
  -H 'X-Vault-Token: dev-only-token' | jq '.data.data'

# Via Database API
curl -s http://localhost:3001/api/vault/secrets/cartae/postgres
```

---

### 🗄️ **3. PostgreSQL (Base de Données)**

**Accès direct (psql) :**
```bash
psql postgresql://cartae:cartae_dev_password@localhost:5432/cartae
```

**Accès via pgAdmin :**
- **URL :** http://localhost:5050
- **Email :** `admin@cartae.dev`
- **Password :** `admin`

**Connexion depuis pgAdmin vers PostgreSQL :**
- **Host :** `cartae-db` (nom du conteneur Docker)
- **Port :** `5432`
- **Database :** `cartae`
- **Username :** `cartae`
- **Password :** `cartae_dev_password`

---

## 🔑 **Credentials de Développement (TOUS LES ENVIRONNEMENTS)**

### **PostgreSQL**
```bash
Host:     localhost
Port:     5432
Database: cartae
Username: cartae
Password: cartae_dev_password
```

**Connection String (pour Database API) :**
```
postgresql://cartae:cartae_dev_password@localhost:5432/cartae
```

---

### **HashiCorp Vault**
```bash
URL:   http://localhost:8200
Token: dev-only-token
Mode:  -dev (auto-unseal, in-memory storage)
```

**⚠️ Mode dev = Données perdues au redémarrage !**
Pour persister les secrets en dev, passer en mode production (voir SECURITY-ARCHITECTURE.md).

---

### **pgAdmin**
```bash
URL:      http://localhost:5050
Email:    admin@cartae.dev
Password: admin
```

---

### **Vault UI (Interface Web Vault)**
```bash
URL:   http://localhost:8000
Token: dev-only-token (auto-rempli depuis VAULT_URL_DEFAULT)
```

---

### **Database API**
```bash
URL:         http://localhost:3001
Health:      http://localhost:3001/health
Endpoints:   http://localhost:3001/api/*
Environment: development
```

**Credentials utilisés par l'API :**
- **PostgreSQL** : `DATABASE_URL` (voir `/packages/database-api/.env`)
- **Vault** : `VAULT_ADDR` + `VAULT_TOKEN` (voir `/packages/database-api/.env`)

---

### **Frontend (Vite)**
```bash
URL:         http://localhost:5173
API Backend: http://localhost:3001 (configuré dans VITE_API_URL)
Environment: development
```

---

## 🌐 **URLs de Tous les Services**

| Service | URL | Credentials | Status |
|---------|-----|-------------|--------|
| **Frontend** | http://localhost:5173 | - | ✅ Running |
| **Database API** | http://localhost:3001 | - | ✅ Running |
| **Vault API** | http://localhost:8200 | Token: `dev-only-token` | ✅ Running |
| **Vault UI** | http://localhost:8000 | Token: `dev-only-token` | ✅ Running |
| **PostgreSQL** | localhost:5432 | cartae / cartae_dev_password | ✅ Running |
| **pgAdmin** | http://localhost:5050 | admin@cartae.dev / admin | ✅ Running |

---

## 🧪 **Tests Rapides de Connexion**

### **1. Tester PostgreSQL**
```bash
# Via psql (CLI)
psql postgresql://cartae:cartae_dev_password@localhost:5432/cartae -c "SELECT version();"

# Via Database API
curl -s http://localhost:3001/health | jq '.'
```

### **2. Tester Vault**
```bash
# Health check
curl -s http://localhost:8200/v1/sys/health | jq '.'

# Lire un secret
curl -s http://localhost:8200/v1/secret/data/cartae/postgres \
  -H 'X-Vault-Token: dev-only-token' | jq '.data.data'
```

### **3. Tester Database API → Vault Integration**
```bash
# Créer un secret via API
curl -s -X POST http://localhost:3001/api/vault/secrets \
  -H 'Content-Type: application/json' \
  -d '{"path":"test/api-integration","data":{"key":"value"}}'

# Lire le secret
curl -s http://localhost:3001/api/vault/secrets/test/api-integration
```

---

## 🔒 **Sécurité : Différences Dev vs Production**

| Aspect | Développement | Production |
|--------|---------------|------------|
| **Vault Mode** | `-dev` (in-memory) | `server` (persistent, Shamir seal) |
| **Vault Token** | `dev-only-token` (hardcodé) | Tokens dynamiques (AppRole, JWT) |
| **PostgreSQL Password** | `cartae_dev_password` | Généré aléatoirement (32+ chars) |
| **TLS/HTTPS** | Désactivé (HTTP) | Activé partout (Let's Encrypt) |
| **Secrets Location** | Fichiers `.env` | Vault uniquement (jamais filesystem) |
| **Audit Logs** | Console seulement | PostgreSQL + fichiers rotatifs |
| **Rate Limiting** | Désactivé | Activé (10 req/s par user) |

---

## 🚨 **Règles de Sécurité Strictes**

### ✅ **À FAIRE (Bonnes Pratiques)**
1. **Utiliser Vault** pour tous les secrets (jamais hardcoder)
2. **Rotater les secrets** régulièrement (tous les 90 jours)
3. **Logs d'audit** activés pour toutes les opérations sensibles
4. **HTTPS/TLS** activé partout en production
5. **Backups chiffrés** (AES-256) avant upload S3
6. **Principe du moindre privilège** (chaque plugin = permissions minimales)

### ❌ **À NE JAMAIS FAIRE**
1. ❌ Commiter `.env` ou `CREDENTIALS.md` avec secrets prod
2. ❌ Utiliser `dev-only-token` en production
3. ❌ Partager credentials via email/Slack/chat
4. ❌ Réutiliser mots de passe entre environnements
5. ❌ Désactiver TLS/HTTPS en production
6. ❌ Logger secrets dans console/fichiers (sanitize avant log)

---

## 📋 **Checklist Setup Initial**

Après avoir cloné le repo, vérifiez que vous avez bien :

- [ ] ✅ Créé `/infra/vault/.env` depuis `.env.example`
- [ ] ✅ Créé `/packages/database-api/.env` avec `DATABASE_URL`
- [ ] ✅ Démarré PostgreSQL (`docker-compose up -d` dans `/infra/database`)
- [ ] ✅ Démarré Vault (`docker-compose up -d` dans `/infra/vault`)
- [ ] ✅ Testé connexion PostgreSQL (psql ou pgAdmin)
- [ ] ✅ Testé connexion Vault (curl health check)
- [ ] ✅ Stocké secrets PostgreSQL dans Vault (`secret/data/cartae/postgres`)
- [ ] ✅ Démarré Database API (`pnpm dev` dans `/packages/database-api`)
- [ ] ✅ Démarré Frontend (`pnpm dev` dans `/apps/web`)

---

## 🆘 **En Cas de Problème**

### **Problème : "Cannot connect to PostgreSQL"**
```bash
# Vérifier que le conteneur tourne
docker ps | grep cartae-db

# Tester connexion
psql postgresql://cartae:cartae_dev_password@localhost:5432/cartae

# Voir les logs
docker logs cartae-db --tail 50
```

### **Problème : "Vault sealed / not accessible"**
```bash
# Vérifier statut
curl http://localhost:8200/v1/sys/health

# Redémarrer Vault
cd infra/vault
docker-compose restart vault

# Voir les logs
docker logs cartae-vault --tail 50
```

### **Problème : "Database API can't connect to Vault"**
```bash
# Vérifier config .env
cat packages/database-api/.env | grep VAULT

# Doit afficher:
# VAULT_ADDR=http://localhost:8200
# VAULT_TOKEN=dev-only-token

# Tester depuis l'API
curl http://localhost:3001/api/vault/health
```

---

## 📞 **Support**

**Documentation :**
- [SECURITY-ARCHITECTURE.md](./SECURITY-ARCHITECTURE.md) - Architecture sécurité
- [GETTING-STARTED.md](./GETTING-STARTED.md) - Guide de démarrage
- [QUICKSTART.md](./QUICKSTART.md) - Installation rapide (5 min)

**Issues GitHub :**
https://github.com/guthubrx/cartae/issues

---

**🔐 Rappel :** Ces credentials sont pour DÉVELOPPEMENT UNIQUEMENT.
En production, utilisez des secrets générés aléatoirement et stockés dans Vault.
