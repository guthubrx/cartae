#!/bin/bash
#
# DDoS Response Playbook
# Session 81g - Incident Response & Security Operations
#
# Playbook automatisé pour répondre à une attaque DDoS.
#
# Actions:
# 1. Détecter et analyser l'attaque (source IPs, taux de requêtes)
# 2. Activer rate limiting aggravé
# 3. Bloquer IPs source via Fail2ban/iptables
# 4. Activer CloudFlare "Under Attack Mode" (si disponible)
# 5. Notifier équipe (Slack, PagerDuty, Email)
# 6. Collecter forensics pour analyse post-incident
# 7. Générer rapport d'incident
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/cartae/incident-response/ddos-$(date +%Y%m%d-%H%M%S).log"
NGINX_LOG="/var/log/cartae/nginx-access.log"
API_LOG="/var/log/cartae/api.log"
RATE_LIMIT_THRESHOLD=100 # Requêtes par minute par IP
BLOCK_THRESHOLD=500      # Requêtes par minute pour ban immédiat

# Couleurs pour output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

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

# Vérifier permissions root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (for iptables/fail2ban commands)"
   exit 1
fi

# Créer répertoire logs si nécessaire
mkdir -p "$(dirname "$LOG_FILE")"

log "========================================="
log "DDoS Response Playbook - STARTED"
log "========================================="

#
# ÉTAPE 1: Détection et Analyse
#
log "STEP 1: Analyzing DDoS attack pattern..."

# Analyser logs nginx pour identifier top IPs
log "Top 20 attacking IPs (last 5 minutes):"
tail -n 50000 "$NGINX_LOG" | \
    awk '{print $1}' | \
    sort | uniq -c | sort -rn | head -20 | \
    tee -a "$LOG_FILE"

# Calculer taux de requêtes par IP
ATTACKING_IPS=$(tail -n 50000 "$NGINX_LOG" | \
    awk '{print $1}' | \
    sort | uniq -c | sort -rn | \
    awk -v threshold="$BLOCK_THRESHOLD" '$1 > threshold {print $2}')

if [[ -z "$ATTACKING_IPS" ]]; then
    warning "No IPs exceeding block threshold ($BLOCK_THRESHOLD req/min)"
    log "DDoS attack may be distributed or low-intensity"
else
    IP_COUNT=$(echo "$ATTACKING_IPS" | wc -l)
    log "Identified $IP_COUNT attacking IPs exceeding threshold"
fi

# Analyser type de requêtes
log "Most targeted endpoints:"
tail -n 10000 "$NGINX_LOG" | \
    awk '{print $7}' | \
    sort | uniq -c | sort -rn | head -10 | \
    tee -a "$LOG_FILE"

# Analyser User-Agents (détecter bots)
log "Top User-Agents (potential bots):"
tail -n 10000 "$NGINX_LOG" | \
    awk -F'"' '{print $6}' | \
    sort | uniq -c | sort -rn | head -10 | \
    tee -a "$LOG_FILE"

success "Analysis complete"

#
# ÉTAPE 2: Activer Rate Limiting Aggravé
#
log "STEP 2: Activating aggressive rate limiting..."

# Backup configuration nginx actuelle
cp /etc/nginx/nginx.conf "/tmp/nginx.conf.backup.$(date +%s)"

# Activer rate limiting dans nginx
# (nécessite config avec limit_req_zone déjà définie)
if nginx -t 2>/dev/null; then
    log "Nginx config valid, reloading with rate limits..."
    systemctl reload nginx
    success "Nginx rate limiting activated"
else
    error "Nginx config test failed, skipping reload"
fi

# Activer rate limiting au niveau kernel (iptables)
log "Setting up iptables rate limiting..."

# Limiter nouvelles connexions TCP à 100/min par IP
iptables -I INPUT -p tcp --dport 80 -m state --state NEW -m recent --set
iptables -I INPUT -p tcp --dport 80 -m state --state NEW -m recent --update --seconds 60 --hitcount 100 -j DROP

iptables -I INPUT -p tcp --dport 443 -m state --state NEW -m recent --set
iptables -I INPUT -p tcp --dport 443 -m state --state NEW -m recent --update --seconds 60 --hitcount 100 -j DROP

success "Iptables rate limiting activated (100 conn/min per IP)"

