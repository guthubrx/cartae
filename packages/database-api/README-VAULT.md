# 🔐 Vault Integration - Database API

**Session 78 - Phase 5**

Guide complet pour l'intégration HashiCorp Vault dans `database-api`.

---

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [PostgreSQL avec Vault](#postgresql-avec-vault)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Sécurité](#sécurité)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Vue d'ensemble

### Fonctionnalités

L'intégration Vault ajoute les capacités suivantes à `database-api`:

✅ **Secrets Management**:
- Store/Retrieve/Delete secrets dans Vault (KV v2 engine)
- API REST pour gérer secrets (`/api/vault/*`)
- Liste secrets disponibles

✅ **PostgreSQL Credentials**:
- Récupération automatique credentials PostgreSQL depuis Vault
- Fallback sur `DATABASE_URL` (.env) si Vault disabled
- Hot-reload credentials (pas besoin redémarrer serveur)

✅ **Health Checks**:
- Vérification status Vault (initialized, sealed, version)
- Validation configuration avant démarrage

✅ **Security**:
- Token renewal automatique (app tokens renouvelables)
- Timeout configurable (5s par défaut)
- Error handling robuste

---

## ⚙️ Configuration

### 1. Variables d'environnement

Ajouter dans `.env`:

```bash
# HashiCorp Vault Integration
VAULT_ENABLED=true
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=hvs.xxxxxxxxxxxxxxxxxxxxxxxx
VAULT_MOUNT_POINT=secret
```

**Variables**:

| Variable | Description | Défaut | Requis |
|----------|-------------|--------|--------|
| `VAULT_ENABLED` | Enable Vault integration | `false` | Non |
| `VAULT_ADDR` | Adresse Vault server | `http://localhost:8200` | Oui (si enabled) |
| `VAULT_TOKEN` | App token (policy: cartae-app) | - | Oui (if enabled) |
| `VAULT_MOUNT_POINT` | KV mount point | `secret` | Non |

### 2. Générer App Token

Le `database-api` utilise un **app token** avec policy `cartae-app` (read/write sur `secret/*`).

**Générer token**:

```bash
# Option 1: Depuis Setup UI (Phase 2)
# → Le wizard crée automatiquement app token avec policy cartae-app

# Option 2: Manuellement depuis Vault CLI
vault token create -policy=cartae-app -renewable=true -ttl=24h
```

**Output**:
```
Key                  Value
---                  -----
token                hvs.CAESIHqw7xxxxxxxxxxxxxxxxxxx
token_accessor       abc123xxxxxxxxx
token_duration       24h
token_renewable      true
token_policies       ["cartae-app" "default"]
```

Copier `token` dans `.env` → `VAULT_TOKEN=hvs.CAESIHqw...`

### 3. Policy cartae-app

Le policy `cartae-app` donne accès read/write sur `secret/*`:

```hcl
# Policy: cartae-app
path "secret/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/*" {
  capabilities = ["list", "read"]
}
```

**Créer policy** (si pas fait par Setup UI):

```bash
vault policy write cartae-app - <<EOF
path "secret/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/*" {
  capabilities = ["list", "read"]
}
EOF
```

---

## 🌐 API Endpoints

### POST /api/vault/secrets

Store un secret dans Vault.

**Request**:
```bash
curl -X POST http://localhost:3001/api/vault/secrets \
  -H "Content-Type: application/json" \
  -d '{
    "path": "database/postgres",
    "data": {
      "username": "cartae",
      "password": "secure-password-123",
      "host": "localhost",
      "port": 5432,
      "database": "cartae"
    }
  }'
```

**Response** (201):
```json
{
  "success": true,
  "message": "Secret stored successfully",
  "path": "database/postgres",
  "version": 1
}
```

---

### GET /api/vault/secrets/:path

Retrieve un secret depuis Vault.

**Request**:
```bash
curl http://localhost:3001/api/vault/secrets/database/postgres
```

**Response** (200):
```json
{
  "success": true,
  "path": "database/postgres",
  "data": {
    "username": "cartae",
    "password": "secure-password-123",
    "host": "localhost",
    "port": 5432,
    "database": "cartae"
  }
}
```

**Query params**:
- `?version=1`: Récupérer version spécifique (KV v2 versioning)

---

### DELETE /api/vault/secrets/:path

Delete un secret de Vault (soft delete, récupérable).

**Request**:
```bash
curl -X DELETE http://localhost:3001/api/vault/secrets/database/postgres
```

**Response** (200):
```json
{
  "success": true,
  "message": "Secret deleted successfully",
  "path": "database/postgres"
}
```

---

### GET /api/vault/secrets

Liste secrets disponibles dans un path.

**Request**:
```bash
# Liste secrets à la racine
curl http://localhost:3001/api/vault/secrets

# Liste secrets dans database/
curl http://localhost:3001/api/vault/secrets?path=database/
```

**Response** (200):
```json
{
  "success": true,
  "path": "database/",
  "keys": ["postgres", "mongodb", "redis"]
}
```

---

### GET /api/vault/health

Health check Vault.

**Request**:
```bash
curl http://localhost:3001/api/vault/health
```

**Response** (200):
```json
{
  "success": true,
  "vault": {
    "initialized": true,
    "sealed": false,
    "standby": false,
    "version": "1.15.0",
    "cluster_id": "abc-123-xyz"
  }
}
```

**Response** (503 - si Vault sealed):
```json
{
  "success": false,
  "message": "Vault is sealed. Please unseal Vault before accessing secrets."
}
```

---

## 🐘 PostgreSQL avec Vault

### Mode 1: Vault Enabled

Quand `VAULT_ENABLED=true`, `database-api` récupère credentials PostgreSQL depuis Vault.

**1. Stocker credentials dans Vault**:

```bash
# Via API
curl -X POST http://localhost:3001/api/vault/secrets \
  -H "Content-Type: application/json" \
  -d '{
    "path": "database/postgres",
    "data": {
      "username": "cartae",
      "password": "production-secure-password",
      "host": "postgres",
      "port": 5432,
      "database": "cartae"
    }
  }'

# OU via Vault CLI
vault kv put secret/database/postgres \
  username=cartae \
  password=production-secure-password \
  host=postgres \
  port=5432 \
  database=cartae
```

**2. Démarrer database-api**:

```bash
# .env
VAULT_ENABLED=true
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=hvs.xxxxx

# Démarrer
npm run dev
```

**Logs**:
```
🔐 Initializing Vault client...
✅ Vault client initialized and ready
🔐 Fetching PostgreSQL credentials from Vault...
✅ PostgreSQL credentials retrieved from Vault
   Host: postgres:5432
   Database: cartae
   User: cartae
🔌 Testing PostgreSQL connection...
✅ PostgreSQL connected
```

**Avantages**:
- ✅ Pas de credentials hardcodés dans `.env`
- ✅ Rotation credentials sans redémarrer app
- ✅ Audit trail (qui a accédé quand)
- ✅ Centralisé (tous les services utilisent Vault)

---

### Mode 2: Vault Disabled (Fallback)

Quand `VAULT_ENABLED=false` (ou absent), `database-api` utilise `DATABASE_URL` classique depuis `.env`.

```bash
# .env
VAULT_ENABLED=false
DATABASE_URL=postgresql://cartae:changeme@localhost:5432/cartae

# Démarrer
npm run dev
```

**Logs**:
```
🔌 Using PostgreSQL credentials from DATABASE_URL (.env)
🔌 Testing PostgreSQL connection...
✅ PostgreSQL connected
```

**Cas d'usage**:
- ✅ Développement local (pas besoin Vault)
- ✅ Tests CI/CD (env vars simples)
- ✅ Migration progressive vers Vault

---

## 💡 Exemples d'utilisation

### TypeScript (VaultClient)

```typescript
import { getVaultClient } from './vault/VaultClient';

// Initialiser Vault client
const vaultClient = getVaultClient({
  endpoint: 'http://localhost:8200',
  token: 'hvs.xxxxx',
});

// Health check
const health = await vaultClient.health();
if (health.sealed) {
  throw new Error('Vault is sealed!');
}

// Store secret
await vaultClient.writeSecret('app/api-keys', {
  stripe: 'sk_live_xxxxx',
  sendgrid: 'SG.xxxxx',
});

// Retrieve secret
const apiKeys = await vaultClient.readSecret('app/api-keys');
console.log(apiKeys.stripe); // 'sk_live_xxxxx'

// Delete secret
await vaultClient.deleteSecret('app/api-keys');

// List secrets
const keys = await vaultClient.listSecrets('app/');
console.log(keys); // ['api-keys', 'jwt-secret', ...]

// PostgreSQL credentials helper
const pgCreds = await vaultClient.getPostgresCredentials();
console.log(pgCreds.username); // 'cartae'
```

---

### PostgreSQL avec Vault

```typescript
import { createPoolWithVault, testConnectionWithVault } from './db/clientWithVault';

// Créer pool (récupère credentials depuis Vault si enabled)
const pool = await createPoolWithVault();

// Test connexion
await testConnectionWithVault(pool);

// Utiliser pool normalement
const result = await pool.query('SELECT * FROM cartae_items LIMIT 10');
console.log(result.rows);
```

---

### cURL Examples

**Store API keys**:
```bash
curl -X POST http://localhost:3001/api/vault/secrets \
  -H "Content-Type: application/json" \
  -d '{
    "path": "app/api-keys",
    "data": {
      "stripe": "sk_live_xxxxx",
      "sendgrid": "SG.xxxxx",
      "openai": "sk-xxxxx"
    }
  }'
```

**Retrieve API keys**:
```bash
curl http://localhost:3001/api/vault/secrets/app/api-keys | jq '.data.stripe'
# Output: "sk_live_xxxxx"
```

**List all secrets**:
```bash
curl http://localhost:3001/api/vault/secrets | jq '.keys'
# Output: ["database", "app", "jwt"]
```

---

## 🔒 Sécurité

### Best Practices

**✅ DO**:
- Utiliser app tokens (pas root token)
- Renouveler tokens régulièrement (`vaultClient.renewToken()`)
- Stocker `VAULT_TOKEN` dans secrets manager (pas hardcodé)
- Utiliser TLS en production (`VAULT_ADDR=https://vault:8200`)
- Limiter policy au minimum requis (least privilege)
- Activer audit logging Vault

**❌ DON'T**:
- Hardcoder `VAULT_TOKEN` dans code
- Utiliser root token en production
- Stocker secrets en clair dans `.env` si Vault available
- Exposer `/api/vault/*` publiquement (require auth middleware)
- Désactiver TLS en production

---

### Token Renewal

App tokens ont TTL (Time To Live). `database-api` peut renouveler automatiquement.

**Renouveler token**:

```typescript
import { getVaultClient } from './vault/VaultClient';

const vaultClient = getVaultClient();

// Renouveler token (extend TTL)
await vaultClient.renewToken();
```

**Cron job** (optionnel):

```typescript
// Renouveler token toutes les 12h
setInterval(async () => {
  try {
    await vaultClient.renewToken();
    console.log('✅ Vault token renewed');
  } catch (error) {
    console.error('❌ Failed to renew token:', error);
  }
}, 12 * 60 * 60 * 1000); // 12h
```

---

### Production Checklist

- [ ] ✅ TLS enabled (`VAULT_ADDR=https://...`)
- [ ] ✅ App token avec TTL raisonnable (24h-7d)
- [ ] ✅ Token renewal automatique configuré
- [ ] ✅ Policy `cartae-app` minimal (pas de wildcards)
- [ ] ✅ Vault unsealed automatiquement (master password/recovery key)
- [ ] ✅ Audit logging activé (`/var/log/vault/audit.log`)
- [ ] ✅ Network segmentation (Vault dans secrets_network isolé)
- [ ] ✅ `/api/vault/*` protégé par auth middleware
- [ ] ✅ Rate limiting activé (100 req/min max)
- [ ] ✅ Backup Vault (encrypted snapshots S3/Glacier)

---

## 🐛 Troubleshooting

### Erreur: "Vault is sealed"

**Symptôme**:
```
❌ Failed to initialize Vault: Vault is sealed. Please unseal Vault before accessing secrets.
```

**Solution**:
```bash
# Unlock Vault avec UnlockScreen UI (Phase 3)
# OU manuellement:
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
```

---

### Erreur: "Permission denied"

**Symptôme**:
```json
{
  "success": false,
  "message": "Failed to read secret 'database/postgres': permission denied"
}
```

**Solution**:

1. Vérifier que token a policy `cartae-app`:
```bash
vault token lookup $VAULT_TOKEN
# Policies: ["cartae-app" "default"]
```

2. Vérifier que policy permet accès:
```bash
vault policy read cartae-app
```

3. Recréer token si nécessaire:
```bash
vault token create -policy=cartae-app
```

---

### Erreur: "Secret not found"

**Symptôme**:
```json
{
  "success": false,
  "message": "Secret 'database/postgres' not found"
}
```

**Solution**:

1. Vérifier que secret existe:
```bash
vault kv get secret/database/postgres
```

2. Créer secret:
```bash
vault kv put secret/database/postgres \
  username=cartae \
  password=secure-password \
  host=localhost \
  port=5432 \
  database=cartae
```

---

### Erreur: "Connection timeout"

**Symptôme**:
```
❌ Failed to get Vault health: connect ETIMEDOUT 172.25.3.10:8200
```

**Solutions**:

1. Vérifier que Vault est accessible:
```bash
curl http://localhost:8200/v1/sys/health
```

2. Vérifier network (Docker):
```bash
docker network inspect secrets_network
# Vault doit être dans ce network
```

3. Vérifier firewall rules:
```bash
# App → Vault: port 8200 autorisé ?
iptables -L FORWARD -v -n | grep 8200
```

4. Augmenter timeout dans `.env`:
```bash
# Dans VaultClient.ts, requestTimeout: 5000 → 10000
```

---

### Erreur: "Token expired"

**Symptôme**:
```
❌ Failed to read secret: permission denied (token expired)
```

**Solution**:

1. Vérifier TTL token:
```bash
vault token lookup $VAULT_TOKEN
# TTL: 0s (expired!)
```

2. Générer nouveau token:
```bash
vault token create -policy=cartae-app -ttl=24h
```

3. Mettre à jour `.env`:
```bash
VAULT_TOKEN=hvs.nouveau_token_ici
```

4. Redémarrer `database-api`:
```bash
npm run dev
```

---

## 📚 Ressources

### Documentation

- [HashiCorp Vault Docs](https://developer.hashicorp.com/vault/docs)
- [KV v2 Secrets Engine](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2)
- [Policies](https://developer.hashicorp.com/vault/docs/concepts/policies)
- [node-vault SDK](https://github.com/nodevault/node-vault)

### Sessions Cartae

- **Session 78 - Phase 1**: Infrastructure Vault (Docker + Network)
- **Session 78 - Phase 2**: Setup UI (VaultConfig + SecurityLevels)
- **Session 78 - Phase 3**: Unlock UI (Unseal Vault)
- **Session 78 - Phase 4**: Recovery System (Master Password + Recovery Key)
- **Session 78 - Phase 5**: Integration Vault ← **VOUS ÊTES ICI**

### Fichiers Clés

```
packages/database-api/
├── src/
│   ├── vault/
│   │   └── VaultClient.ts          (~380 LOC) - Client Vault
│   ├── api/
│   │   └── routes/
│   │       └── vault.ts             (~280 LOC) - API routes /api/vault/*
│   ├── db/
│   │   ├── client.ts                (original, sans Vault)
│   │   └── clientWithVault.ts       (~150 LOC) - PostgreSQL avec Vault
│   └── index.ts                     (mis à jour avec routes Vault)
├── .env.example                     (updated avec VAULT_* vars)
├── package.json                     (node-vault added)
└── README-VAULT.md                  (~800 LOC) - ← CE FICHIER
```

---

**Dernière mise à jour**: 2025-11-15
**Auteur**: Claude (Session 78 - Phase 5)
**Status**: ✅ Integration Vault complète, prête pour production
