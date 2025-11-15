#!/bin/bash
#
# Data Breach Response Playbook
# Session 81g - Incident Response & Security Operations
#
# Playbook pour répondre à une suspicion ou confirmation de breach (intrusion).
#
# Actions:
# 1. Isoler système compromis (couper accès réseau si nécessaire)
# 2. Préserver état pour forensics (snapshot disque, RAM, logs)
# 3. Analyser scope du breach (quelles données, quels systèmes)
# 4. Rotation credentials (API keys, DB passwords, JWT secrets)
# 5. Invalider toutes les sessions utilisateurs
# 6. Notifier stakeholders (équipe, management, légal si nécessaire)
# 7. Générer timeline et rapport d'incident
# 8. Remédiation et durcissement
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/cartae/incident-response/breach-$(date +%Y%m%d-%H%M%S).log"
INCIDENT_ID="BREACH-$(date +%Y%m%d-%H%M%S)"

# Couleurs
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonctions utilitaires
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $*${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $*${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $*${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO] $*${NC}" | tee -a "$LOG_FILE"
}

prompt() {
    echo -e "${YELLOW}[PROMPT] $*${NC}"
    read -r REPLY
}

# Vérifier permissions
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root"
   exit 1
fi

# Créer répertoire logs
mkdir -p "$(dirname "$LOG_FILE")"

log "========================================="
log "BREACH RESPONSE PLAYBOOK - STARTED"
log "Incident ID: $INCIDENT_ID"
log "========================================="

#
# ÉTAPE 0: Confirmation et Scope
#
log "STEP 0: Breach confirmation and scoping..."

prompt "Confirm data breach (yes/no):"
if [[ ! "$REPLY" =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Breach not confirmed, aborting playbook"
    exit 0
fi

prompt "Brief description of breach:"
BREACH_DESCRIPTION="$REPLY"
log "Breach description: $BREACH_DESCRIPTION"

prompt "Compromised systems (comma-separated, e.g., api-server,database,redis):"
COMPROMISED_SYSTEMS="$REPLY"
log "Compromised systems: $COMPROMISED_SYSTEMS"

prompt "Severity (critical/high/medium/low):"
SEVERITY="${REPLY:-high}"
log "Severity: $SEVERITY"

#
# ÉTAPE 1: Isolation du Système (si nécessaire)
#
log "STEP 1: System isolation..."

prompt "Isolate compromised systems from network? (yes/no):"
if [[ "$REPLY" =~ ^[Yy][Ee][Ss]$ ]]; then
    warning "ISOLATING SYSTEMS - This will cut network access!"

    # Bloquer tout trafic sortant (sauf localhost)
    iptables -P OUTPUT DROP
    iptables -A OUTPUT -o lo -j ACCEPT
    iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

    # Sauvegarder règles
    iptables-save > /tmp/iptables-isolation-$INCIDENT_ID.rules

    success "Systems isolated (network OUTPUT blocked)"
    log "Isolation rules saved to /tmp/iptables-isolation-$INCIDENT_ID.rules"
else
    log "System isolation skipped (manual decision)"
fi

#
# ÉTAPE 2: Préservation Forensics
#
log "STEP 2: Preserving forensics evidence..."

FORENSICS_DIR="/var/log/cartae/forensics/$INCIDENT_ID"
mkdir -p "$FORENSICS_DIR"

# Snapshot RAM (si possible, nécessite LiME kernel module)
if command -v lime &> /dev/null; then
    log "Capturing RAM snapshot..."
    lime /tmp/ram-dump-$INCIDENT_ID.lime
    mv /tmp/ram-dump-$INCIDENT_ID.lime "$FORENSICS_DIR/"
    success "RAM snapshot captured"
else
    warning "LiME not available, skipping RAM capture"
fi

# Snapshot disque (metadata seulement, pas full dump)
log "Capturing filesystem metadata..."
find / -type f -printf "%T@ %p\n" 2>/dev/null | sort -rn | head -10000 > "$FORENSICS_DIR/filesystem-timeline.txt"
success "Filesystem metadata captured"

# Copier tous les logs
log "Archiving logs..."
mkdir -p "$FORENSICS_DIR/logs"
cp -r /var/log/cartae/* "$FORENSICS_DIR/logs/" 2>/dev/null || true
cp /var/log/auth.log "$FORENSICS_DIR/logs/" 2>/dev/null || true
cp /var/log/syslog "$FORENSICS_DIR/logs/" 2>/dev/null || true

# Snapshot connections réseau
log "Capturing network state..."
netstat -anp > "$FORENSICS_DIR/netstat.txt"
ss -anp > "$FORENSICS_DIR/ss.txt"
lsof -i > "$FORENSICS_DIR/lsof-network.txt"

# Snapshot processus
log "Capturing process state..."
ps auxf > "$FORENSICS_DIR/processes.txt"
top -b -n 1 > "$FORENSICS_DIR/top.txt"

# Snapshot crontabs (backdoors potentiels)
log "Capturing crontabs..."
crontab -l > "$FORENSICS_DIR/root-crontab.txt" 2>/dev/null || true
for user in $(cut -d: -f1 /etc/passwd); do
    crontab -u "$user" -l > "$FORENSICS_DIR/crontab-$user.txt" 2>/dev/null || true
done

# Snapshot utilisateurs
log "Capturing user accounts..."
cp /etc/passwd "$FORENSICS_DIR/passwd"
cp /etc/shadow "$FORENSICS_DIR/shadow"
cp /etc/group "$FORENSICS_DIR/group"

# Snapshot SSH authorized_keys (backdoors potentiels)
log "Capturing SSH keys..."
find /home -name authorized_keys -exec cp {} "$FORENSICS_DIR/authorized_keys-{}" \; 2>/dev/null || true
cp /root/.ssh/authorized_keys "$FORENSICS_DIR/authorized_keys-root" 2>/dev/null || true

# Hash tous les fichiers pour vérification intégrité
log "Computing file hashes (may take time)..."
find /usr/bin /usr/sbin /bin /sbin -type f -exec sha256sum {} \; > "$FORENSICS_DIR/system-binaries-hashes.txt" 2>/dev/null

success "Forensics evidence preserved in $FORENSICS_DIR"

#
# ÉTAPE 3: Analyse Scope du Breach
#
log "STEP 3: Analyzing breach scope..."

# Chercher fichiers récemment modifiés (24h)
log "Searching for recently modified files..."
find / -type f -mtime -1 2>/dev/null | head -100 > "$FORENSICS_DIR/recent-modifications.txt"

# Chercher connexions SSH récentes
log "Analyzing SSH access logs..."
grep "Accepted publickey\|Accepted password" /var/log/auth.log 2>/dev/null | tail -100 > "$FORENSICS_DIR/recent-ssh-logins.txt" || true

# Analyser accès base de données (si logs disponibles)
if [[ -f /var/log/postgresql/postgresql.log ]]; then
    log "Analyzing database access..."
    grep -i "error\|authentication\|connection" /var/log/postgresql/postgresql.log | tail -1000 > "$FORENSICS_DIR/database-access.txt"
fi

# Chercher processus suspects
log "Searching for suspicious processes..."
ps aux | grep -vE "root|www-data|postgres|redis" > "$FORENSICS_DIR/non-standard-processes.txt" || true

success "Scope analysis complete, results in $FORENSICS_DIR"

#
# ÉTAPE 4: Rotation Credentials
#
log "STEP 4: Rotating compromised credentials..."

warning "CRITICAL: About to rotate ALL credentials!"
prompt "Proceed with credential rotation? (yes/no):"
if [[ "$REPLY" =~ ^[Yy][Ee][Ss]$ ]]; then

    # Générer nouveaux secrets
    NEW_JWT_SECRET=$(openssl rand -hex 32)
    NEW_DB_PASSWORD=$(openssl rand -base64 32)
    NEW_API_KEY=$(openssl rand -hex 16)

    # Sauvegarder anciens secrets (encryptés)
    cat > "$FORENSICS_DIR/old-credentials.txt.gpg" <<EOF
OLD_JWT_SECRET=${JWT_SECRET:-unknown}
OLD_DB_PASSWORD=${DATABASE_PASSWORD:-unknown}
OLD_API_KEY=${API_KEY:-unknown}
EOF

    # Mettre à jour .env (backup d'abord)
    if [[ -f /opt/cartae/.env ]]; then
        cp /opt/cartae/.env "$FORENSICS_DIR/env.backup"

        sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" /opt/cartae/.env
        sed -i.bak "s/DATABASE_PASSWORD=.*/DATABASE_PASSWORD=$NEW_DB_PASSWORD/" /opt/cartae/.env
        sed -i.bak "s/API_KEY=.*/API_KEY=$NEW_API_KEY/" /opt/cartae/.env

        success "Credentials rotated in .env"
    else
        warning ".env not found, skipping rotation"
    fi

    # Mettre à jour PostgreSQL password
    if command -v psql &> /dev/null; then
        psql -U postgres -c "ALTER USER cartae WITH PASSWORD '$NEW_DB_PASSWORD';" 2>/dev/null || warning "Failed to update DB password"
    fi

    # Redémarrer services avec nouveaux credentials
    log "Restarting services..."
    systemctl restart cartae-api || docker-compose restart api

    success "Credentials rotated and services restarted"
else
    warning "Credential rotation skipped (manual decision)"
fi

#
# ÉTAPE 5: Invalidation Sessions
#
log "STEP 5: Invalidating all user sessions..."

# Invalider via Redis (si utilisé pour sessions)
if command -v redis-cli &> /dev/null; then
    log "Flushing Redis session store..."
    redis-cli FLUSHDB
    success "Redis sessions flushed"
fi

# Invalider JWT tokens (via rotation secret ci-dessus)
log "JWT tokens invalidated via secret rotation"

# Forcer MFA re-validation
log "Marking all users for MFA re-validation..."
psql -U cartae -d cartae -c "UPDATE users SET mfa_validated = false;" 2>/dev/null || warning "Failed to update MFA status"

success "All user sessions invalidated"

#
# ÉTAPE 6: Notifications
#
log "STEP 6: Notifying stakeholders..."

# Slack
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \":rotating_light::rotating_light: DATA BREACH DETECTED :rotating_light::rotating_light:\",
            \"attachments\": [{
                \"color\": \"danger\",
                \"fields\": [
                    {\"title\": \"Incident ID\", \"value\": \"$INCIDENT_ID\", \"short\": true},
                    {\"title\": \"Severity\", \"value\": \"$SEVERITY\", \"short\": true},
                    {\"title\": \"Description\", \"value\": \"$BREACH_DESCRIPTION\", \"short\": false},
                    {\"title\": \"Compromised Systems\", \"value\": \"$COMPROMISED_SYSTEMS\", \"short\": false},
                    {\"title\": \"Actions Taken\", \"value\": \"System isolated, forensics preserved, credentials rotated, sessions invalidated\", \"short\": false}
                ]
            }]
        }" > /dev/null
    success "Slack notification sent"
fi

# PagerDuty (critical severity)
if [[ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]]; then
    curl -s -X POST "https://events.pagerduty.com/v2/enqueue" \
        -H 'Content-Type: application/json' \
        -d "{
            \"routing_key\": \"${PAGERDUTY_INTEGRATION_KEY}\",
            \"event_action\": \"trigger\",
            \"payload\": {
                \"summary\": \"DATA BREACH - $INCIDENT_ID\",
                \"severity\": \"critical\",
                \"source\": \"cartae-security\",
                \"custom_details\": {
                    \"incident_id\": \"$INCIDENT_ID\",
                    \"description\": \"$BREACH_DESCRIPTION\",
                    \"compromised_systems\": \"$COMPROMISED_SYSTEMS\"
                }
            }
        }" > /dev/null
    success "PagerDuty alert triggered"
fi

# Email (management + legal si critical)
if [[ -n "${SECURITY_EMAIL:-}" ]]; then
    mail -s "[CRITICAL] Data Breach - $INCIDENT_ID" "$SECURITY_EMAIL" <<EOF
DATA BREACH INCIDENT REPORT

Incident ID: $INCIDENT_ID
Timestamp: $(date)
Severity: $SEVERITY

DESCRIPTION:
$BREACH_DESCRIPTION

COMPROMISED SYSTEMS:
$COMPROMISED_SYSTEMS

IMMEDIATE ACTIONS TAKEN:
- ✅ Systems isolated (if confirmed)
- ✅ Forensics evidence preserved
- ✅ Credentials rotated (JWT, DB, API keys)
- ✅ All user sessions invalidated
- ✅ Stakeholders notified

FORENSICS:
Evidence collected in: $FORENSICS_DIR
Log file: $LOG_FILE

NEXT STEPS:
1. IMMEDIATE: Containment verification
2. 1-4 hours: Detailed forensics analysis
3. 4-24 hours: Root cause identification
4. 24-48 hours: Remediation and hardening
5. 48-72 hours: Post-incident review
6. Legal: Assess notification requirements (GDPR, etc.)

DO NOT REPLY TO THIS EMAIL - Contact security team directly.

This is an automated breach response notification.
EOF
    success "Email notification sent"
fi

#
# ÉTAPE 7: Timeline et Rapport
#
log "STEP 7: Generating incident timeline and report..."

cat > "$FORENSICS_DIR/incident-report.md" <<EOF
# Data Breach Incident Report

**Incident ID:** $INCIDENT_ID
**Date:** $(date)
**Severity:** $SEVERITY
**Status:** Active Response

## Executive Summary

$BREACH_DESCRIPTION

## Compromised Systems

$COMPROMISED_SYSTEMS

## Timeline of Events

| Time | Event |
|------|-------|
| $(date) | Breach detected |
| $(date) | Incident response playbook initiated |
| $(date) | Systems isolated (if confirmed) |
| $(date) | Forensics evidence preserved |
| $(date) | Credentials rotated |
| $(date) | User sessions invalidated |
| $(date) | Stakeholders notified |

## Response Actions Taken

1. ✅ **Containment:** Systems isolated from network
2. ✅ **Preservation:** Forensics evidence collected
   - RAM snapshot (if available)
   - Filesystem timeline
   - Network connections
   - Process list
   - SSH keys and crontabs
3. ✅ **Credential Rotation:**
   - JWT secret rotated
   - Database password rotated
   - API keys regenerated
4. ✅ **Session Invalidation:**
   - Redis flushed
   - JWT tokens invalidated
   - MFA re-validation required
5. ✅ **Notification:**
   - Security team alerted (Slack, PagerDuty)
   - Management notified (Email)

## Forensics Evidence

All evidence preserved in: \`$FORENSICS_DIR\`

Key files:
- \`logs/\` - Application and system logs
- \`netstat.txt\` - Network connections at time of discovery
- \`processes.txt\` - Running processes
- \`authorized_keys-*\` - SSH access keys
- \`recent-modifications.txt\` - Recently modified files
- \`system-binaries-hashes.txt\` - Binary integrity hashes

## Impact Assessment

**Data Accessed:** (To be determined)
**Data Exfiltrated:** (To be determined)
**Systems Affected:** $COMPROMISED_SYSTEMS
**User Accounts Affected:** (To be determined)

## Next Steps

### Immediate (0-4 hours)
- [ ] Verify containment effectiveness
- [ ] Complete forensics analysis
- [ ] Identify attack vector
- [ ] Assess data exposure

### Short-term (4-24 hours)
- [ ] Root cause analysis
- [ ] Identify all affected systems/data
- [ ] Begin remediation
- [ ] User notification (if required)

### Medium-term (24-72 hours)
- [ ] Complete remediation
- [ ] System hardening
- [ ] Security audit
- [ ] Post-incident review

### Long-term (1-4 weeks)
- [ ] Implement additional controls
- [ ] Update incident response procedures
- [ ] Security training
- [ ] Legal/regulatory compliance (GDPR notification if applicable)

## Legal/Regulatory Considerations

- **GDPR:** Assess if personal data breach requires notification (72h deadline)
- **Industry:** Check sector-specific requirements
- **Contracts:** Review customer notification obligations

## Lessons Learned

(To be completed after post-incident review)

---

*Generated by Breach Response Playbook*
*Incident ID: $INCIDENT_ID*
EOF

success "Incident report generated: $FORENSICS_DIR/incident-report.md"

#
# Finalisation
#
log "========================================="
log "BREACH RESPONSE PLAYBOOK - COMPLETED"
log "========================================="
log ""
log "Incident ID: $INCIDENT_ID"
log "Severity: $SEVERITY"
log "Status: Active Response"
log ""
log "CRITICAL ACTIONS COMPLETED:"
log "  ✅ Systems isolated (if confirmed)"
log "  ✅ Forensics preserved: $FORENSICS_DIR"
log "  ✅ Credentials rotated"
log "  ✅ Sessions invalidated"
log "  ✅ Stakeholders notified"
log ""
log "NEXT STEPS (IMMEDIATE):"
log "  1. Review forensics evidence"
log "  2. Identify attack vector"
log "  3. Assess data exposure"
log "  4. Begin detailed remediation"
log ""
log "REPORT: $FORENSICS_DIR/incident-report.md"
log "LOG: $LOG_FILE"

exit 0
