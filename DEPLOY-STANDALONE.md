# Guide de Déploiement Standalone - Cartae

**Version:** 1.0.0
**Dernière mise à jour:** 15 Novembre 2025
**Public:** Utilisateur final (le "p'tit gars moyen")

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis Système](#prérequis-système)
3. [Installation Rapide (1-click)](#installation-rapide-1-click)
4. [Configuration Détaillée](#configuration-détaillée)
5. [Premier Lancement](#premier-lancement)
6. [Gestion Quotidienne](#gestion-quotidienne)
7. [Backup & Restore](#backup--restore)
8. [Mise à Jour](#mise-à-jour)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Vue d'ensemble

**Cartae Standalone** est la version auto-hébergée de Cartae, conçue pour fonctionner sur un seul serveur (machine locale, VPS, serveur dédié) avec Docker Compose.

### Profils Disponibles

| Profil      | RAM Requise | Services Inclus                     | Cas d'Usage                        |
|-------------|-------------|-------------------------------------|------------------------------------|
| **Minimal** | 1 GB        | PostgreSQL, API, Frontend           | Développement, tests locaux        |
| **Standard** (recommandé) | 2 GB | + Redis, Vault, Backups, Fail2ban | Production simple (1-10 users)   |
| **Full**    | 4 GB        | + Monitoring (Prometheus, Grafana)  | Production avancée (10+ users)     |

**Recommandation:** Utilisez le profil **Standard** pour la plupart des cas d'usage.

---

## Prérequis Système

### Logiciels Requis

1. **Docker** (version 20.10+)
   - **macOS:** [Docker Desktop pour Mac](https://docs.docker.com/desktop/install/mac-install/)
   - **Linux:** [Docker Engine](https://docs.docker.com/engine/install/)
   - **Windows:** [Docker Desktop pour Windows](https://docs.docker.com/desktop/install/windows-install/)

2. **Docker Compose** (version 2.0+)
   - Inclus avec Docker Desktop
   - Linux: `sudo apt install docker-compose-plugin` (Ubuntu/Debian)

### Ressources Minimales

| Composant      | Minimal | Standard (Recommandé) | Full       |
|----------------|---------|-----------------------|------------|
| CPU            | 1 core  | 2 cores               | 4 cores    |
| RAM            | 1 GB    | 2 GB                  | 4 GB       |
| Stockage       | 10 GB   | 20 GB                 | 50 GB      |
| Réseau         | 1 Mbps  | 10 Mbps               | 100 Mbps   |

### Système d'exploitation

- ✅ **macOS** 10.15+ (Catalina ou supérieur)
- ✅ **Linux** (Ubuntu 20.04+, Debian 11+, CentOS 8+, Fedora 35+)
- ✅ **Windows** 10/11 avec WSL2 activé

### Ports Utilisés

| Service       | Port  | Description                          |
|---------------|-------|--------------------------------------|
| Frontend      | 5173  | Interface utilisateur (React)        |
| API           | 3001  | API REST (Backend)                   |
| Traefik       | 80    | Reverse proxy (HTTP)                 |
| Traefik HTTPS | 443   | Reverse proxy (HTTPS, production)    |
| Vault UI      | 8200  | Interface HashiCorp Vault            |
| PostgreSQL    | 5432  | Base de données (interne uniquement) |
| Redis         | 6379  | Cache (interne uniquement)           |

**Note:** Les ports 5432 et 6379 ne sont **pas exposés** publiquement (sécurité).

---

## Installation Rapide (1-click)

### Étape 1: Télécharger Cartae

```bash
# Clone le repository
git clone https://github.com/cartae/cartae.git
cd cartae
```

### Étape 2: Lancer le script d'installation

```bash
# Installer avec le profil Standard (recommandé)
./deploy-standalone.sh standard

# Ou choisir un autre profil:
# ./deploy-standalone.sh minimal
# ./deploy-standalone.sh full
```

### Étape 3: Attendre la fin du déploiement

Le script va automatiquement:

1. ✅ Vérifier Docker et Docker Compose
2. ✅ Générer les secrets aléatoires (`.env`)
3. ✅ Télécharger les images Docker
4. ✅ Démarrer tous les services
5. ✅ Vérifier la santé des services (health checks)

**Durée:** 3-5 minutes (selon vitesse Internet).

### Étape 4: Accéder à Cartae

Ouvrez votre navigateur et allez sur:

```
http://localhost:5173
```

Vous verrez l'assistant de configuration (setup wizard). Suivez les instructions.

---

## Configuration Détaillée

### Fichier `.env`

Le script génère automatiquement un fichier `.env` avec des secrets aléatoires. Voici les variables importantes:

```bash
# Base de données PostgreSQL
POSTGRES_USER=cartae
POSTGRES_PASSWORD=<généré automatiquement>
POSTGRES_DB=cartae

# HashiCorp Vault
VAULT_TOKEN=<généré automatiquement>
VAULT_ADDR=http://vault:8200

# API Backend
JWT_SECRET=<généré automatiquement>
API_PORT=3001

# Redis Cache
REDIS_PASSWORD=<généré automatiquement>

# Profil déployé
COMPOSE_PROFILES=standard
```

**⚠️ IMPORTANT:** Ne partagez JAMAIS votre fichier `.env` (contient des secrets).

### Personnalisation

#### Changer le port Frontend (5173 → 8080)

Éditez `docker-compose.standalone.yml`:

```yaml
frontend:
  ports:
    - "8080:5173"  # Changez 5173 → 8080
```

#### Activer HTTPS (Let's Encrypt)

Éditez `.env`:

```bash
TRAEFIK_ENABLE_HTTPS=true
DOMAIN=cartae.votredomaine.com
ACME_EMAIL=votre.email@example.com
```

Puis redémarrez:

```bash
docker compose -f docker-compose.standalone.yml --profile standard restart
```

---

## Premier Lancement

### Assistant de Configuration (Setup Wizard)

Lors de votre première visite sur `http://localhost:5173`, vous verrez:

#### Étape 1: Bienvenue

Cliquez sur **"Commencer la configuration"**.

#### Étape 2: Créer un compte Admin

- **Email:** votre.email@example.com
- **Mot de passe:** Minimum 12 caractères (1 majuscule, 1 chiffre, 1 symbole)
- **Nom complet:** Votre Nom

Cliquez **"Créer le compte"**.

#### Étape 3: Configuration Vault (optionnel)

Si vous utilisez le profil **Standard** ou **Full**:

- Vault sera auto-initialisé avec le token généré dans `.env`
- Aucune action requise (sauf si vous voulez configurer un auto-unseal)

Cliquez **"Suivant"**.

#### Étape 4: Sélection des Plugins

Choisissez les plugins à installer:

- ✅ **Gmail Integration** (emails, contacts, calendar)
- ✅ **Office365 Integration** (Outlook, Teams, OneDrive)
- ✅ **AI Connections** (analyse sémantique, recommandations)

Cliquez **"Installer les plugins"**.

#### Étape 5: Configuration Terminée

Cliquez **"Accéder à Cartae"**.

Vous serez redirigé vers le dashboard principal.

---

## Gestion Quotidienne

### Démarrer Cartae

```bash
docker compose -f docker-compose.standalone.yml --profile standard up -d
```

### Arrêter Cartae

```bash
docker compose -f docker-compose.standalone.yml --profile standard down
```

**⚠️ Attention:** Cela arrête tous les services mais **conserve les données**.

### Redémarrer Cartae

```bash
docker compose -f docker-compose.standalone.yml --profile standard restart
```

### Voir les Logs

```bash
# Tous les services
docker compose -f docker-compose.standalone.yml --profile standard logs -f

# Un service spécifique (API)
docker compose -f docker-compose.standalone.yml logs -f database-api

# Dernières 100 lignes (PostgreSQL)
docker compose -f docker-compose.standalone.yml logs --tail=100 cartae-postgres
```

### Vérifier le Status

```bash
docker compose -f docker-compose.standalone.yml --profile standard ps
```

Résultat:

```
NAME                  STATUS
cartae-postgres       Up 2 hours (healthy)
cartae-redis          Up 2 hours (healthy)
cartae-vault          Up 2 hours
database-api          Up 2 hours (healthy)
cartae-frontend       Up 2 hours
traefik               Up 2 hours (healthy)
```

---

## Backup & Restore

### Backup Automatique (Profil Standard/Full)

Les backups sont automatiques:

- **PostgreSQL:** Toutes les 6h (pg_dump + gzip + AES-256)
- **Vault:** Toutes les 6h (raft snapshot + GPG)
- **IndexedDB:** Quotidien (export JSON)

**Localisation:** `/var/backups/cartae/` (dans le container `restic-backup`)

### Backup Manuel

```bash
# Backup PostgreSQL
docker compose exec cartae-postgres pg_dump -U cartae cartae | gzip > backup-postgres-$(date +%Y%m%d).sql.gz

# Backup Vault
docker compose exec cartae-vault vault operator raft snapshot save /tmp/vault-snapshot-$(date +%Y%m%d).snap
docker compose cp cartae-vault:/tmp/vault-snapshot-*.snap ./
```

### Restore depuis Backup

#### PostgreSQL

```bash
# Arrêter l'API (éviter corruption)
docker compose stop database-api

# Restore
gunzip < backup-postgres-20251115.sql.gz | docker compose exec -T cartae-postgres psql -U cartae cartae

# Redémarrer l'API
docker compose start database-api
```

#### Vault

```bash
# Restore snapshot
docker compose cp vault-snapshot-20251115.snap cartae-vault:/tmp/vault-snapshot.snap
docker compose exec cartae-vault vault operator raft snapshot restore -force /tmp/vault-snapshot.snap
docker compose restart cartae-vault
```

### Télécharger Backups (via Admin UI)

1. Ouvrez `http://localhost:5173/admin/backups`
2. Sélectionnez un backup
3. Cliquez **"Download"**
4. Sauvegardez le fichier localement (clé USB, cloud storage)

---

## Mise à Jour

### Mise à Jour Version Mineure (1.0.0 → 1.1.0)

```bash
# 1. Arrêter Cartae
docker compose -f docker-compose.standalone.yml --profile standard down

# 2. Télécharger la dernière version
git pull origin main

# 3. Mettre à jour les images Docker
docker compose -f docker-compose.standalone.yml --profile standard pull

# 4. Redémarrer
docker compose -f docker-compose.standalone.yml --profile standard up -d

# 5. Vérifier status
docker compose ps
```

### Mise à Jour Version Majeure (1.x → 2.0)

⚠️ **Attention:** Les mises à jour majeures peuvent nécessiter des migrations.

1. **Backup complet** (PostgreSQL + Vault + IndexedDB)
2. Lisez les **Release Notes** sur GitHub
3. Suivez le **Migration Guide** spécifique à la version

---

## Troubleshooting

Pour les problèmes courants, consultez **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**.

### Liens Rapides

- [Vault Sealed](#vault-sealed)
- [PostgreSQL Connexion Refusée](#postgresql-connexion-refusée)
- [API 502 Bad Gateway](#api-502-bad-gateway)
- [Redis Timeout](#redis-timeout)
- [Disk Space > 90%](#disk-space--90)

---

## FAQ

### Q1: Quelle est la différence avec le mode Cloud?

**Mode Standalone:**
- ✅ Auto-hébergé (vous contrôlez vos données)
- ✅ Gratuit (pas d'abonnement)
- ❌ Vous gérez l'infrastructure (backups, mises à jour)
- ❌ Scalabilité limitée (1 serveur)

**Mode Cloud (SaaS):**
- ✅ Géré par Cartae (backups automatiques, mises à jour)
- ✅ Scalabilité infinie (auto-scaling)
- ❌ Abonnement mensuel
- ❌ Données hébergées chez nous

### Q2: Puis-je migrer Standalone → Cloud?

Oui, via export/import:

1. Exportez vos données (Admin UI → Export → All Data)
2. Créez un compte Cloud sur https://cartae.dev
3. Importez vos données (Settings → Import)

### Q3: Combien d'utilisateurs supporte le mode Standalone?

- **Profil Minimal:** 1 utilisateur
- **Profil Standard:** 1-10 utilisateurs
- **Profil Full:** 10-50 utilisateurs

Au-delà, utilisez le **mode Cloud** ou **Kubernetes** (mode Enterprise).

### Q4: Cartae fonctionne-t-il hors ligne?

Oui, partiellement:

- ✅ Accès aux données locales (IndexedDB cache)
- ✅ Recherche locale (pas de cloud)
- ❌ Synchronisation plugins (Gmail, Office365) nécessite Internet
- ❌ AI Connections nécessite Internet (OpenAI API)

### Q5: Puis-je utiliser Cartae sans Vault?

Oui, utilisez le **Profil Minimal**:

```bash
./deploy-standalone.sh minimal
```

⚠️ **Attention:** Les secrets plugins (OAuth tokens) seront stockés chiffrés dans PostgreSQL (moins sécurisé que Vault).

### Q6: Cartae est-il compatible RGPD?

Oui:

- ✅ Audit trail complet (qui a accédé quoi, quand)
- ✅ Droit à l'oubli (suppression compte = suppression données)
- ✅ Encryption at rest (LUKS + AES-256)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Données auto-hébergées (pas de transfert hors UE)

### Q7: Comment activer le mode HTTPS?

Éditez `.env`:

```bash
TRAEFIK_ENABLE_HTTPS=true
DOMAIN=cartae.votredomaine.com
ACME_EMAIL=admin@votredomaine.com
```

Puis redémarrez Traefik:

```bash
docker compose restart traefik
```

Let's Encrypt générera automatiquement un certificat TLS valide.

### Q8: Puis-je utiliser PostgreSQL externe (RDS, Azure DB)?

Oui, éditez `.env`:

```bash
POSTGRES_HOST=my-rds-instance.us-east-1.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_USER=cartae
POSTGRES_PASSWORD=<votre_mot_de_passe>
POSTGRES_DB=cartae
POSTGRES_SSL=true
```

Puis désactivez le service PostgreSQL local dans `docker-compose.standalone.yml`.

### Q9: Comment changer le port de l'API (3001 → 8080)?

Éditez `docker-compose.standalone.yml`:

```yaml
database-api:
  ports:
    - "8080:3001"
```

Puis mettez à jour `.env`:

```bash
API_PORT=8080
```

Redémarrez:

```bash
docker compose restart database-api
```

### Q10: Cartae supporte-t-il ARM (Raspberry Pi)?

Oui, les images Docker sont multi-architecture (amd64, arm64):

```bash
docker compose -f docker-compose.standalone.yml --profile minimal up -d
```

**Note:** Utilisez le **Profil Minimal** (Raspberry Pi 4 = 1-2GB RAM).

---

## Support

### Documentation Complète

- **Guide Utilisateur:** https://docs.cartae.dev/user-guide
- **API Reference:** https://docs.cartae.dev/api-reference
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### Communauté

- **GitHub Issues:** https://github.com/cartae/cartae/issues
- **Discord:** https://discord.gg/cartae
- **Forum:** https://forum.cartae.dev

### Support Commercial

Pour les déploiements entreprise (> 50 users):

- **Email:** enterprise@cartae.dev
- **Contrat Support:** SLA 99.9%, support 24/7

---

## Licence

Cartae est open-source sous licence **MIT**.

Copyright (c) 2025 Cartae Team.

---

**Profitez de Cartae! 🚀**
