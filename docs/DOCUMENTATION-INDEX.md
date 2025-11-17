# Documentation Cartae Enterprise - Index

**Version:** 1.0
**Date:** 2025-11-17
**Statut:** Production Ready

---

## Vue d'Ensemble

Bienvenue dans la documentation complète de **Cartae Enterprise**, la plateforme de marketplace et gestion de plugins multi-tenant sécurisée.

Cette documentation couvre toutes les features développées dans les **Sessions 84-86** :

- **Session 84-85 :** Multi-tenant architecture, branding dynamique, build optimisé
- **Session 86 :** Security hardening (OWASP Top 10 compliance), monitoring avancé

---

## Table des Matières

### 1. Démarrage Rapide

**[ENTERPRISE-QUICKSTART.md](./ENTERPRISE-QUICKSTART.md)** (478 lignes, 13 KB)

**Contenu :**

- Introduction et prérequis (Docker, PostgreSQL, Redis, Vault)
- Installation en 5 étapes (cloner, configurer, démarrer infra, initialiser DB, démarrer API)
- Configuration multi-tenant (créer premier tenant, branding dynamique)
- Vérification installation (health checks, logs, endpoints)
- Prochaines étapes (monitoring, sécurité, performance, backup, scaling)

**Public :** Administrateurs système, DevOps

**Durée estimée :** 30-45 minutes (première installation)

**Prérequis :** Connaissance Docker, Linux, PostgreSQL

---

### 2. Configuration Sécurité

**[SECURITY-CONFIGURATION.md](./SECURITY-CONFIGURATION.md)** (826 lignes, 21 KB)

**Contenu :**

- Vue d'ensemble Defense in Depth (OWASP Top 10 compliance)
- **Rate Limiting** : Configuration par défaut, par endpoint, par tenant tier (free/pro/enterprise)
- **CORS** : Whitelist restrictive, wildcard subdomains, testing
- **Audit Logging** : Format JSON structuré, intégration SIEM (Datadog, Splunk)
- **Security Headers** : CSP, HSTS, X-Frame-Options, presets (API strict, frontend modéré)
- **Best Practices** : Rotation secrets, MFA admins, IP whitelisting, certificate renewal

**Public :** Administrateurs sécurité, DevSecOps

**Durée estimée :** 1-2 heures (configuration complète)

**Prérequis :** Connaissance sécurité web, OWASP Top 10

---

### 3. Monitoring et Alertes

