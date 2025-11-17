# Guide de Démarrage Rapide - Cartae Enterprise

**Version:** 1.0
**Date:** 2025-11-17
**Public:** Administrateurs système et DevOps

---

## Introduction

**Cartae Enterprise** est une plateforme complète de gestion de plugins et marketplace, conçue pour les organisations qui nécessitent :

- **Multi-tenant (multi-locataire)** : Isolation complète des données entre organisations
- **Branding dynamique** : Personnalisation de l'interface par tenant
- **Sécurité renforcée** : OWASP Top 10 compliance, rate limiting avancé, audit logging
- **Monitoring en temps réel** : Prometheus, Grafana, alertes automatiques
- **Haute disponibilité** : Support Redis, PostgreSQL, Cloudflare Workers

Cette édition est optimisée pour les déploiements production avec des SLAs exigeants.

---

## Prérequis

### Infrastructure Requise

| Composant         | Version Minimum     | Recommandé                   |
| ----------------- | ------------------- | ---------------------------- |
| Docker            | 20.10+              | 24.0+                        |
| Docker Compose    | 1.29+               | 2.20+                        |
| PostgreSQL        | 14+                 | 16+ (avec SSL/TLS)           |
| Redis             | 6.2+                | 7.2+ (avec persistence)      |
| HashiCorp Vault   | 1.12+               | 1.15+ (avec auto-unseal)     |
| Node.js (dev)     | 18 LTS              | 20 LTS                       |
| pnpm (dev)        | 8.0+                | 8.10+                        |

### Ressources Serveur (Production)

| Service     | CPU  | RAM   | Stockage | Notes                              |
| ----------- | ---- | ----- | -------- | ---------------------------------- |
| API         | 2 vCPU | 4 GB  | 20 GB    | Scalable horizontalement           |
| PostgreSQL  | 4 vCPU | 8 GB  | 100 GB   | SSD recommandé (IOPS élevé)        |
| Redis       | 1 vCPU | 2 GB  | 10 GB    | Persistence RDB + AOF              |
| Vault       | 1 vCPU | 2 GB  | 20 GB    | Backup automatique requis          |
| Monitoring  | 2 vCPU | 4 GB  | 50 GB    | Prometheus + Grafana + Loki        |

### Réseau

- **Ports ouverts** : 443 (HTTPS), 5432 (PostgreSQL interne), 6379 (Redis interne)
- **Certificat TLS** : Valide (Let's Encrypt ou certificat d'entreprise)
- **DNS** : Résolution A/AAAA pour `api.votre-domaine.com`

---

## Installation Rapide (5 étapes)

### Étape 1 : Cloner le Dépôt

```bash
# Cloner le repository
git clone https://github.com/votre-org/cartae-enterprise.git
cd cartae-enterprise

# Checkout la branche stable
git checkout main
```

### Étape 2 : Configurer les Variables d'Environnement

```bash
# Copier le template de configuration
cp .env.local.example .env.local

# Éditer la configuration (voir détails ci-dessous)
nano .env.local
```

**Fichier `.env.local` - Configuration Minimum :**

```bash
# ============================================
# BRANDING ENTREPRISE
# ============================================
VITE_APP_NAME="Votre Entreprise Marketplace"
VITE_LOGO_URL="https://cdn.votre-domaine.com/logo.png"
VITE_PRIMARY_COLOR="#0066CC"
VITE_COMPANY_NAME="Votre Entreprise Inc."

# ============================================
# BASE DE DONNÉES
# ============================================
DATABASE_URL="postgresql://cartae:PASSWORD_SECURISE@postgres:5432/cartae_production?sslmode=require"
DATABASE_POOL_SIZE=20

# ============================================
# REDIS
# ============================================
REDIS_URL="redis://redis:6379/0"
REDIS_PASSWORD="PASSWORD_SECURISE_REDIS"

# ============================================
# VAULT (Gestion des Secrets)
# ============================================
VAULT_ADDR="http://vault:8200"
VAULT_TOKEN="s.VOTRE_TOKEN_VAULT"
VAULT_NAMESPACE="cartae-production"

# ============================================
# SÉCURITÉ
# ============================================
JWT_SECRET_KEY="GENERER_AVEC_openssl_rand_base64_64"
API_KEY_ADMIN="GENERER_AVEC_openssl_rand_hex_32"

# Rate Limiting
RATE_LIMIT_DEFAULT=100           # Requêtes/minute par défaut
RATE_LIMIT_BACKEND="redis"       # Options: memory, redis, kv
ALLOWED_ORIGINS="https://app.votre-domaine.com,https://admin.votre-domaine.com"

# ============================================
# MONITORING
# ============================================
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD="PASSWORD_SECURISE_GRAFANA"
ALERTMANAGER_SLACK_WEBHOOK="https://hooks.slack.com/services/VOTRE/WEBHOOK/ICI"
```

**Génération des secrets sécurisés :**

