# 🔐 Guide de Sécurité - Cartae Vault Production

**Security-Driven Development - Zero Trust Architecture**

---

## 🚀 Quick Start - Production Deployment

### 1. Générer les Certificats TLS

```bash
cd infra/vault/scripts
./generate-certs.sh
```

Cela génère :
- `ca.crt` + `ca.key` (Certificate Authority)
- `vault.crt` + `vault.key` (Vault server cert)
- `postgres.crt` + `postgres.key` (PostgreSQL server cert)
- `cartae.crt` + `cartae.key` (App web cert)
- `pgadmin.crt` + `pgadmin.key` (pgAdmin cert)

⚠️ **IMPORTANT:** Sauvegardez `ca.key` dans un coffre-fort sécurisé et **ne le commitez JAMAIS dans Git** !

### 2. Installer le Certificat CA

```bash
# macOS
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  infra/vault/certs/ca.crt

# Linux (Debian/Ubuntu)
sudo cp infra/vault/certs/ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# Linux (RHEL/CentOS)
sudo cp infra/vault/certs/ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

### 3. Configurer /etc/hosts

```bash
sudo bash -c 'cat >> /etc/hosts <<EOF
127.0.0.1 app.cartae.local
127.0.0.1 pgadmin.cartae.local
EOF'
```

### 4. Créer les Docker Secrets

```bash
mkdir -p infra/vault/secrets

# Vault app token (sera généré après init, placeholder pour l'instant)
echo "placeholder-token" > infra/vault/secrets/vault_app_token.txt

# PostgreSQL credentials
echo "cartae_user" > infra/vault/secrets/postgres_user.txt
openssl rand -base64 32 > infra/vault/secrets/postgres_password.txt

# pgAdmin password
openssl rand -base64 32 > infra/vault/secrets/pgadmin_password.txt