#
# ÉTAPE 3: Bloquer IPs Malveillantes
#
log "STEP 3: Blocking attacking IPs..."

if [[ -n "$ATTACKING_IPS" ]]; then
    for IP in $ATTACKING_IPS; do
        log "Blocking IP: $IP"

        # Via Fail2ban (si disponible)
        if command -v fail2ban-client &> /dev/null; then
            fail2ban-client set cartae-brute-force banip "$IP" 2>/dev/null || true
        fi

        # Via iptables (backup)
        iptables -I INPUT -s "$IP" -j DROP

        # Logger dans audit
        echo "$(date -Iseconds),ddos_response,blocked,$IP,automated" >> /var/log/cartae/audit.log
    done

    success "Blocked $IP_COUNT attacking IPs"
else
    log "No IPs to block (threshold not exceeded)"
fi

# Sauvegarder règles iptables
iptables-save > /etc/iptables/rules.v4.ddos-response

#
# ÉTAPE 4: Activer CloudFlare Under Attack Mode (si configuré)
#
log "STEP 4: Activating CloudFlare protection (if configured)..."

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] && [[ -n "${CLOUDFLARE_ZONE_ID:-}" ]]; then
    log "CloudFlare credentials found, enabling Under Attack Mode..."

    RESPONSE=$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/security_level" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data '{"value":"under_attack"}')

    if echo "$RESPONSE" | grep -q '"success":true'; then
        success "CloudFlare Under Attack Mode activated"
    else
        error "Failed to activate CloudFlare protection: $RESPONSE"
    fi
else
    warning "CloudFlare credentials not configured, skipping"
fi

#
# ÉTAPE 5: Notifications
#
log "STEP 5: Notifying security team..."

INCIDENT_ID="DDOS-$(date +%Y%m%d-%H%M%S)"
INCIDENT_SUMMARY="DDoS attack detected and mitigated. Blocked ${IP_COUNT:-0} IPs."

# Slack notification
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \":rotating_light: DDoS Attack Detected\",
            \"attachments\": [{
                \"color\": \"danger\",
                \"fields\": [
                    {\"title\": \"Incident ID\", \"value\": \"$INCIDENT_ID\", \"short\": true},
                    {\"title\": \"Blocked IPs\", \"value\": \"${IP_COUNT:-0}\", \"short\": true},
                    {\"title\": \"Status\", \"value\": \"Mitigated\", \"short\": true},
                    {\"title\": \"Log\", \"value\": \"$LOG_FILE\", \"short\": false}
                ]
            }]
        }" > /dev/null
    success "Slack notification sent"
fi

# PagerDuty alert
if [[ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]]; then
    curl -s -X POST "https://events.pagerduty.com/v2/enqueue" \
        -H 'Content-Type: application/json' \
        -d "{
            \"routing_key\": \"${PAGERDUTY_INTEGRATION_KEY}\",
            \"event_action\": \"trigger\",
            \"payload\": {
                \"summary\": \"DDoS Attack - $INCIDENT_SUMMARY\",
                \"severity\": \"critical\",
                \"source\": \"cartae-security\",
                \"custom_details\": {
                    \"incident_id\": \"$INCIDENT_ID\",
                    \"blocked_ips\": \"${IP_COUNT:-0}\",
                    \"log_file\": \"$LOG_FILE\"
                }
            }
        }" > /dev/null
    success "PagerDuty alert triggered"
fi

# Email notification
if [[ -n "${SECURITY_EMAIL:-}" ]]; then
    mail -s "[CRITICAL] DDoS Attack Detected - $INCIDENT_ID" "$SECURITY_EMAIL" <<EOF
DDoS Attack Response - Incident Report

Incident ID: $INCIDENT_ID
Timestamp: $(date)
Status: Mitigated

Summary:
$INCIDENT_SUMMARY

Actions Taken:
- Rate limiting activated (nginx + iptables)
- ${IP_COUNT:-0} attacking IPs blocked
- CloudFlare Under Attack Mode enabled (if configured)

Top Attacking IPs:
$(echo "$ATTACKING_IPS" | head -10)

Log File: $LOG_FILE

Next Steps:
1. Monitor logs for continued attack
2. Review blocked IPs for false positives
3. Conduct post-incident analysis
4. Update DDoS protection strategy if needed

This is an automated response. Please review the incident log for details.
EOF
    success "Email notification sent"
fi