```bash
# JWT Secret (64 bytes en base64)
openssl rand -base64 64

# API Key Admin (32 bytes en hexadécimal)
openssl rand -hex 32

# Password PostgreSQL (32 caractères alphanumériques)
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

### Étape 3 : Démarrer l'Infrastructure de Base

```bash
# Démarrer PostgreSQL + Redis + Vault
docker-compose -f infra/docker/docker-compose.base.yml up -d

# Vérifier que les services sont démarrés
docker-compose -f infra/docker/docker-compose.base.yml ps
```

**Sortie attendue :**

```
NAME                STATUS              PORTS
cartae-postgres     Up 10 seconds       0.0.0.0:5432->5432/tcp
cartae-redis        Up 10 seconds       0.0.0.0:6379->6379/tcp
cartae-vault        Up 10 seconds       0.0.0.0:8200->8200/tcp
```

### Étape 4 : Initialiser Vault et la Base de Données

**Initialiser HashiCorp Vault :**

```bash
# Initialiser Vault (une seule fois)
docker exec -it cartae-vault vault operator init

# IMPORTANT : Sauvegarder les 5 Unseal Keys et le Root Token
# Exemple de sortie :
# Unseal Key 1: aB1cD2eF3...
# Unseal Key 2: gH4iJ5kL6...
# ...
# Initial Root Token: s.aBcDeFgHiJkLmNoP

# Unsealer Vault (3 clés sur 5 requises)
docker exec -it cartae-vault vault operator unseal
# Répéter 3 fois avec 3 clés différentes

# Vérifier le statut
docker exec -it cartae-vault vault status
```

**Exécuter les migrations de base de données :**

```bash
# Installer les dépendances (si pas encore fait)
pnpm install

# Exécuter les migrations Prisma
pnpm --filter @cartae/database-api prisma migrate deploy

# Vérifier que les tables sont créées
docker exec -it cartae-postgres psql -U cartae -d cartae_production -c "\dt"
```

**Sortie attendue (tables créées) :**

```
             List of relations
 Schema |       Name        | Type  | Owner
--------+-------------------+-------+--------
 public | tenants           | table | cartae
 public | plugins           | table | cartae
 public | users             | table | cartae
 public | audit_logs        | table | cartae
 ...
```

### Étape 5 : Démarrer l'API et le Frontend

```bash
# Démarrer l'API Cartae
docker-compose -f infra/docker/docker-compose.gateway.yml up -d

# Vérifier les logs
docker-compose -f infra/docker/docker-compose.gateway.yml logs -f cartae-api
```

**Vérifier que l'API répond :**

```bash
# Health check
curl https://api.votre-domaine.com/health

# Sortie attendue :
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-11-17T10:30:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "vault": "ok"
  }
}
```

---

## Configuration Multi-Tenant

### Créer le Premier Tenant (Organisation)

**Via API Admin :**

```bash
# Créer le tenant principal
curl -X POST https://api.votre-domaine.com/api/v1/admin/tenants \
  -H "X-API-Key: VOTRE_API_KEY_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "tenant-acme-corp",
    "name": "ACME Corporation",
    "tier": "enterprise",
    "features": {
      "multiUser": true,
      "analytics": true,
      "customBranding": true,
      "sso": true,
      "prioritySupport": true
    },
    "branding": {
      "appName": "ACME Marketplace",
      "logoUrl": "https://cdn.acme.com/logo.png",
      "primaryColor": "#FF6600",
      "faviconUrl": "https://cdn.acme.com/favicon.ico"
    },
    "quotas": {
      "maxUsers": 500,
      "maxPlugins": 1000,
      "rateLimitPerMinute": 10000
    }
  }'
```

**Réponse attendue :**

```json
{
  "success": true,
  "data": {
    "id": "tenant-acme-corp",
    "name": "ACME Corporation",
    "tier": "enterprise",
    "status": "active",
    "createdAt": "2025-11-17T10:35:00Z"
  }
}
```

### Configurer le Branding par Tenant

Le branding se configure via les variables d'environnement ou dynamiquement par tenant :

**Option 1 : Variables d'environnement globales (par défaut pour tous les tenants) :**

```bash
# Dans .env.local
VITE_APP_NAME="Cartae Marketplace"
VITE_LOGO_URL="https://cdn.cartae.com/logo.png"
VITE_PRIMARY_COLOR="#0066CC"
```

**Option 2 : Branding dynamique par tenant (surcharge les variables globales) :**

```bash
# Mettre à jour le branding pour un tenant spécifique
curl -X PATCH https://api.votre-domaine.com/api/v1/admin/tenants/tenant-acme-corp \
  -H "X-API-Key: VOTRE_API_KEY_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "branding": {
      "appName": "ACME Internal Tools",
      "logoUrl": "https://cdn.acme.com/internal-logo.png",
      "primaryColor": "#CC0000",
      "secondaryColor": "#333333",
      "fontFamily": "Roboto, sans-serif"
    }
  }'