# Permissions strictes (lisible uniquement par owner)
chmod 600 infra/vault/secrets/*
```

### 5. Configurer le Firewall

```bash
cd infra/vault/scripts
sudo ./setup-firewall.sh
```

Cela configure :
- Isolation réseau stricte (4 tiers)
- Firewall iptables (deny by default)
- Règles whitelist pour chaque service

### 6. Démarrer l'Infrastructure

```bash
cd infra/vault
docker-compose -f docker-compose.production.yml up -d
```

### 7. Initialiser Vault

```bash
# Attendre que Vault soit prêt (30-60 secondes)
docker-compose -f docker-compose.production.yml logs -f vault

# Initialiser Vault (génère unseal keys + root token)
docker-compose -f docker-compose.production.yml exec vault \
  vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > /tmp/vault-init.json

# ⚠️ SAUVEGARDER immédiatement dans un lieu sûr !
```

### 8. Unseal Vault

```bash
# Extraire les 3 premières unseal keys
UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' /tmp/vault-init.json)
UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' /tmp/vault-init.json)
UNSEAL_KEY_3=$(jq -r '.unseal_keys_b64[2]' /tmp/vault-init.json)

# Unseal Vault
docker-compose -f docker-compose.production.yml exec vault \
  vault operator unseal "$UNSEAL_KEY_1"

docker-compose -f docker-compose.production.yml exec vault \
  vault operator unseal "$UNSEAL_KEY_2"

docker-compose -f docker-compose.production.yml exec vault \
  vault operator unseal "$UNSEAL_KEY_3"

# Vérifier le statut
docker-compose -f docker-compose.production.yml exec vault \
  vault status
```

### 9. Configurer Vault

```bash
# Récupérer root token
ROOT_TOKEN=$(jq -r '.root_token' /tmp/vault-init.json)

# Login avec root token
docker-compose -f docker-compose.production.yml exec vault \
  vault login "$ROOT_TOKEN"

# Activer KV v2 secrets engine
docker-compose -f docker-compose.production.yml exec vault \
  vault secrets enable -path=secret kv-v2

# Charger les policies ACL
docker-compose -f docker-compose.production.yml exec vault \
  vault policy write cartae-app /vault/policies/cartae-app-policy.hcl

docker-compose -f docker-compose.production.yml exec vault \
  vault policy write cartae-admin /vault/policies/cartae-admin-policy.hcl

# Créer token pour l'application
APP_TOKEN=$(docker-compose -f docker-compose.production.yml exec vault \
  vault token create -policy=cartae-app -ttl=720h -format=json | \
  jq -r '.auth.client_token')

# Sauvegarder dans Docker secret
echo "$APP_TOKEN" > infra/vault/secrets/vault_app_token.txt
chmod 600 infra/vault/secrets/vault_app_token.txt

# Redémarrer app pour charger nouveau token
docker-compose -f docker-compose.production.yml restart cartae-web
```

### 10. Activer Audit Trail

```bash
docker-compose -f docker-compose.production.yml exec vault \
  vault audit enable file file_path=/vault/logs/audit.log
```

---

## 🏗️ Architecture de Sécurité

### Réseaux Isolés (4 Tiers)

```
┌─────────────────────────────────────────────────────────────┐
│ DMZ Network (172.25.1.0/24) - Public-facing                 │
│ Services: Traefik, Fail2ban                                 │
│ Accès Internet: OUI                                         │
│ Firewall: Rate limiting, IPS, WAF                           │
└─────────────────────────────────────────────────────────────┘
                         │ mTLS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ App Network (172.25.2.0/24) - Application tier              │
│ Services: Cartae Web App                                    │
│ Accès Internet: NON (bloqué par iptables)                   │
│ Firewall: Allow ONLY Traefik → App:3000                     │
└─────────────────────────────────────────────────────────────┘
                    │ TLS 1.3         │ TLS 1.3
                    ▼                 ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│ Secrets Network          │   │ Data Network             │
│ (172.25.3.0/24)          │   │ (172.25.4.0/24)          │
│                          │   │                          │
│ Services: Vault          │   │ Services: PostgreSQL     │
│ Accès Internet: NON      │   │ Accès Internet: NON      │
│ Firewall: App→8200 ONLY  │   │ Firewall: App+Vault→5432 │
└──────────────────────────┘   └──────────────────────────┘
             │ TLS 1.3 │
             └─────────┘
```

### Flux de Sécurité

1. **Internet → Traefik (DMZ)**
   - TLS 1.3 termination
   - Rate limiting (100 req/s, burst 50)
   - Security headers (CSP, HSTS, X-Frame-Options)
   - Fail2ban (anti brute-force)

2. **Traefik → Cartae Web (App Network)**
   - mTLS (mutual TLS)
   - Firewall: Port 3000 uniquement
   - Read-only filesystem

3. **Cartae Web → Vault (Secrets Network)**
   - TLS 1.3 + AppRole auth
   - Firewall: Port 8200 uniquement
   - Vault policies ACL (read-only)

4. **Cartae Web → PostgreSQL (Data Network)**
   - TLS 1.3 + scram-sha-256 auth
   - Firewall: Port 5432 uniquement

5. **Vault → PostgreSQL (Data Network)**
   - TLS 1.3 + cert auth
   - Pour dynamic secrets

---

## 🔒 Checklist Sécurité Production

### Avant Déploiement

- [ ] Certificats TLS générés et sauvegardés
- [ ] CA installé dans trust store système
- [ ] Docker secrets créés (vault_app_token, postgres_password, etc.)
- [ ] Firewall iptables configuré
- [ ] /etc/hosts configuré (app.cartae.local, pgadmin.cartae.local)
- [ ] Volumes chiffrés LUKS montés (Phase 6)

### Après Déploiement

- [ ] Vault initialisé et unseal
- [ ] Unseal keys sauvegardées dans coffre-fort sécurisé (1Password, Bitwarden)
- [ ] Root token révoqué après setup initial
- [ ] Policies ACL chargées (cartae-app, cartae-admin)
- [ ] Audit trail activé
- [ ] Logs Traefik configurés pour Fail2ban
- [ ] Tests de pénétration effectués (OWASP ZAP, Nikto)

### Maintenance Continue

- [ ] Rotation secrets tous les 30-90 jours
- [ ] Mise à jour images Docker mensuellement
- [ ] Scan vulnérabilités Trivy hebdomadaire
- [ ] Review audit logs quotidiennement
- [ ] Backup chiffré des volumes quotidiennement
- [ ] Tests disaster recovery trimestriellement

---

## 🛡️ Hardening Checklist

### Docker Hardening

- [x] `security_opt: no-new-privileges` (empêche escalade privilèges)
- [x] `cap_drop: ALL` (drop toutes capabilities)
- [x] `cap_add: IPC_LOCK` (uniquement pour Vault mlock)
- [x] `read_only: true` (filesystem read-only, immutabilité)
- [x] `tmpfs` avec `noexec,nosuid,nodev` (pas d'exécution depuis /tmp)
- [x] Image pinning (hashicorp/vault:1.17, pas :latest)
- [x] Docker secrets (pas de variables d'env pour secrets)
- [x] User namespace remapping (pas de root dans containers)

### Réseau Hardening

- [x] Micro-segmentation (4 réseaux isolés)
- [x] `internal: true` pour Secrets + Data networks (pas d'Internet)
- [x] `enable_icc: false` (pas de communication inter-containers non autorisée)
- [x] Firewall iptables (deny by default, whitelist explicite)
- [x] TLS 1.3 partout (pas de HTTP en clair)
- [x] mTLS entre Traefik et Cartae Web
- [x] Certificats avec SAN (Subject Alternative Names)

### Vault Hardening

- [x] TLS 1.3 uniquement (`tls_min_version: tls13`)
- [x] mlock activé (`disable_mlock: false`)
- [x] Audit trail activé
- [x] Policies ACL (least privilege)
- [x] Root token révoqué après setup
- [x] Unseal keys offline (pas dans containers)
- [x] TTL sur tokens (720h max)
- [x] Rate limiting API

### PostgreSQL Hardening

- [x] TLS 1.3 (`ssl_min_protocol_version: TLSv1.3`)
- [x] scram-sha-256 auth (pas de md5)
- [x] Read-only filesystem
- [x] Pas de ports publics exposés
- [x] Docker secrets pour credentials
- [x] Volumes chiffrés LUKS (Phase 6)

---

## 🚨 Incident Response

### Scénario 1: Vault Sealed

**Symptôme:** App ne peut plus accéder aux secrets

**Action:**
```bash
# Vérifier status
vault status  # Sealed: true

# Unseal avec 3 clés
vault operator unseal <key-1>
vault operator unseal <key-2>
vault operator unseal <key-3>

# Vérifier
vault status  # Sealed: false
```

### Scénario 2: Unseal Keys Perdues

**Symptôme:** Impossible d'unseal Vault après redémarrage

**Action:**
⚠️ **CRITIQUE:** Sans unseal keys, données IRRÉCUPÉRABLES !

- Restaurer keys depuis backup (coffre-fort)
- Si backup perdu → Réinitialiser Vault (⚠️ perte de données)

### Scénario 3: Root Token Compromis

**Action:**
```bash
# Révoquer immédiatement
vault token revoke <root-token>

# Créer nouveau root token avec generate-root
vault operator generate-root -init
vault operator generate-root -decode=<encoded-token> -otp=<otp>

# Auditer accès récents
cat /vault/logs/audit.log | jq 'select(.auth.client_token == "<compromised-token>")'
```

### Scénario 4: Brute-Force Détecté

**Symptôme:** Fail2ban ban des IPs

**Action:**
```bash
# Lister IPs bannies
fail2ban-client status traefik

# Débanner IP légitime
fail2ban-client set traefik unbanip <ip>

# Augmenter rate limiting si nécessaire
# Edit traefik/dynamic/middlewares.yml
```

---

## 📊 Monitoring & Alertes

### Metrics Prometheus

```bash
# Scrape Vault metrics
curl -H "X-Vault-Token: $VAULT_TOKEN" \
  https://vault:8200/v1/sys/metrics?format=prometheus

# Scrape Traefik metrics
curl https://traefik:8080/metrics
```

### Logs Centralisés

```bash
# Vault audit logs (JSON)
tail -f /vault/logs/audit.log | jq .

# Traefik access logs (JSON)
tail -f /var/log/traefik/access.log | jq .

# PostgreSQL logs
docker-compose -f docker-compose.production.yml logs -f postgresql
```

### Alertes Critiques

- ⚠️ Vault sealed (health check failed)
- ⚠️ Unseal failed (mauvaise clé)
- ⚠️ Root token usage (devrait être révoqué)
- ⚠️ Rate limit dépassé (potentiel DDoS)
- ⚠️ Fail2ban ban (brute-force détecté)
- ⚠️ Certificat TLS expire dans <30 jours

---

## 📚 Ressources

- [SECURITY-AUDIT.md](./SECURITY-AUDIT.md) - Audit complet de sécurité
- [HashiCorp Vault Production Hardening](https://developer.hashicorp.com/vault/tutorials/operations/production-hardening)
- [NIST SP 800-207 - Zero Trust Architecture](https://csrc.nist.gov/publications/detail/sp/800-207/final)
- [OWASP Top 10 2024](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

---

## ✅ Support

En cas de problème de sécurité :

1. **Urgent:** Isoler immédiatement le service compromis
2. Consulter [SECURITY-AUDIT.md](./SECURITY-AUDIT.md)
3. Consulter logs d'audit Vault
4. Ouvrir incident avec contexte complet

**Security-first mindset: En cas de doute, isoler et analyser avant de réactiver.**