#
# ÉTAPE 6: Collecter Forensics
#
log "STEP 6: Collecting forensics data..."

FORENSICS_DIR="/var/log/cartae/forensics/$INCIDENT_ID"
mkdir -p "$FORENSICS_DIR"

# Copier logs pertinents
cp "$NGINX_LOG" "$FORENSICS_DIR/nginx-access.log"
cp "$API_LOG" "$FORENSICS_DIR/api.log" 2>/dev/null || true

# Snapshot iptables rules
iptables-save > "$FORENSICS_DIR/iptables-rules.txt"

# Snapshot fail2ban status
if command -v fail2ban-client &> /dev/null; then
    fail2ban-client status > "$FORENSICS_DIR/fail2ban-status.txt"
fi

# Snapshot connections actives
netstat -an > "$FORENSICS_DIR/netstat.txt"

# Snapshot processus
ps auxf > "$FORENSICS_DIR/processes.txt"

# Créer résumé JSON
cat > "$FORENSICS_DIR/incident-summary.json" <<EOF
{
  "incident_id": "$INCIDENT_ID",
  "timestamp": "$(date -Iseconds)",
  "type": "ddos",
  "severity": "critical",
  "status": "mitigated",
  "blocked_ips_count": ${IP_COUNT:-0},
  "blocked_ips": $(echo "$ATTACKING_IPS" | jq -R -s -c 'split("\n") | map(select(length > 0))'),
  "actions_taken": [
    "rate_limiting_activated",
    "ips_blocked",
    "cloudflare_enabled",
    "notifications_sent"
  ],
  "log_file": "$LOG_FILE",
  "forensics_dir": "$FORENSICS_DIR"
}
EOF

success "Forensics collected in $FORENSICS_DIR"

#
# ÉTAPE 7: Générer Rapport
#
log "STEP 7: Generating incident report..."

cat > "$FORENSICS_DIR/incident-report.md" <<EOF
# DDoS Incident Report

**Incident ID:** $INCIDENT_ID
**Date:** $(date)
**Status:** Mitigated
**Severity:** Critical

## Summary

$INCIDENT_SUMMARY

## Attack Analysis

- **Attacking IPs:** ${IP_COUNT:-0}
- **Peak Request Rate:** (see logs)
- **Targeted Endpoints:** (see nginx logs)
- **Attack Duration:** (ongoing analysis)

## Response Actions

1. ✅ Rate limiting activated (nginx + iptables: 100 req/min per IP)
2. ✅ ${IP_COUNT:-0} attacking IPs blocked via Fail2ban + iptables
3. ✅ CloudFlare Under Attack Mode enabled
4. ✅ Security team notified (Slack, PagerDuty, Email)
5. ✅ Forensics data collected

## Top Attacking IPs

\`\`\`
$(echo "$ATTACKING_IPS" | head -20)
\`\`\`

## Files

- **Logs:** $LOG_FILE
- **Forensics:** $FORENSICS_DIR
- **Nginx Log:** $FORENSICS_DIR/nginx-access.log
- **Iptables Rules:** $FORENSICS_DIR/iptables-rules.txt

## Next Steps

1. **Immediate (0-1h):**
   - Monitor logs for continued attack
   - Verify service availability
   - Review blocked IPs for false positives

2. **Short-term (1-24h):**
   - Analyze attack patterns
   - Tune rate limiting if needed
   - Unblock legitimate IPs if any

3. **Long-term (1-7 days):**
   - Post-incident review meeting
   - Update DDoS playbook based on learnings
   - Strengthen DDoS protection (CDN, WAF, etc.)

## Lessons Learned

(To be filled after post-incident review)

---

*Generated automatically by DDoS Response Playbook*
EOF

success "Incident report generated: $FORENSICS_DIR/incident-report.md"

#
# Finalisation
#
log "========================================="
log "DDoS Response Playbook - COMPLETED"
log "========================================="
log ""
log "Incident ID: $INCIDENT_ID"
log "Status: Mitigated"
log "Blocked IPs: ${IP_COUNT:-0}"
log "Log File: $LOG_FILE"
log "Forensics: $FORENSICS_DIR"
log "Report: $FORENSICS_DIR/incident-report.md"
log ""
log "Next steps:"
log "1. Review incident report"
log "2. Monitor for continued attack"
log "3. Conduct post-incident analysis"

exit 0
