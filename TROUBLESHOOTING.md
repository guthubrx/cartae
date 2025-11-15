# Guide Troubleshooting - Cartae Standalone

**Version:** 1.0.0
**Dernière mise à jour:** 15 Novembre 2025

---

## 📋 Table des Matières

1. [Diagnostics Généraux](#diagnostics-généraux)
2. [Problèmes PostgreSQL](#problèmes-postgresql)
3. [Problèmes Vault](#problèmes-vault)
4. [Problèmes Redis](#problèmes-redis)
5. [Problèmes API](#problèmes-api)
6. [Problèmes Frontend](#problèmes-frontend)
7. [Problèmes Réseau](#problèmes-réseau)
8. [Problèmes Backup](#problèmes-backup)
9. [Problèmes Performance](#problèmes-performance)
10. [Contact Support](#contact-support)

---

## Diagnostics Généraux

### Commandes Utiles

```bash
# Voir status tous services
docker compose -f docker-compose.standalone.yml --profile standard ps

# Voir logs tous services
docker compose -f docker-compose.standalone.yml --profile standard logs -f

# Voir logs service spécifique (API)
docker compose -f docker-compose.standalone.yml logs -f database-api

# Inspecter santé service
docker inspect --format='{{json .State.Health}}' database-api | jq

# Vérifier ressources (CPU, RAM)
docker stats

# Vérifier espace disque
df -h
```

### Health Checks

```bash
# PostgreSQL
docker compose exec cartae-postgres pg_isready -U cartae

# Redis
docker compose exec cartae-redis redis-cli ping

# Vault
curl -sf http://localhost:8200/v1/sys/health

# API
curl -sf http://localhost:3001/health
```

---

## Problèmes PostgreSQL

### Symptôme: PostgreSQL ne démarre pas

**Erreur:**
```
cartae-postgres exited with code 1
FATAL: data directory "/var/lib/postgresql/data" has wrong ownership
```

**Cause:** Permissions incorrectes sur le volume Docker.

**Solution:**
```bash
# Arrêter PostgreSQL
docker compose stop cartae-postgres

# Supprimer volume (⚠️ PERTE DE DONNÉES)
docker volume rm cartae_postgres-data

# Redémarrer
docker compose up -d cartae-postgres

# Restaurer backup si nécessaire
gunzip < backup-postgres-latest.sql.gz | docker compose exec -T cartae-postgres psql -U cartae cartae
```

---

### Symptôme: Connexion refusée à PostgreSQL

**Erreur dans logs API:**
```
Error: connect ECONNREFUSED 172.25.3.2:5432
```

**Diagnostic:**
```bash
# Vérifier PostgreSQL actif
docker compose ps cartae-postgres

# Vérifier port 5432 ouvert
docker compose exec cartae-postgres netstat -tlnp | grep 5432

# Vérifier network
docker network inspect cartae_data-network
```

**Solutions:**

1. **PostgreSQL pas démarré:**
```bash
docker compose up -d cartae-postgres
```

2. **Mauvais hostname dans .env:**
```bash
# Vérifier POSTGRES_HOST=cartae-postgres (pas localhost!)
grep POSTGRES_HOST .env
```

3. **Firewall bloque le port:**
```bash
# Linux: Désactiver firewall temporairement
sudo ufw disable

# macOS: Vérifier Firewall dans Préférences Système
```

---

### Symptôme: PostgreSQL lent (requêtes > 500ms)

**Diagnostic:**
```bash
# Vérifier connexions actives
docker compose exec cartae-postgres psql -U cartae -c "SELECT count(*) FROM pg_stat_activity;"

# Vérifier requêtes lentes
docker compose exec cartae-postgres psql -U cartae -c "SELECT query, state, wait_event FROM pg_stat_activity WHERE state != 'idle';"
```

**Solutions:**

1. **Trop de connexions:**
```sql
-- Limiter connexions API (modifiez infra/database/init-scripts/02-performance.sql)
ALTER SYSTEM SET max_connections = 100;
SELECT pg_reload_conf();
```

2. **Indexes manquants:**
```sql
-- Vérifier tables sans indexes
SELECT tablename, attname FROM pg_stats WHERE schemaname = 'public' AND null_frac > 0.5;

-- Créer index
CREATE INDEX idx_items_user_id ON items(user_id);
```

3. **Vacuum nécessaire:**
```bash
docker compose exec cartae-postgres vacuumdb -U cartae -d cartae --analyze --verbose
```

---

## Problèmes Vault

### Symptôme: Vault sealed

**Erreur dans logs API:**
```
Error: Vault is sealed (status 503)
```

**Diagnostic:**
```bash
# Vérifier status Vault
curl http://localhost:8200/v1/sys/health

# Réponse si sealed:
# {"sealed":true,"t":1,"n":1,"progress":0}
```

**Solution:**
```bash
# Unseal Vault (mode dev)
docker compose exec cartae-vault vault operator unseal

# Ou redémarrer (auto-unseal si configuré)
docker compose restart cartae-vault

# Vérifier unsealed
curl http://localhost:8200/v1/sys/health | jq '.sealed'
# Doit afficher: false
```

**⚠️ Mode Production:** Stockez les unseal keys dans un endroit sécurisé (KeePass, 1Password, etc.).

---

### Symptôme: Vault token expiré

**Erreur dans logs API:**
```
Error: permission denied (HTTP 403)
```

**Solution:**
```bash
# Vérifier token valide
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=<votre_token>
vault token lookup

# Si expiré, renouveler
vault token renew

# Ou créer nouveau token (admin uniquement)
vault token create -policy=root -ttl=720h
```

**Update .env avec nouveau token:**
```bash
VAULT_TOKEN=<nouveau_token>
```

Puis redémarrez l'API:
```bash
docker compose restart database-api
```

---

## Problèmes Redis

### Symptôme: Redis timeout

**Erreur dans logs API:**
```
Error: Connection timeout (Redis)
```

**Diagnostic:**
```bash
# Vérifier Redis actif
docker compose ps cartae-redis

# Tester connexion
docker compose exec cartae-redis redis-cli -a ${REDIS_PASSWORD} ping
# Doit afficher: PONG
```

**Solutions:**

1. **Redis pas démarré:**
```bash
docker compose up -d cartae-redis
```

2. **Mauvais mot de passe:**
```bash
# Vérifier REDIS_PASSWORD dans .env
grep REDIS_PASSWORD .env

# Tester connexion avec password
docker compose exec cartae-redis redis-cli -a <password> ping
```

3. **Redis plein (maxmemory):**
```bash
# Vérifier mémoire utilisée
docker compose exec cartae-redis redis-cli -a ${REDIS_PASSWORD} INFO memory | grep used_memory_human

# Vider cache (⚠️ PERTE DE DONNÉES)
docker compose exec cartae-redis redis-cli -a ${REDIS_PASSWORD} FLUSHALL
```

---

## Problèmes API

### Symptôme: API 502 Bad Gateway

**Erreur dans navigateur:**
```
502 Bad Gateway (Nginx/Traefik)
```

**Diagnostic:**
```bash
# Vérifier API démarrée
docker compose ps database-api

# Vérifier logs API
docker compose logs database-api --tail=100

# Tester health check
curl http://localhost:3001/health
```

**Solutions:**

1. **API crashée:**
```bash
# Voir erreur exacte dans logs
docker compose logs database-api --tail=50

# Redémarrer API
docker compose restart database-api
```

2. **API lente à démarrer (> 60s):**
```bash
# Attendre health check
watch -n 5 'curl -sf http://localhost:3001/health && echo "API Ready" || echo "API Not Ready"'
```

3. **PostgreSQL/Redis inaccessibles:**
```bash
# Vérifier network
docker network inspect cartae_app-network

# Vérifier PostgreSQL/Redis actifs
docker compose ps cartae-postgres cartae-redis
```

---

### Symptôme: API 429 Too Many Requests

**Erreur:**
```json
{"error": "Rate limit exceeded", "retry_after": 60}
```

**Cause:** Rate limiting activé (protection contre brute-force).

**Solution:**

1. **Temporaire (dev uniquement):**
Éditez `.env`:
```bash
RATE_LIMIT_ENABLED=false
```

Redémarrez API:
```bash
docker compose restart database-api
```

2. **Production (ajuster limites):**
Éditez `packages/database-api/src/middleware/rate-limiter.ts`:
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests par IP (vs 50 par défaut)
});
```

---

## Problèmes Frontend

### Symptôme: Frontend page blanche

**Erreur dans console navigateur:**
```
Failed to fetch http://localhost:3001/health
```

**Solutions:**

1. **API inaccessible:**
```bash
# Vérifier API démarrée
curl http://localhost:3001/health
```

2. **CORS bloqué:**
Éditez `.env`:
```bash
CORS_ORIGIN=http://localhost:5173
```

Redémarrez API:
```bash
docker compose restart database-api
```

3. **Port 5173 déjà utilisé:**
```bash
# Trouver processus
lsof -i :5173

# Ou changer port dans docker-compose.standalone.yml
ports:
  - "8080:5173"
```

---

## Problèmes Réseau

### Symptôme: Cannot connect to Docker daemon

**Erreur:**
```
Error: Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solutions:**

1. **Docker daemon pas démarré:**
```bash
# macOS: Ouvrir Docker Desktop
open -a Docker

# Linux: Démarrer service
sudo systemctl start docker
```

2. **Permissions incorrectes:**
```bash
# Linux: Ajouter user au groupe docker
sudo usermod -aG docker $USER
newgrp docker
```

---

### Symptôme: Network unreachable entre services

**Erreur dans logs API:**
```
Error: getaddrinfo ENOTFOUND cartae-postgres
```

**Diagnostic:**
```bash
# Vérifier networks créés
docker network ls | grep cartae

# Inspecter network
docker network inspect cartae_app-network
```

**Solution:**
```bash
# Recréer networks
docker compose down
docker compose up -d
```

---

## Problèmes Backup

### Symptôme: Backup failed

**Erreur dans logs restic:**
```
Error: repository does not exist
```

**Solution:**
```bash
# Initialiser repository Restic
docker compose exec restic-backup restic init

# Ou supprimer volume et recommencer
docker volume rm cartae_backup-data
docker compose up -d restic-backup
```

---

### Symptôme: Restore backup échoue

**Erreur:**
```
psql: error: FATAL: database "cartae" does not exist
```

**Solution:**
```bash
# Créer database avant restore
docker compose exec cartae-postgres psql -U cartae -c "CREATE DATABASE cartae;"

# Puis restore
gunzip < backup-postgres-20251115.sql.gz | docker compose exec -T cartae-postgres psql -U cartae cartae
```

---

## Problèmes Performance

### Symptôme: Disk space > 90%

**Diagnostic:**
```bash
# Vérifier espace disque
df -h

# Vérifier taille volumes Docker
docker system df -v
```

**Solutions:**

1. **Nettoyer images inutilisées:**
```bash
docker image prune -a
```

2. **Nettoyer volumes inutilisés:**
```bash
docker volume prune
```

3. **Purger logs Docker:**
```bash
# Linux
sudo sh -c "truncate -s 0 /var/lib/docker/containers/*/*-json.log"

# macOS (Docker Desktop)
rm ~/Library/Containers/com.docker.docker/Data/vms/0/console-ring
```

4. **Purger backups anciens:**
```bash
docker compose exec restic-backup restic forget --keep-last 5 --prune
```

---

### Symptôme: RAM > 90%

**Diagnostic:**
```bash
# Vérifier RAM consommée par containers
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"
```

**Solutions:**

1. **Redémarrer services gros consommateurs:**
```bash
docker compose restart database-api cartae-postgres
```

2. **Limiter RAM par service (docker-compose.standalone.yml):**
```yaml
database-api:
  deploy:
    resources:
      limits:
        memory: 512M
      reservations:
        memory: 256M
```

3. **Passer au profil Minimal:**
```bash
docker compose --profile minimal up -d
```

---

## Contact Support

### Avant de contacter le support

Collectez ces informations:

```bash
# Version Docker
docker --version
docker compose version

# Version Cartae
git describe --tags

# Logs tous services
docker compose logs > cartae-logs.txt

# System info
uname -a
cat /etc/os-release
```

### Canaux de Support

- **GitHub Issues (bugs):** https://github.com/cartae/cartae/issues
- **Discord (communauté):** https://discord.gg/cartae
- **Forum (discussions):** https://forum.cartae.dev
- **Email (entreprise):** support@cartae.dev

---

**Dernier recours:** Redéploiement complet

⚠️ **ATTENTION:** Sauvegardez vos données avant!

```bash
# Backup complet
./scripts/backup-all.sh

# Arrêter tout
docker compose down -v

# Supprimer volumes
docker volume rm cartae_postgres-data cartae_vault-data cartae_redis-data

# Redéployer
./deploy-standalone.sh standard

# Restore backup
./scripts/restore-all.sh backup-20251115.tar.gz
```

---

**Problème non résolu?** Ouvrez une issue: https://github.com/cartae/cartae/issues/new
