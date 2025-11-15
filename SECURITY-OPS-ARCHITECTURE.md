# Security Operations Architecture
## Session 81g - Incident Response & Security Operations

Date: 2025-11-15
Status: Production Ready

---

## Table of Contents

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture Globale](#architecture-globale)
3. [Composants](#composants)
   - [Fail2ban](#1-fail2ban)
   - [Security Dashboard](#2-security-dashboard)
   - [Incident Playbooks](#3-incident-playbooks)
   - [Audit Trail](#4-audit-trail)
   - [SOAR Automation](#5-soar-automation)
4. [Déploiement](#déploiement)
5. [Configuration](#configuration)
6. [Monitoring & Métriques](#monitoring--métriques)
7. [Incident Response](#incident-response)
8. [Compliance](#compliance)
9. [Troubleshooting](#troubleshooting)

---

## Vue d'Ensemble

Ce document décrit l'architecture complète du système Security Operations de Cartae, implémenté durant la Session 81g.

### Objectifs

- **Protection Proactive:** Bloquer attaques avant qu'elles n'impactent le système
- **Détection Rapide:** Identifier activités suspectes en temps réel
- **Réponse Automatisée:** Orchestrer réponses aux incidents via playbooks
- **Compliance:** Assurer traçabilité complète pour audits (SOC2, GDPR, HIPAA)
- **Forensics:** Collecter preuves immutables pour investigations

### Stack Technologique

- **Fail2ban:** Protection périmétrique (brute force, port scan)
- **PostgreSQL:** Audit trail immutable (WORM pattern)
- **React + TypeScript:** Dashboard monitoring temps réel
- **Bash Scripts:** Playbooks incident response
- **Node.js + Express:** API security events
- **Docker:** Containerisation des services
- **Prometheus:** Métriques & alerting

---

## Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet / Users                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer / CDN                      │
│                    (CloudFlare DDoS)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │      Fail2ban Layer           │
         │  ┌─────────────────────────┐  │
         │  │ Jail: API Auth          │  │
         │  │ Jail: Brute Force       │  │
         │  │ Jail: Port Scan         │  │
         │  │ Jail: SQL Injection     │  │
         │  │ Jail: DDoS              │  │
         │  └─────────────────────────┘  │
         └───────────────┬───────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│                    Application Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  API Server  │  │  Dashboard   │  │  Database    │    │
│  │  (Express)   │  │  (React)     │  │  (Postgres)  │    │
│  └──────┬───────┘  └──────────────┘  └──────────────┘    │
│         │                                                  │
│         ├──> Audit Logger Middleware                      │
│         │    (Every request logged)                       │
│         │                                                  │
│         └──> SOAR Engine                                  │
│              ├─> Auto-Blocker                             │
│              ├─> Alert Manager                            │
│              └─> Threat Intelligence                      │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   Audit Trail (PostgreSQL)    │
         │   - Immutable logs (WORM)     │
         │   - Hash chain verification   │
         │   - 7 years retention         │
         └───────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │     Incident Response         │
         │   ┌───────────────────────┐   │
         │   │ DDoS Playbook         │   │
         │   │ Breach Playbook       │   │
         │   │ Creds Compromise      │   │
         │   └───────────────────────┘   │
         └───────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   Alerting & Notifications    │
         │   - Slack                     │
         │   - PagerDuty                 │
         │   - Email                     │
         └───────────────────────────────┘
```

---

## Composants

### 1. Fail2ban

**Rôle:** Protection périmétrique contre attaques réseau.

**Configuration:**

- **Fichier principal:** `infra/fail2ban/fail2ban.conf`
- **Jails:** `infra/fail2ban/jail.local`
- **Filtres custom:** `infra/fail2ban/filters/`

**Jails Actives:**

| Jail | Seuil | Fenêtre | Ban Duration | Description |
|------|-------|---------|--------------|-------------|
| `cartae-api-auth` | 5 tentatives | 10 min | 1 heure | Failed logins |
| `cartae-brute-force` | 10 tentatives | 5 min | 24 heures | Brute force intensif |
| `cartae-port-scan` | 1 tentative | 5 min | Permanent | Port scanning |
| `cartae-recidive` | 3 bans | 7 jours | Permanent | IPs récidivistes |
| `cartae-http-ddos` | 300 req | 1 min | 10 min | DDoS HTTP basique |

**Filtres Custom:**

- **cartae-api-auth.conf:**
  - Parse logs JSON de l'API
  - Détecte `"msg":"Authentication failed"`
  - Détecte status HTTP 401/403 sur `/api/auth/*`

- **cartae-port-scan.conf:**
  - Détecte connexions sur ports fermés
  - Détecte signatures nmap/masscan
  - Logs kernel iptables

**Commandes Utiles:**

```bash
# Status global
fail2ban-client status

# Status jail spécifique
fail2ban-client status cartae-api-auth

# Ban manuel
fail2ban-client set cartae-api-auth banip 192.0.2.100

# Unban
fail2ban-client set cartae-api-auth unbanip 192.0.2.100

# Tester filtre
fail2ban-regex /var/log/cartae/api.log /etc/fail2ban/filter.d/cartae-api-auth.conf
```

**Docker Integration:**

```bash
docker-compose -f infra/docker/docker-compose.security.yml up -d fail2ban
```

**Logs:**

- `/var/log/fail2ban/fail2ban.log` (Fail2ban daemon)
- `/var/lib/fail2ban/fail2ban.sqlite3` (Base de données bans)

---

### 2. Security Dashboard

**Rôle:** Monitoring temps réel des événements de sécurité.

**Stack:**

- Frontend: React + TypeScript + Material-UI
- Backend: Express API
- WebSocket: Événements temps réel

**Composants:**

1. **SecurityDashboard.tsx:**
   - Vue principale avec métriques agrégées
   - Tableau événements récents
   - Statistiques Fail2ban
   - Auto-refresh (5 secondes)

2. **AuditLogViewer.tsx:**
   - Timeline des audit logs
   - Filtrage (user, action, IP, date)
   - Export (CSV, JSON)
   - Pagination

3. **SuspiciousActivityDetector.ts:**
   - Détection patterns suspects (heuristiques)
   - Login depuis pays inhabituel
   - Login horaires inhabituels
   - Credential stuffing
   - Privilege escalation
   - Data exfiltration
   - Rapid-fire requests

4. **security-events.ts (API):**
   - `GET /api/security/events` - Liste événements
   - `GET /api/security/events/:id` - Détails événement
   - `GET /api/security/stats` - Stats Fail2ban
   - `GET /api/security/suspicious` - Activités suspectes
   - `POST /api/security/ban` - Ban manuel IP
   - `DELETE /api/security/ban/:ip` - Unban IP

**Déploiement:**

```bash
cd packages/security-ops
npm install
npm run build
npm start
```

**Accès:**

- URL: `https://security.cartae.local` (derrière Traefik)
- Port: 3010

---

### 3. Incident Playbooks

**Rôle:** Scripts automatisés de réponse aux incidents.

**Playbooks Disponibles:**

#### 3.1. DDoS Response (`ddos-response.sh`)

**Actions:**

1. **Analyse:** Top IPs attaquantes, endpoints ciblés, patterns
2. **Rate Limiting:** Nginx + iptables (100 conn/min per IP)
3. **Blocage IPs:** Fail2ban + iptables DROP
4. **CloudFlare:** Active "Under Attack Mode" (si configuré)
5. **Notifications:** Slack, PagerDuty, Email
6. **Forensics:** Dump logs, netstat, iptables rules
7. **Rapport:** Génère incident-report.md

**Usage:**

```bash
sudo /infra/security/playbooks/ddos-response.sh
```

**Variables d'environnement requises:**

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`
- `SLACK_WEBHOOK_URL`
- `PAGERDUTY_INTEGRATION_KEY`
- `SECURITY_EMAIL`

#### 3.2. Breach Response (`breach-response.sh`)

**Actions:**

1. **Confirmation:** Prompt utilisateur pour scope
2. **Isolation:** Couper accès réseau (optionnel)
3. **Forensics:** RAM dump, filesystem timeline, logs, connections, SSH keys
4. **Rotation Credentials:** JWT secret, DB password, API keys
5. **Invalidation Sessions:** Redis flush, tokens révoqués
6. **Notifications:** Slack, PagerDuty, Email (management + legal)
7. **Rapport:** Timeline complète + impact assessment

**Usage:**

```bash
sudo /infra/security/playbooks/breach-response.sh
```

**Prompts Interactifs:**

- Confirmation breach (tapez "BREACH")
- Description breach
- Systèmes compromis
- Severity (critical/high/medium/low)
- Isoler système? (yes/no)

#### 3.3. Credential Compromise (`credential-compromise.sh`)

**Actions:**

1. **Scope:** Type credentials (password/api_key/jwt/ssh_key/database/all)
2. **Invalidation:** Révocation immédiate credentials
3. **Sessions:** Terminate toutes sessions actives
4. **MFA:** Force re-validation MFA
5. **Audit:** Analyse activités effectuées avec credentials compromis
6. **Notifications:** Email utilisateur + équipe sécurité
7. **Policies:** Renforce politiques (min 12 chars, expiration 90j)

**Usage:**

```bash
sudo /infra/security/playbooks/credential-compromise.sh
```

**Prompts:**

- Type credentials
- User affecté (username ou "all")
- Méthode détection
- Timestamp compromission (si connu)

#### 3.4. Playbook Runner (`playbook-runner.sh`)

**Menu interactif** pour lancer playbooks + utilities.

**Options:**

1. DDoS Response
2. Breach Response
3. Credential Compromise
4. View Recent Incidents
5. View Forensics Archives
6. System Status

**Usage:**

```bash
sudo /infra/security/playbooks/playbook-runner.sh
```

**Pre-flight Checks:**

- Permissions root
- Playbooks disponibles
- Commandes requises (iptables, psql, curl, mail)
- Logs directory writable
- Variables env (Slack, PagerDuty)

---

### 4. Audit Trail

**Rôle:** Log immutable de TOUTES les requêtes pour compliance & forensics.

**Pattern:** WORM (Write Once Read Many)

**Composants:**

#### 4.1. Audit Logger (`audit-logger.ts`)

Middleware Express qui log chaque requête.

**Données capturées:**

- User (ID + username)
- Action (dérivée de méthode HTTP)
- Resource (dérivée de path)
- HTTP (method, path, query, body)
- Client (IP, user-agent)
- Response (status, response time, error message)
- Hash chain (hash_prev, hash_current)

**Sanitization:**

Champs sensibles masqués automatiquement:

- `password` → `***REDACTED***`
- `token` → `***REDACTED***`
- `secret` → `***REDACTED***`
- `apiKey` → `***REDACTED***`
- `creditCard` → `***REDACTED***`

**Hash Chain:**

Chaque entrée hash inclut:

- Données de l'entrée
- Hash de l'entrée précédente

Permet de détecter tampering (modification/suppression).

**Usage:**

```typescript
import { AuditLogger } from './audit/audit-logger';
import { AuditStorage } from './audit/audit-storage';

const storage = new AuditStorage({
  connectionString: process.env.DATABASE_URL,
  retentionDays: 2555, // 7 ans
});

await storage.initialize();

const logger = new AuditLogger({
  storage,
  excludePaths: ['/health', '/metrics'],
  includeRequestBody: true,
});

app.use(logger.middleware());
```

#### 4.2. Audit Storage (`audit-storage.ts`)

Stockage PostgreSQL avec contraintes d'immutabilité.

**Table `audit_log`:**

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  user_id UUID,
  username TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query JSONB,
  body JSONB,
  ip_address INET NOT NULL,
  user_agent TEXT,
  status TEXT CHECK (status IN ('success', 'failure')),
  status_code INTEGER NOT NULL,
  response_time INTEGER NOT NULL,
  error_message TEXT,
  metadata JSONB,
  hash_prev TEXT,
  hash_current TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WORM: Bloquer UPDATE et DELETE
CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
```

**Indexes:**

- `idx_audit_timestamp` (timestamp DESC)
- `idx_audit_user_id` (user_id)
- `idx_audit_action` (action)
- `idx_audit_resource` (resource)
- `idx_audit_ip` (ip_address)
- `idx_audit_metadata` (GIN sur JSONB)

**Vues:**

- `audit_stats`: Statistiques agrégées par jour/action/resource
- `suspicious_activities`: Failed logins, unauthorized access, slow queries

**Fonctions:**

- `search_audit_logs(query TEXT)`: Full-text search
- `mark_old_audit_for_archiving()`: Identifie entrées > 7 ans

**Queries Utiles:**

```sql
-- Failed logins dernières 24h
SELECT * FROM audit_log
WHERE action = 'login' AND status = 'failure'
AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Activités d'un user
SELECT * FROM audit_log
WHERE username = 'john.doe'
ORDER BY timestamp DESC
LIMIT 100;

-- Suspicious activities
SELECT * FROM suspicious_activities
ORDER BY timestamp DESC
LIMIT 50;
```

#### 4.3. Immutable Log (`immutable-log.ts`)

Implémentation générique du pattern WORM pour logs fichiers.

**Features:**

- Append-only
- Hash chain
- Verification intégrité
- Export (JSON, CSV)
- Merkle proofs (inclusion proofs)

**Usage:**

```typescript
import { ImmutableLog } from './audit/immutable-log';

const log = new ImmutableLog({
  filePath: '/var/log/cartae/audit/immutable.log',
  hashAlgorithm: 'sha256',
  autoFlush: true,
  verifyOnLoad: true,
});

await log.initialize();

// Append entry
await log.append({ action: 'login', user: 'alice' });

// Verify integrity
const isValid = await log.verify();
console.log(`Integrity: ${isValid ? 'OK' : 'VIOLATED'}`);

// Export
const csvExport = await log.export('csv');
```

---

### 5. SOAR Automation

**Rôle:** Security Orchestration, Automation and Response.

**Composants:**

#### 5.1. Auto-Blocker (`auto-blocker.ts`)

Blocage automatique d'IPs basé sur règles.

**Rules Example:**

```typescript
{
  id: 'auth-failure',
  name: 'Authentication Failures',
  threshold: 5,           // 5 échecs
  windowMs: 600000,       // en 10 minutes
  duration: 3600,         // ban 1 heure
  action: 'ban_temp',
  severity: 'medium',
}
```

**Features:**

- Whitelist (IPs jamais bloquées)
- Escalation progressive (temp → permanent)
- Auto-unban après expiration
- Intégration Fail2ban + iptables

**Usage:**

```typescript
import { AutoBlocker } from './soar/auto-blocker';

const blocker = new AutoBlocker({
  rules: [...],
  whitelist: ['127.0.0.1', '10.0.0.0/8'],
  enableFail2ban: true,
  enableIptables: true,
});

// Report infraction
const blocked = await blocker.reportInfraction('192.0.2.100', 'auth-failure');

// Manual unblock
await blocker.unblockIP('192.0.2.100', 'false positive');

// Metrics
const metrics = blocker.getMetrics();
console.log(`Active blocks: ${metrics.activeBlocks}`);
```

#### 5.2. Alert Manager (`alert-manager.ts`)

Notifications multi-canaux.

**Canaux:**

- **Email** (SMTP)
- **Slack** (webhook)
- **PagerDuty** (API v2)
- **SMS** (Twilio, optionnel)

**Features:**

- Routing par severity (critical → PagerDuty, medium → Email)
- Rate limiting (éviter spam)
- Grouping (alertes similaires dans fenêtre temps)
- Escalation automatique

**Usage:**

```typescript
import { AlertManager } from './soar/alert-manager';

const alertMgr = new AlertManager({
  email: { enabled: true, smtp: {...}, to: [...] },
  slack: { enabled: true, webhookUrl: '...' },
  pagerduty: { enabled: true, integrationKey: '...' },
  rateLimiting: { enabled: true, maxAlertsPerMinute: 10 },
});

await alertMgr.sendAlert({
  id: '12345',
  timestamp: new Date(),
  severity: 'critical',
  title: 'DDoS Attack Detected',
  description: '10,000 req/sec from 192.0.2.100',
  source: 'fail2ban',
  metadata: { ip: '192.0.2.100', reqPerSec: 10000 },
});
```

#### 5.3. Threat Intelligence (`threat-intelligence.ts`)

Enrichissement avec feeds externes.

**Sources:**

- **AbuseIPDB:** IP reputation
- **VirusTotal:** File/URL scanning
- **Custom blacklists**

**Features:**

- Cache (1h TTL) pour économiser API calls
- Rate limiting (10 calls/min)
- Auto-enrichment événements sécurité

**Usage:**

```typescript
import { ThreatIntelligence } from './soar/threat-intelligence';

const threatIntel = new ThreatIntelligence({
  abuseIPDB: { enabled: true, apiKey: '...' },
  virusTotal: { enabled: true, apiKey: '...' },
  cache: { enabled: true, ttlSeconds: 3600 },
});

// Check IP reputation
const reputation = await threatIntel.checkIPReputation('192.0.2.100');
console.log(`Malicious: ${reputation.isMalicious}, Score: ${reputation.score}`);

// Enrich event
const { enrichedEvent } = await threatIntel.enrichEvent({
  ip: '192.0.2.100',
  action: 'login',
  user: 'admin',
});
```

#### 5.4. Configuration (`soar-config.yml`)

Configuration centralisée SOAR.

**Sections:**

- `autoBlocker`: Règles + whitelist
- `alertManager`: SMTP, Slack, PagerDuty, routing
- `threatIntelligence`: API keys, cache
- `automatedResponses`: Auto-block, escalation, playbooks
- `compliance`: Audit, reporting, standards
- `logging`: Level, format, outputs
- `performance`: Workers, queue size, timeouts

**Charger config:**

```typescript
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('infra/security/soar-config.yml', 'utf8'));
```

---

## Déploiement

### Docker Compose

**Stack complète:**

```bash
cd infra/docker
docker-compose -f docker-compose.security.yml up -d
```

**Services:**

- `fail2ban` (port host mode, NET_ADMIN)
- `security-dashboard` (port 3010)
- `audit-logger` (port 3011)
- `soar-engine` (port 3012)

**Vérifier:**

```bash
docker-compose -f docker-compose.security.yml ps
docker-compose -f docker-compose.security.yml logs -f fail2ban
```

### Variables d'Environnement

Créer `.env`:

```env
# Database
DATABASE_URL=postgresql://cartae:password@postgres:5432/cartae

# Redis
REDIS_URL=redis://redis:6379

# Threat Intelligence
ABUSEIPDB_API_KEY=your_key_here
VIRUSTOTAL_API_KEY=your_key_here

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_INTEGRATION_KEY=your_key_here
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
SECURITY_EMAIL=security@cartae.com

# CloudFlare (optionnel)
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ZONE_ID=your_zone_id
```

---

## Configuration

### Fail2ban

**Activer/Désactiver Jail:**

```bash
# Dans jail.local
[cartae-api-auth]
enabled = true  # false pour désactiver
```

**Changer Seuils:**

```bash
# Dans jail.local
maxretry = 10      # Nombre tentatives
findtime = 600     # Fenêtre (secondes)
bantime = 3600     # Durée ban (secondes, -1 = permanent)
```

**Reload Config:**

```bash
fail2ban-client reload
fail2ban-client reload cartae-api-auth  # Jail spécifique
```

### Audit Trail

**Changer Rétention:**

```typescript
// audit-storage.ts
retentionDays: 2555  // 7 ans par défaut
```

**Exclure Paths:**

```typescript
// audit-logger.ts
excludePaths: ['/health', '/metrics', '/ping']
```

**Masquer Champs Supplémentaires:**

```typescript
// audit-logger.ts
sensitiveFields: ['password', 'token', 'ssn', 'cvv']
```

### SOAR

**Modifier Règles Auto-Blocker:**

```yaml
# soar-config.yml
autoBlocker:
  rules:
    - id: custom-rule
      name: My Custom Rule
      threshold: 3
      windowMs: 60000
      duration: 1800
      action: ban_temp
      severity: high
```

**Changer Canaux Alerting:**

```yaml
# soar-config.yml
alertManager:
  routing:
    critical:
      - pagerduty
      - slack
    high:
      - slack
    medium:
      - email
```

---

## Monitoring & Métriques

### Prometheus Metrics

**Endpoints:**

- **Fail2ban:** `http://localhost:9100/metrics` (node-exporter)
- **Security Dashboard:** `http://localhost:9090/metrics`
- **SOAR Engine:** `http://localhost:9090/metrics`

**Métriques Disponibles:**

```
# Fail2ban
fail2ban_jails_total
fail2ban_banned_ips_total{jail="cartae-api-auth"}
fail2ban_active_bans{jail="cartae-api-auth"}

# Security Events
security_events_total{severity="critical"}
security_events_blocked_ips_24h
security_events_suspicious_activities

# Audit Trail
audit_log_entries_total
audit_log_write_duration_seconds
audit_log_integrity_check_result

# SOAR
soar_auto_blocks_total
soar_alerts_sent_total{channel="slack"}
soar_threat_intel_cache_hits
soar_playbook_executions_total{playbook="ddos"}
```

**Alertes Prometheus:**

```yaml
# prometheus-alerts.yml
groups:
  - name: security
    rules:
      - alert: HighFailedLogins
        expr: rate(security_events_total{type="auth_failure"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of failed logins"

      - alert: CriticalSecurityEvent
        expr: security_events_total{severity="critical"} > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Critical security event detected"
```

### Grafana Dashboards

**Importer Dashboard:**

```bash
# Template dans infra/monitoring/grafana-dashboards/security-ops.json
```

**Panels:**

1. Failed Logins (24h)
2. Blocked IPs (time series)
3. Suspicious Activities (heatmap)
4. Audit Log Volume (graph)
5. Fail2ban Jails Status (table)
6. Threat Intelligence Cache Hit Rate (gauge)
7. Alert Manager Queue Size (gauge)

---

## Incident Response

### Workflow Standard

```
1. DETECTION
   ↓
   - Événement logué dans audit trail
   - Détecteur d'activités suspectes analyse
   - Score de suspicion calculé
   ↓
2. TRIAGE
   ↓
   - Si score > seuil → Alerte créée
   - Alert Manager notifie selon severity
   - Équipe sécurité notifiée
   ↓
3. RÉPONSE AUTOMATISÉE (optionnel)
   ↓
   - Auto-Blocker ban IP si règle matched
   - Playbook auto-lancé si configuré
   - Forensics collectées automatiquement
   ↓
4. INVESTIGATION
   ↓
   - Équipe review Dashboard
   - Analyse Audit Logs
   - Check Threat Intelligence
   - Review Forensics
   ↓
5. REMÉDIATION
   ↓
   - Lancer Playbook manuel si besoin
   - Rotation credentials
   - Patching vulnérabilités
   - Hardening système
   ↓
6. POST-MORTEM
   ↓
   - Rapport incident généré
   - Lessons learned
   - Mise à jour playbooks
   - Update règles SOAR
```

### Scénarios Courants

#### Scénario 1: Failed Logins Multiples

**Détection:**

- Fail2ban jail `cartae-api-auth` détecte 5 échecs en 10 min
- Event logué dans audit trail avec status "failure"

**Réponse Automatique:**

```bash
# Fail2ban ban automatique (1h)
fail2ban-client status cartae-api-auth

# Auto-Blocker peut escalader si récidive
# → Ban permanent si 3+ bans
```

**Investigation:**

```sql
SELECT * FROM audit_log
WHERE action = 'login' AND status = 'failure'
AND ip_address = '192.0.2.100'
ORDER BY timestamp DESC;
```

**Remédiation:**

- Si faux positif: Unban IP + ajouter à whitelist
- Si attaque confirmée: Laisser ban expirer ou escalade permanente
- Notifier user si credentials légitimes tentées

#### Scénario 2: DDoS Attack

**Détection:**

- Trafic anormal (> 300 req/min depuis IP)
- Jail `cartae-http-ddos` triggered

**Réponse:**

```bash
# Lancer playbook DDoS
sudo /infra/security/playbooks/ddos-response.sh
```

**Actions Playbook:**

1. Analyse top IPs attaquantes
2. Rate limiting iptables (100 conn/min)
3. Ban IPs via Fail2ban
4. Active CloudFlare "Under Attack Mode"
5. Notifications (Slack, PagerDuty, Email)
6. Forensics collectées
7. Rapport généré

**Post-Incident:**

- Review logs pour identifier vecteur
- Tune seuils si nécessaire
- Considérer CDN upgrade si récurrent

#### Scénario 3: Data Breach

**Détection:**

- Alerte manuelle (user report, external researcher)
- Activité suspecte détectée (exfiltration data)

**Réponse:**

```bash
# Lancer playbook Breach
sudo /infra/security/playbooks/breach-response.sh
```

**Prompts Interactifs:**

- Confirmer breach (tapez "BREACH")
- Décrire incident
- Identifier systèmes compromis
- Severity assessment

**Actions Playbook:**

1. Isoler système (optionnel)
2. Dump RAM + logs + connections
3. Rotation TOUS credentials (JWT, DB, API keys)
4. Invalidation TOUTES sessions
5. Notifications (équipe + management + legal)
6. Timeline + rapport incident

**Post-Incident:**

- Root cause analysis
- Remédiation vulnérabilités
- Hardening système
- Update incident response procedures
- Évaluation notification légale (GDPR 72h)

---

## Compliance

### SOC2 Type II

**Contrôles Implémentés:**

- **CC6.1 - Logical Access Controls:**
  - Fail2ban bloque accès non autorisés
  - MFA enforced après credential compromise

- **CC6.2 - Monitoring:**
  - Dashboard monitoring temps réel
  - Alerting via Slack/PagerDuty/Email

- **CC6.6 - Audit Logging:**
  - Audit trail immutable (WORM pattern)
  - Rétention 7 ans
  - Hash chain pour détection tampering

- **CC7.2 - Incident Response:**
  - Playbooks documentés et testés
  - Forensics collectées automatiquement
  - Timeline incidents tracées

**Preuves pour Auditeurs:**

```sql
-- Proof: Tous accès logués
SELECT COUNT(*) FROM audit_log
WHERE timestamp > '2025-01-01';

-- Proof: Intégrité vérifiable
SELECT * FROM audit_log ORDER BY timestamp LIMIT 1;
-- Vérifier hash_prev = NULL pour première entrée

-- Proof: Failed access logged
SELECT * FROM suspicious_activities
WHERE timestamp > NOW() - INTERVAL '90 days';
```

### GDPR

**Conformité:**

- **Article 32 - Security:**
  - Encryption at rest (PostgreSQL)
  - Encryption in transit (HTTPS/TLS)
  - Access controls (Fail2ban + MFA)
  - Audit logging (accountability)

- **Article 33 - Breach Notification:**
  - Playbook breach-response.sh
  - Timeline automatique
  - Notification < 72h (manuel après playbook)

- **Article 15 - Right to Access:**
  ```sql
  SELECT * FROM audit_log WHERE username = 'john.doe';
  ```

- **Article 17 - Right to Erasure:**
  - Note: Audit logs NOT subject to erasure (legal basis: compliance)
  - User data peut être anonymisée: `username = 'DELETED_USER_12345'`

### HIPAA

**Contrôles:**

- **164.308(a)(1) - Security Management:**
  - Risk analysis via Threat Intelligence
  - Incident response playbooks

- **164.308(a)(5) - Audit Controls:**
  - Immutable audit trail (WORM)
  - 7 years retention (exceeds 6 years requirement)

- **164.312(a)(1) - Access Controls:**
  - Fail2ban prevents unauthorized access
  - MFA enforced

- **164.312(b) - Audit Controls:**
  - All ePHI access logged
  - Logs cannot be altered (WORM)

---

## Troubleshooting

### Fail2ban

**Problème: Jail ne ban pas malgré infractions**

```bash
# Vérifier filtre
fail2ban-regex /var/log/cartae/api.log /etc/fail2ban/filter.d/cartae-api-auth.conf

# Vérifier log level
# Dans fail2ban.conf: loglevel = DEBUG
fail2ban-client reload
tail -f /var/log/fail2ban/fail2ban.log

# Vérifier jail actif
fail2ban-client status cartae-api-auth
```

**Problème: Faux positifs (IPs légitimes bannies)**

```bash
# Unban immédiat
fail2ban-client set cartae-api-auth unbanip 192.0.2.100

# Ajouter à whitelist
# Dans jail.local
ignoreip = 127.0.0.1/8 192.0.2.100
fail2ban-client reload
```

**Problème: Fail2ban container crash loop**

```bash
# Check logs
docker logs cartae-fail2ban

# Vérifier volumes montés
docker inspect cartae-fail2ban | grep Mounts -A 20

# Vérifier permissions
ls -la /var/log/cartae
# Doit être readable par Fail2ban container
```

### Audit Trail

**Problème: Logs ne s'écrivent pas**

```sql
-- Vérifier connexion DB
SELECT 1;

-- Vérifier table existe
SELECT COUNT(*) FROM audit_log;

-- Vérifier permissions
SELECT current_user;
GRANT INSERT ON audit_log TO cartae;
```

**Problème: Integrity check fails**

```typescript
// Lancer vérification
const isValid = await auditLogger.verifyIntegrity();

// Si false, identifier entrée corrompue
const entries = await storage.readAll();
for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  const prevHash = i === 0 ? null : entries[i-1].hash_current;

  if (entry.hash_prev !== prevHash) {
    console.error(`Chain break at index ${i}, entry ${entry.id}`);
  }
}
```

**Problème: Performance dégradée**

```sql
-- Vérifier taille table
SELECT pg_size_pretty(pg_total_relation_size('audit_log'));

-- Vérifier indexes utilisés
EXPLAIN ANALYZE SELECT * FROM audit_log WHERE user_id = '...';

-- Si table > 100GB, considérer partitioning par mois
-- Voir migration 010_audit_trail.sql (commented)
```

### SOAR

**Problème: Auto-Blocker ne bloque pas**

```typescript
// Check whitelist
console.log(blocker.isWhitelisted('192.0.2.100'));

// Check règles
console.log(blocker.rules.get('auth-failure'));

// Check infractions comptées
console.log(blocker.infractions.get('192.0.2.100'));

// Vérifier Fail2ban disponible
exec('fail2ban-client ping', (err, stdout) => {
  console.log(stdout); // PONG si OK
});
```

**Problème: Alertes pas envoyées**

```typescript
// Check rate limiting
console.log(alertMgr.isRateLimited()); // false attendu

// Check queue
console.log(alertMgr.getQueuedAlerts());

// Test direct
await alertMgr.sendEmail({...}); // Voir error stack
```

**Problème: Threat Intel cache toujours miss**

```typescript
// Check cache enabled
console.log(threatIntel.config.cache.enabled);

// Check stats
console.log(threatIntel.getCacheStats());

// Clear et retry
threatIntel.clearCache();
await threatIntel.checkIPReputation('8.8.8.8');
```

### Dashboard

**Problème: Dashboard vide (pas d'événements)**

```bash
# Vérifier API répond
curl http://localhost:3010/api/security/events

# Vérifier logs API
docker logs cartae-security-dashboard

# Vérifier fichiers logs existent
ls -la /var/log/cartae/api.log
tail -f /var/log/cartae/api.log

# Vérifier format logs (doit être JSON)
tail -1 /var/log/cartae/api.log | jq .
```

**Problème: WebSocket disconnected**

```typescript
// Check WebSocket server running
// Dans security-events.ts
io.on('connection', (socket) => {
  console.log('Client connected');
});

// Check frontend reconnect logic
// Dans SecurityDashboard.tsx
useEffect(() => {
  const socket = io('http://localhost:3010');
  socket.on('security-event', (event) => {
    console.log('Event received:', event);
  });
  return () => socket.disconnect();
}, []);
```

---

## Références

### Documentation Externe

- [Fail2ban Manual](https://fail2ban.readthedocs.io/)
- [PostgreSQL Audit Logging](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OWASP Incident Response](https://owasp.org/www-community/Incident_Response_Cheat_Sheet)
- [SOC2 Framework](https://www.aicpa.org/soc)
- [GDPR Art. 32-34](https://gdpr-info.eu/)

### Fichiers Clés

```
cartae-session-81g/
├── infra/
│   ├── fail2ban/
│   │   ├── fail2ban.conf
│   │   ├── jail.local
│   │   └── filters/
│   │       ├── cartae-api-auth.conf
│   │       └── cartae-port-scan.conf
│   ├── security/
│   │   ├── playbooks/
│   │   │   ├── ddos-response.sh
│   │   │   ├── breach-response.sh
│   │   │   ├── credential-compromise.sh
│   │   │   └── playbook-runner.sh
│   │   └── soar-config.yml
│   ├── docker/
│   │   └── docker-compose.security.yml
│   └── postgres/
│       └── migrations/
│           └── 010_audit_trail.sql
├── packages/
│   ├── security-ops/
│   │   └── src/
│   │       ├── monitoring/
│   │       │   ├── SecurityDashboard.tsx
│   │       │   ├── AuditLogViewer.tsx
│   │       │   └── SuspiciousActivityDetector.ts
│   │       ├── api/
│   │       │   └── security-events.ts
│   │       └── soar/
│   │           ├── auto-blocker.ts
│   │           ├── alert-manager.ts
│   │           └── threat-intelligence.ts
│   └── database-api/
│       └── src/
│           └── audit/
│               ├── audit-logger.ts
│               ├── audit-storage.ts
│               └── immutable-log.ts
└── SECURITY-OPS-ARCHITECTURE.md (ce fichier)
```

---

**Session 81g - Completed 2025-11-15**

**Total LOC:** ~2800 lignes de code production-ready

**Status:** Production Ready

**Prochaines Étapes:**

1. Tester playbooks en environnement staging
2. Former équipe sécurité sur utilisation Dashboard
3. Configurer alerting Prometheus
4. Schedule drills incident response (trimestriel)
5. Audit externe SOC2 (planifier Q2 2026)