**[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** (1062 lignes, 25 KB)

**Contenu :**

- Stack monitoring (Prometheus, Grafana, Loki, Alertmanager, Fail2ban)
- **Installation :** Docker Compose, exporters (node, postgres, redis)
- **Dashboards Grafana :**
  - Security Overview (rate limits, failed logins, top blocked IPs)
  - API Performance (RPS, latency P50/P95/P99, error rate)
  - Infrastructure Health (CPU, memory, disk, network)
- **Alertes Prometheus :**
  - Critiques (brute force, SQL injection, unauthorized admin access)
  - Warnings (high rate limits, unusual API usage, certificate expiring)
- **Log Aggregation (Loki) :** Query examples LogQL, anomaly detection
- **Fail2ban :** Automated IP blocking, jails configuration

**Public :** SRE, DevOps, Administrateurs système

**Durée estimée :** 2-3 heures (installation + configuration dashboards)

**Prérequis :** Connaissance Prometheus/Grafana, Docker Compose

---

### 4. Multi-Tenant Architecture

**[MULTI-TENANT-GUIDE.md](./MULTI-TENANT-GUIDE.md)** (975 lignes, 26 KB)

**Contenu :**

- **Concepts multi-tenant :** Isolation données, avantages SaaS
- **Database Schema :** Migration SQL (ajouter `tenant_id`), Row-Level Security (RLS)
- **Rate Limits par Tier :**
  - Free (100 req/min), Starter (500), Pro (1000), Enterprise (10k)
  - Enforcement quotas (users, plugins)
- **Branding Dynamique :** Variables (appName, logoUrl, primaryColor), injection frontend
- **API Tenant :** Endpoints (GET/POST/PATCH/DELETE tenants), header `X-Tenant-ID` requis
- **Testing Isolation :** Tests automatisés (données, rate limits, branding)

**Public :** Architectes, Développeurs, Administrateurs

**Durée estimée :** 3-4 heures (implémentation complète)

**Prérequis :** Connaissance PostgreSQL, TypeScript, REST API

---

### 5. FAQ & Troubleshooting

**[FAQ-TROUBLESHOOTING.md](./FAQ-TROUBLESHOOTING.md)** (936 lignes, 20 KB)

**Contenu :**

- **FAQ Général :** Vérifier démarrage, logs, redémarrer services
- **FAQ Multi-Tenant :** Erreur "tenant_id required", impossible créer tenant, branding ne s'applique pas
- **FAQ Sécurité :** Rate limit exceeded, CORS blocked, audit logs manquants
- **FAQ Performance :** API lente, bundle trop gros, cache ne fonctionne pas
- **Troubleshooting Avancé :** Health check échoue, certificate expiré
- **Support :** Contacts (email, PagerDuty, Slack), escalation (L1/L2/L3)

**Public :** Administrateurs, Support technique, Utilisateurs avancés

**Durée estimée :** Consultation ponctuelle (5-30 minutes selon problème)

**Prérequis :** Aucun (documentation de référence)

---

## Documents Complémentaires

### Documentation Technique Existante

**[OWASP-TOP-10-CHECKLIST.md](./OWASP-TOP-10-CHECKLIST.md)** (489 lignes, 14 KB)

- Checklist complète OWASP Top 10:2021
- Score 10/10 (Production Ready)
- Test plans pour chaque catégorie

**[SECURITY-MONITORING-ALERTS.md](./SECURITY-MONITORING-ALERTS.md)** (623 lignes, 14 KB)

- Métriques détaillées (security, application, infrastructure)
- Règles d'alertes Prometheus (critical, warning)
- Dashboards Grafana (Security Overview, API Performance, Infrastructure Health)
- SOAR automation (auto-response scripts)

---

## Workflows Recommandés

### Workflow 1 : Premier Déploiement

1. **[ENTERPRISE-QUICKSTART.md](./ENTERPRISE-QUICKSTART.md)** : Installation complète (30-45 min)
2. **[SECURITY-CONFIGURATION.md](./SECURITY-CONFIGURATION.md)** : Hardening sécurité (1-2h)
3. **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** : Installer monitoring (2-3h)
4. **[MULTI-TENANT-GUIDE.md](./MULTI-TENANT-GUIDE.md)** : Créer premiers tenants (1h)
5. **Tests validation** : Health checks, isolation, rate limits

**Durée totale :** 1 journée (6-8 heures)

### Workflow 2 : Onboarding Nouveau Tenant

1. **[MULTI-TENANT-GUIDE.md](./MULTI-TENANT-GUIDE.md)** : Créer tenant via API admin
2. **[SECURITY-CONFIGURATION.md](./SECURITY-CONFIGURATION.md)** : Configurer rate limits selon tier
3. **[MULTI-TENANT-GUIDE.md](./MULTI-TENANT-GUIDE.md)** : Configurer branding personnalisé
4. **Tests isolation** : Vérifier données isolées
5. **Formation client** : Accès, quotas, support

**Durée totale :** 1-2 heures

### Workflow 3 : Résolution Incident Production

1. **[FAQ-TROUBLESHOOTING.md](./FAQ-TROUBLESHOOTING.md)** : Identifier symptôme
2. **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** : Consulter dashboards Grafana + logs Loki
3. **Diagnostic approfondi** : Logs PostgreSQL, Redis, API
4. **Application du fix** : Selon root cause
5. **Post-mortem** : Documenter incident, améliorer alertes

**Durée totale :** Variable (15 min - 4 heures selon criticité)

### Workflow 4 : Audit Sécurité Trimestriel

1. **[OWASP-TOP-10-CHECKLIST.md](./OWASP-TOP-10-CHECKLIST.md)** : Vérifier compliance (1h)
2. **[SECURITY-CONFIGURATION.md](./SECURITY-CONFIGURATION.md)** : Rotation secrets Vault (30 min)
3. **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** : Review logs audit 3 mois (1h)
4. **Pentest externe** : Scanner OWASP ZAP, Burp Suite (2-4h)
5. **Rapport compliance** : Documenter findings, plan d'action

**Durée totale :** 1 journée

---

## Matrices de Référence Rapide

### Tableau 1 : Tiers d'Abonnement

| Tier       | Prix/mois | Users | Plugins | Rate Limit (req/min) | Features                            |
| ---------- | --------- | ----- | ------- | -------------------- | ----------------------------------- |
| Free       | $0        | 5     | 50      | 100                  | Base features                       |
| Starter    | $29       | 20    | 200     | 500                  | + Analytics, Priority support       |
| Pro        | $99       | 100   | 1000    | 1000                 | + Custom branding, SSO              |
| Enterprise | Custom    | ∞     | ∞       | 10000                | + Dedicated, SLA 99.9%, Multi-region|

### Tableau 2 : Ports et Services

| Service        | Port  | Protocole | Exposition | Description                         |
| -------------- | ----- | --------- | ---------- | ----------------------------------- |
| API            | 8787  | HTTPS     | Public     | API REST Cartae                     |
| PostgreSQL     | 5432  | TCP       | Interne    | Base de données principale          |
| Redis          | 6379  | TCP       | Interne    | Cache et rate limiting              |
| Vault          | 8200  | HTTPS     | Interne    | Secrets management                  |
| Prometheus     | 9090  | HTTP      | Interne    | Métriques collection                |
| Grafana        | 3000  | HTTPS     | Public     | Dashboards monitoring               |
| Loki           | 3100  | HTTP      | Interne    | Log aggregation                     |
| Alertmanager   | 9093  | HTTP      | Interne    | Alert routing                       |

### Tableau 3 : Variables d'Environnement Critiques

| Variable                  | Type    | Défaut       | Description                            |
| ------------------------- | ------- | ------------ | -------------------------------------- |
| `DATABASE_URL`            | string  | -            | PostgreSQL connection string (requis)  |
| `REDIS_URL`               | string  | -            | Redis connection string (requis)       |
| `VAULT_ADDR`              | string  | -            | Vault server address (requis)          |
| `JWT_SECRET_KEY`          | string  | -            | JWT signing key (requis, 64 bytes)     |
| `API_KEY_ADMIN`           | string  | -            | Admin API key (requis, 32 bytes)       |
| `RATE_LIMIT_DEFAULT`      | number  | 100          | Rate limit par défaut (req/min)        |
| `ALLOWED_ORIGINS`         | string  | ""           | CORS whitelist (comma-separated)       |
| `AUDIT_LOG_ENABLED`       | boolean | true         | Activer audit logging                  |

### Tableau 4 : Checklist Production

**Avant déploiement, vérifier :**

- [ ] PostgreSQL 16+ avec SSL/TLS
- [ ] Redis 7.2+ avec persistence (RDB + AOF)
- [ ] HashiCorp Vault initialisé et unsealed
- [ ] Certificat TLS valide (Let's Encrypt ou enterprise)
- [ ] Variables `.env.local` configurées (secrets, DB, Redis, Vault)
- [ ] Rate limiting activé (backend Redis ou KV)
- [ ] CORS whitelist restrictive (pas de wildcard `*`)
- [ ] Audit logging activé (`AUDIT_LOG_ENABLED=true`)
- [ ] Security headers activés (CSP, HSTS, X-Frame-Options)
- [ ] Monitoring installé (Prometheus + Grafana + Loki)
- [ ] Alertes configurées (Slack + Email + PagerDuty)
- [ ] Fail2ban configuré et testé
- [ ] Backup automatique activé (PostgreSQL + Vault)
- [ ] Tests isolation multi-tenant passés
- [ ] Pentest externe effectué (OWASP ZAP, Burp Suite)

---

## Statistiques Documentation

**Total :** 5 guides principaux + 2 documents techniques

**Lignes de code/documentation :** 4,277 lignes (guides) + 1,112 lignes (docs techniques) = **5,389 lignes**

**Taille totale :** 105 KB

**Pages estimées (imprimées) :** ~200 pages A4

**Temps lecture complet :** 8-10 heures

**Temps implémentation complète :** 2-3 jours (16-24 heures)

---

## Support et Contribution

### Contacts

**Support technique :**

- Email : support@cartae.com
- Slack : [cartae-community.slack.com](https://cartae-community.slack.com)
- GitHub Issues : https://github.com/votre-org/cartae-enterprise/issues

**Incidents critiques :**

- Email : incidents@cartae.com
- PagerDuty : https://cartae.pagerduty.com
- Téléphone : +33 1 XX XX XX XX (24/7)

### Contribution

Cette documentation est open-source. Contributions bienvenues :

```bash
# Fork repository
git clone https://github.com/votre-org/cartae-enterprise.git

# Créer branche
git checkout -b docs/amelioration-guide-monitoring

# Éditer documentation
nano docs/MONITORING-GUIDE.md

# Commit et push
git add docs/MONITORING-GUIDE.md
git commit -m "docs: améliorer section Fail2ban"
git push origin docs/amelioration-guide-monitoring

# Créer Pull Request
gh pr create --title "docs: améliorer section Fail2ban" --body "Ajout exemples filters Fail2ban"
```

---

## Changelog Documentation

**Version 1.0 (2025-11-17) :**

- Création initiale des 5 guides principaux
- Couverture complète Sessions 84-86
- OWASP Top 10 compliance 10/10
- Production-ready documentation

**Prochaines versions :**

- Guide disaster recovery (backup/restore complet)
- Guide migration (upgrade major versions)
- Guide performance tuning (PostgreSQL, Redis, caching)
- Guide Kubernetes deployment (au-delà de Docker Compose)

---

**Dernière mise à jour :** 2025-11-17
**Version :** 1.0
**Statut :** Production Ready