```

**Le frontend détecte automatiquement le tenant via :**

1. Header HTTP `X-Tenant-ID` (priorité haute)
2. Sous-domaine (ex: `acme.cartae.com` → `tenant-acme-corp`)
3. Paramètre query `?tenant=tenant-acme-corp`

### Tester l'Isolation Multi-Tenant

```bash
# Créer un plugin pour tenant A
curl -X POST https://api.votre-domaine.com/api/v1/plugins \
  -H "X-Tenant-ID: tenant-a" \
  -H "Authorization: Bearer TOKEN_TENANT_A" \
  -H "Content-Type: application/json" \
  -d '{"name": "Plugin A", "version": "1.0.0"}'

# Tenter de lire depuis tenant B (doit échouer)
curl https://api.votre-domaine.com/api/v1/plugins \
  -H "X-Tenant-ID: tenant-b" \
  -H "Authorization: Bearer TOKEN_TENANT_B"

# Sortie attendue : Liste vide (isolation garantie)
{
  "success": true,
  "data": [],
  "meta": { "total": 0 }
}
```

---

## Vérification de l'Installation

### 1. Health Checks

```bash
# API Health
curl https://api.votre-domaine.com/health

# PostgreSQL
docker exec -it cartae-postgres pg_isready -U cartae

# Redis
docker exec -it cartae-redis redis-cli ping

# Vault
docker exec -it cartae-vault vault status
```

### 2. Vérifier les Logs

```bash
# Logs API (dernières 100 lignes)
docker-compose -f infra/docker/docker-compose.gateway.yml logs --tail=100 cartae-api

# Logs PostgreSQL
docker logs cartae-postgres --tail=50

# Logs Redis
docker logs cartae-redis --tail=50
```

**Logs sains (pas d'erreurs) :**

```
[INFO] Server started on port 8787
[INFO] Database connection established
[INFO] Redis connection established
[INFO] Vault connection established
[INFO] Rate limiter initialized (backend: redis)
[INFO] Security headers enabled
```

### 3. Tester les Endpoints Critiques

```bash
# Liste des tenants (admin)
curl https://api.votre-domaine.com/api/v1/admin/tenants \
  -H "X-API-Key: VOTRE_API_KEY_ADMIN"

# Liste des plugins (utilisateur)
curl https://api.votre-domaine.com/api/v1/plugins \
  -H "X-Tenant-ID: tenant-acme-corp"

# Métriques Prometheus (monitoring)
curl https://api.votre-domaine.com/metrics
```

---

## Prochaines Étapes

### 1. Configurer le Monitoring

Voir **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** pour :

- Installer Prometheus + Grafana
- Configurer les dashboards Security Overview, API Performance
- Configurer les alertes Slack/Email

### 2. Renforcer la Sécurité

Voir **[SECURITY-CONFIGURATION.md](./SECURITY-CONFIGURATION.md)** pour :

- Configurer CORS restrictif
- Personnaliser les rate limits par endpoint
- Activer l'audit logging
- Configurer Fail2ban

### 3. Optimiser les Performances

- **Bundle Splitting** : Lazy loading déjà activé (Session 84)
- **CDN** : Configurer Cloudflare ou CloudFront pour `/static/*`
- **Caching** : Redis cache déjà activé pour les queries fréquentes
- **PostgreSQL Tuning** : Ajuster `shared_buffers`, `work_mem` selon charge

### 4. Backup et Disaster Recovery

```bash
# Backup automatique PostgreSQL (cron quotidien)
docker exec cartae-postgres pg_dump -U cartae cartae_production | \
  gzip > /backups/cartae-$(date +%Y%m%d).sql.gz

# Backup Vault (secrets)
docker exec cartae-vault vault operator raft snapshot save /vault/backups/snapshot-$(date +%Y%m%d).snap

# Synchroniser vers S3/R2
aws s3 sync /backups s3://votre-bucket/cartae-backups/
```

### 5. Scaling Horizontal

```bash
# Augmenter le nombre de workers API
docker-compose -f infra/docker/docker-compose.gateway.yml up -d --scale cartae-api=3

# Load balancing automatique via Traefik (déjà configuré)
```

---

## Support et Documentation

- **Documentation complète** : `/docs/` dans le repository
- **Troubleshooting** : [FAQ-TROUBLESHOOTING.md](./FAQ-TROUBLESHOOTING.md)
- **Sécurité** : [SECURITY-CONFIGURATION.md](./SECURITY-CONFIGURATION.md)
- **Monitoring** : [MONITORING-GUIDE.md](./MONITORING-GUIDE.md)
- **Multi-tenant** : [MULTI-TENANT-GUIDE.md](./MULTI-TENANT-GUIDE.md)

**Contacts :**

- Support technique : support@cartae.com
- Incidents critiques : incidents@cartae.com (PagerDuty)
- Slack communautaire : [cartae-community.slack.com](https://cartae-community.slack.com)

---

**Félicitations !** Vous avez déployé Cartae Enterprise avec succès. 🎉
