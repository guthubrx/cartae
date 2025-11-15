# Cartae - Traefik Configuration (Let's Encrypt + TLS)

## 📋 Vue d'Ensemble

Traefik est le reverse proxy (point d'entrée DMZ) qui gère:

- Terminaison TLS (Let's Encrypt pour Internet → API)
- Routing (host-based routing vers services internes)
- Auto-renouvellement certificats (Let's Encrypt ACME)
- Dashboard monitoring (protégé par auth basic)

---

## 🔒 Let's Encrypt - Auto-Renewal

### Configuration STAGING (éviter rate-limit)

La configuration staging utilise Let's Encrypt **STAGING** pour éviter les rate-limits pendant les tests:

```yaml
# docker-compose.staging.yml
traefik:
  command:
    - '--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory'
    - '--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}'
    - '--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json'
    - '--certificatesresolvers.letsencrypt.acme.httpchallenge=true'
    - '--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web'
```

⚠️ **Important:** Certificats staging sont **auto-signés** et **non reconnus** par navigateurs.
Pour PRODUCTION, utiliser Let's Encrypt **PRODUCTION**.

###Configuration PRODUCTION (certificats valides)

Pour obtenir certificats **reconnus par navigateurs**, utiliser serveur Let's Encrypt PRODUCTION:

```yaml
# docker-compose.prod.yml (à créer)
traefik:
  command:
    # PRODUCTION: Supprimer la ligne caserver (utilise production par défaut)
    - '--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}'
    - '--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json'
    - '--certificatesresolvers.letsencrypt.acme.httpchallenge=true'
    - '--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web'
```

**Rate Limits Production:**

- 50 certificats / domaine / semaine
- 5 certificats dupliqués / semaine
- 300 nouveaux ordres / compte / 3h

**Recommandation:** Tester en staging AVANT production.

### Vérifier Renouvellement Auto

Let's Encrypt renouvelle automatiquement certificats 30 jours avant expiration.

**Vérifier certificat actuel:**

```bash
# Depuis container Traefik
docker exec -it cartae-traefik cat /letsencrypt/acme.json | jq '.letsencrypt.Certificates[] | {domain: .domain.main, notAfter}'

# Ou avec OpenSSL
echo | openssl s_client -connect api.${DOMAIN}:443 2>/dev/null | openssl x509 -noout -enddate
```

**Forcer renouvellement manuel (si besoin):**

```bash
# Supprimer certificat existant
docker exec -it cartae-traefik rm /letsencrypt/acme.json

# Redémarrer Traefik (renouvelle automatiquement)
docker-compose restart traefik
```

---

## 🔐 Dashboard Auth Basic

Traefik dashboard est protégé par authentification HTTP Basic (htpasswd).

### Générer Mot de Passe Htpasswd

**1. Installer htpasswd (Apache Utils):**

```bash
# Ubuntu/Debian
sudo apt-get install apache2-utils

# macOS
brew install httpd  # Inclus htpasswd
```

**2. Générer hash htpasswd:**

```bash
# Générer hash (username: admin, password: votre_password)
htpasswd -nb admin votre_password

# Output:
# admin:$apr1$xyz123$...
```

**3. Échapper `$` pour Docker Compose:**

⚠️ **Important:** Dollar signs `$` doivent être **doublés** (`$$`) dans `.env` pour Docker Compose.

```bash
# Générer ET échapper en une commande
echo $(htpasswd -nb admin votre_password) | sed -e 's/\$/\$\$/g'

# Output:
# admin:$$apr1$$xyz123$$...
```

**4. Ajouter à `.env`:**

```bash
# .env
TRAEFIK_DASHBOARD_AUTH=admin:$$apr1$$xyz123$$...
```

### Accéder Dashboard

```bash
# URL dashboard (après déploiement staging/prod)
https://traefik.${DOMAIN}

# Login:
# Username: admin
# Password: votre_password
```

---

## 🌐 TLS Configuration (Internet → Traefik)

### Redirect HTTP → HTTPS

Tous requêtes HTTP (port 80) sont **automatiquement redirigées** vers HTTPS (port 443):

```yaml
traefik:
  command:
    - '--entrypoints.web.http.redirections.entrypoint.to=websecure'
    - '--entrypoints.web.http.redirections.entrypoint.scheme=https'
```

**Test redirect:**

```bash
# HTTP request
curl -I http://api.${DOMAIN}

# Devrait retourner:
# HTTP/1.1 308 Permanent Redirect
# Location: https://api.${DOMAIN}/
```

### Security Headers

Traefik ajoute automatiquement headers de sécurité (configurés dans staging.yml):

```yaml
labels:
  # Security headers middleware
  - 'traefik.http.middlewares.security-headers.headers.framedeny=true'
  - 'traefik.http.middlewares.security-headers.headers.sslredirect=true'
  - 'traefik.http.middlewares.security-headers.headers.stsincludesubdomains=true'
  - 'traefik.http.middlewares.security-headers.headers.stspreload=true'
  - 'traefik.http.middlewares.security-headers.headers.stsseconds=31536000'
```

**Headers ajoutés:**

- `X-Frame-Options: DENY` (protection clickjacking)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HSTS)
- Redirect automatique HTTP → HTTPS

**Vérifier headers:**

```bash
curl -I https://api.${DOMAIN} | grep -i "strict-transport\|x-frame"
```

---

## 📊 Monitoring Dashboard

### Accès Dashboard

**URL:** `https://traefik.${DOMAIN}`

**Features:**

- Visualisation routers (HTTP + entrypoints)
- Visualisation services (backends)
- Visualisation middlewares (auth, headers, etc.)
- Certificats TLS actifs (domaines, expiration)
- Logs temps réel (access + errors)

### Métriques (Prometheus - optionnel)

Activer métriques Prometheus pour Grafana:

```yaml
# docker-compose.staging.yml (ajouter)
traefik:
  command:
    - '--metrics.prometheus=true'
    - '--metrics.prometheus.entrypoint=metrics'
    - '--entrypoints.metrics.address=:8082'
```

**Scrape métriques:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'traefik'
    static_configs:
      - targets: ['traefik:8082']
```

---

## 🧪 Tests

### Test 1: HTTP Redirect

```bash
curl -I http://api.${DOMAIN}
# Expect: 308 Permanent Redirect → https://api.${DOMAIN}
```

### Test 2: HTTPS Certificate

```bash
echo | openssl s_client -connect api.${DOMAIN}:443 -showcerts 2>/dev/null | grep -A 2 "Issuer"
# Expect: Issuer: CN=Let's Encrypt (ou staging CA)
```

### Test 3: Dashboard Auth

```bash
# Sans auth (doit échouer)
curl -I https://traefik.${DOMAIN}
# Expect: 401 Unauthorized

# Avec auth
curl -u admin:votre_password https://traefik.${DOMAIN}
# Expect: 200 OK (HTML dashboard)
```

### Test 4: Security Headers

```bash
curl -I https://api.${DOMAIN} | grep -i "strict-transport\|x-frame"
# Expect: Strict-Transport-Security + X-Frame-Options headers
```

---

## 🆘 Troubleshooting

### Erreur: "acme: error: 400"

**Cause:** Rate limit Let's Encrypt dépassé
**Solution:** Utiliser staging CA ou attendre reset hebdomadaire

### Erreur: "no such host"

**Cause:** DNS ne pointe pas vers serveur
**Solution:** Configurer DNS A record `${DOMAIN}` → IP serveur

### Erreur: "certificate signed by unknown authority"

**Cause:** Utilisation Let's Encrypt STAGING (self-signed)
**Solution:** Normal en staging, utiliser PROD pour certificats reconnus

### Dashboard inaccessible

**Cause:** Mot de passe htpasswd incorrect ou mal échappé
**Solution:** Régénérer hash avec `$$` doublés dans `.env`

### Certificat expiré

**Cause:** Renouvellement auto échoué (DNS/firewall/rate-limit)
**Solution:**

```bash
# Vérifier logs Traefik
docker logs cartae-traefik | grep -i "acme\|renew"

# Forcer renouvellement
rm /letsencrypt/acme.json
docker-compose restart traefik
```

---

## 📖 Références

- **Traefik Docs:** https://doc.traefik.io/traefik/
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **ACME Rate Limits:** https://letsencrypt.org/docs/rate-limits/
- **Security Headers:** https://securityheaders.com/

---

**Auteur:** Claude Code
**Session:** 81b - TLS/mTLS End-to-End
**Date:** 15 Novembre 2025
