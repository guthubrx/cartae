# 🔐 HashiCorp Vault - Infrastructure Cartae

Gestionnaire de secrets sécurisé pour les credentials Office 365, Gmail, PostgreSQL et clés de chiffrement.

## 📋 Table des Matières

- [Architecture](#architecture)
- [Démarrage Rapide](#démarrage-rapide)
- [Mode Développement vs Production](#mode-développement-vs-production)
- [Scripts Utiles](#scripts-utiles)
- [Sécurité](#sécurité)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           Application Cartae                │
│  (packages/core + packages/ui + apps/web)   │
└────────────────┬────────────────────────────┘
                 │ HTTP API
                 │ Token: cartae-app policy
                 ▼
┌─────────────────────────────────────────────┐
│         HashiCorp Vault :8200               │
│  ┌───────────────────────────────────────┐  │
│  │   KV v2 Secrets Engine                │  │
│  │   - secret/office365/*                │  │
│  │   - secret/gmail/*                    │  │
│  │   - secret/database/*                 │  │
│  │   - secret/encryption/*               │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │   ACL Policies                        │  │
│  │   - cartae-app (read-only)            │  │
│  │   - cartae-admin (full access)        │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │   Audit Trail + Telemetry             │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                 │
                 ▼
          Volume Persistant
     (vault-data:/vault/file)
```

---

## 🚀 Démarrage Rapide

### 1. Copier la configuration

```bash
cd infra/vault
cp .env.example .env
```

### 2. Démarrer Vault (mode développement)

```bash
# Lancer Vault + Vault UI
docker-compose up -d

# Attendre que Vault soit prêt (10-15 secondes)
docker-compose logs -f vault

# Initialiser Vault avec secrets de test
docker-compose exec vault sh -c "cd /vault/scripts && ./init-vault.sh dev"
```

### 3. Vérifier le statut

```bash
# Health check
docker-compose exec vault sh -c "cd /vault/scripts && ./health-check.sh"

# Accéder à l'UI
open http://localhost:8200/ui
# Token: dev-only-token

# Alternative: Vault UI (djenriquez)
open http://localhost:8000
```

### 4. Tester l'accès aux secrets

```bash
# Lire un secret Office 365
docker-compose exec vault vault kv get secret/office365/tenant1

# Lister tous les secrets
docker-compose exec vault vault kv list secret/
```

---

## 🔀 Mode Développement vs Production

### Mode Développement (`VAULT_MODE=-dev`)

**Caractéristiques:**
- ✅ Auto-unseal (pas de clés à saisir)
- ✅ Token root simple: `dev-only-token`
- ✅ Secrets de test pré-créés
- ✅ Logs verbeux
- ⚠️ Données en mémoire (perdues au redémarrage)

**Workflow:**
```bash
# Démarrer
docker-compose up -d

# Initialiser
docker-compose exec vault sh -c "cd /vault/scripts && ./init-vault.sh dev"

# Utiliser
export VAULT_TOKEN=dev-only-token
vault kv get secret/office365/tenant1
```

---

### Mode Production (`VAULT_MODE=""`)

**Caractéristiques:**
- 🔐 Shamir Secret Sharing (5 clés, seuil de 3)
- 🔐 Données persistantes sur disque
- 🔐 Unseal manuel requis après chaque redémarrage
- 🔐 Audit trail activé
- 🔐 TLS/SSL (Phase 6)

**Workflow:**

#### 1. Initialisation (une seule fois)

```bash
# Modifier .env
VAULT_MODE=""

# Redémarrer Vault
docker-compose down
docker-compose up -d

# Initialiser (génère 5 clés + root token)
docker-compose exec vault sh -c "cd /vault/scripts && ./init-vault.sh prod"
```

**⚠️ CRITIQUE:** Sauvegardez les 5 unseal keys et le root token dans un coffre-fort sécurisé !

**Exemple de sortie:**
```
📋 Unseal Keys:
1	key1-aaaa-bbbb-cccc-dddd
2	key2-eeee-ffff-gggg-hhhh
3	key3-iiii-jjjj-kkkk-llll
4	key4-mmmm-nnnn-oooo-pppp
5	key5-qqqq-rrrr-ssss-tttt

🔑 Root Token:
hvs.XXXXXXXXXXXXXXXXXXXX
```

#### 2. Unseal après redémarrage

Vault est **sealed** (verrouillé) après chaque redémarrage. Vous devez le déverrouiller avec 3 clés sur 5 :

```bash
# Vérifier le statut
vault status
# Sealed: true

# Unseal (répéter 3 fois avec 3 clés différentes)
vault operator unseal key1-aaaa-bbbb-cccc-dddd
vault operator unseal key2-eeee-ffff-gggg-hhhh
vault operator unseal key3-iiii-jjjj-kkkk-llll

# Vérifier le statut
vault status
# Sealed: false
```

#### 3. Créer un token pour l'application

```bash
export VAULT_TOKEN=hvs.XXXXXXXXXXXXXXXXXXXX  # Root token

# Créer token avec policy cartae-app
vault token create \
  -policy=cartae-app \
  -ttl=720h \
  -renewable=true

# Utiliser le token généré dans l'application
```

---

## 🛠️ Scripts Utiles

### `init-vault.sh [dev|prod]`

Initialise Vault, configure les policies et crée les secrets de test (dev) ou les clés de production (prod).

```bash
# Mode dev
docker-compose exec vault sh -c "cd /vault/scripts && ./init-vault.sh dev"

# Mode prod
docker-compose exec vault sh -c "cd /vault/scripts && ./init-vault.sh prod"
```

---

### `health-check.sh`

Vérifie l'état de Vault (initialized, sealed, version).

```bash
docker-compose exec vault sh -c "cd /vault/scripts && ./health-check.sh"
```

**Sortie attendue:**
```
🔍 Health Check Vault...
📊 Vault Status:
   Version: 1.17.0
   Initialized: true
   Sealed: false
   Standby: false

✅ Vault est opérationnel !
```

---

### `rotate-secrets.sh <secret-path>`

Rotate (renouvelle) un secret tout en conservant les versions précédentes.

```bash
# Rotation de la clé de chiffrement
docker-compose exec vault sh -c "cd /vault/scripts && ./rotate-secrets.sh secret/data/encryption/master-key"

# Lire la version actuelle (v2)
vault kv get secret/encryption/master-key

# Lire l'ancienne version (v1)
vault kv get -version=1 secret/encryption/master-key
```

---

## 🔒 Sécurité

### Policies ACL

**`cartae-app-policy.hcl`** (Application Cartae):
- ✅ Lecture seule des secrets
- ✅ Metadata et health check
- ❌ Pas de suppression ni modification

**`cartae-admin-policy.hcl`** (Administrateurs):
- ✅ Accès complet aux secrets (CRUD)
- ✅ Gestion des policies et auth methods
- ✅ Seal/unseal
- ✅ Audit logs

### Rotation des Secrets

**Pourquoi ?** Limiter l'impact d'une fuite de credentials.

**Fréquence recommandée:**
- Clés de chiffrement: Tous les 90 jours
- Credentials OAuth: Tous les 30 jours
- Database passwords: Tous les 30 jours

**Workflow:**
1. Générer nouveau secret avec `rotate-secrets.sh`
2. Mettre à jour l'application avec nouvelle version
3. Vérifier que l'application fonctionne
4. Optionnel: Supprimer anciennes versions avec `vault kv destroy`

### Audit Trail

Activé en Phase 6. Tous les accès aux secrets sont loggés :

```bash
# Activer audit trail
vault audit enable file file_path=/vault/logs/audit.log

# Consulter les logs
docker-compose exec vault cat /vault/logs/audit.log | jq .
```

---

## 🐛 Troubleshooting

### Vault ne démarre pas

```bash
# Vérifier les logs
docker-compose logs vault

# Vérifier les permissions du volume
docker volume inspect vault_vault-data

# Nettoyer et recréer
docker-compose down -v
docker-compose up -d
```

---

### Vault est "sealed" après redémarrage

**Normal en mode production !** Vault se scelle automatiquement pour sécurité.

```bash
# Unseal avec 3 clés
vault operator unseal <key-1>
vault operator unseal <key-2>
vault operator unseal <key-3>
```

---

### "permission denied" lors de l'accès aux secrets

```bash
# Vérifier le token actuel
vault token lookup

# Vérifier les policies attachées
vault token lookup -format=json | jq -r '.data.policies'

# Créer un nouveau token avec bonne policy
vault token create -policy=cartae-app
```

---

### Oublié les unseal keys

**Si vous avez perdu les unseal keys, vous NE POUVEZ PAS déverrouiller Vault.**

**Solutions:**
1. Restaurer depuis un backup des clés (coffre-fort, password manager)
2. Réinitialiser Vault (⚠️ PERTE DE TOUTES LES DONNÉES)

```bash
# ⚠️ DESTRUCTIF - Réinitialisation complète
docker-compose down -v
docker-compose up -d
docker-compose exec vault sh -c "cd /vault/scripts && ./init-vault.sh prod"
```

---

## 📚 Ressources

- [HashiCorp Vault Docs](https://developer.hashicorp.com/vault/docs)
- [KV Secrets Engine v2](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2)
- [Vault Policies](https://developer.hashicorp.com/vault/docs/concepts/policies)
- [Shamir Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing)

---

## 🎯 Prochaines Étapes (Phases 2-7)

- **Phase 2:** UI de Setup (SecurityLevelSelector, SetupWizard)
- **Phase 3:** UI de Unlock (UnlockScreen avec recovery)
- **Phase 4:** Système de Recovery (master password, Encryptor)
- **Phase 5:** Intégration avec database-api + PostgreSQL
- **Phase 6:** Sécurité Production (TLS, réseau isolé)
- **Phase 7:** Polish (animations, tests E2E, documentation)
