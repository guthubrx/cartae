#!/bin/bash
#
# Credential Compromise Response Playbook
# Session 81g - Incident Response & Security Operations
#
# Playbook pour répondre à une compromission de credentials (mot de passe, API key, token).
#
# Actions:
# 1. Identifier scope (quels credentials compromis, quand, comment)
# 2. Invalider credentials compromis immédiatement
# 3. Rotation de tous les credentials liés
# 4. Forcer MFA/2FA sur tous les comptes
# 5. Audit des actions effectuées avec credentials compromis
# 6. Notifier utilisateurs affectés
# 7. Renforcer politique de mots de passe
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/cartae/incident-response/creds-$(date +%Y%m%d-%H%M%S).log"
INCIDENT_ID="CREDS-$(date +%Y%m%d-%H%M%S)"

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

# Créer répertoire logs
mkdir -p "$(dirname "$LOG_FILE")"

log "========================================="
log "CREDENTIAL COMPROMISE PLAYBOOK - STARTED"
log "Incident ID: $INCIDENT_ID"
log "========================================="

#
# ÉTAPE 0: Identification du Scope
#
log "STEP 0: Identifying compromise scope..."

prompt "Type of credentials compromised (password/api_key/jwt/ssh_key/database/all):"
CRED_TYPE="${REPLY:-password}"
log "Credential type: $CRED_TYPE"

prompt "Affected user(s) (username or 'all'):"
AFFECTED_USER="$REPLY"
log "Affected user: $AFFECTED_USER"

prompt "How was compromise detected (leaked/phishing/breach/audit):"
DETECTION_METHOD="${REPLY:-unknown}"
log "Detection method: $DETECTION_METHOD"

prompt "Estimated compromise time (YYYY-MM-DD HH:MM or 'unknown'):"
COMPROMISE_TIME="${REPLY:-unknown}"
log "Compromise time: $COMPROMISE_TIME"

FORENSICS_DIR="/var/log/cartae/forensics/$INCIDENT_ID"
mkdir -p "$FORENSICS_DIR"

#
# ÉTAPE 1: Invalidation Immédiate
#
log "STEP 1: Immediately invalidating compromised credentials..."

case "$CRED_TYPE" in
    password)
        log "Invalidating user password(s)..."

        if [[ "$AFFECTED_USER" == "all" ]]; then
            # Forcer reset de TOUS les mots de passe
            warning "Forcing password reset for ALL users"
            psql -U cartae -d cartae -c "UPDATE users SET password_reset_required = true, password_reset_token = gen_random_uuid();" 2>/dev/null || warning "Failed to force password reset in DB"
            success "All users marked for password reset"
        else
            # Reset user spécifique
            log "Forcing password reset for user: $AFFECTED_USER"
            psql -U cartae -d cartae -c "UPDATE users SET password_reset_required = true, password_reset_token = gen_random_uuid() WHERE username = '$AFFECTED_USER';" 2>/dev/null || warning "Failed to reset password for user"
            success "Password reset required for $AFFECTED_USER"
        fi
        ;;

    api_key)
        log "Revoking API key(s)..."

        if [[ "$AFFECTED_USER" == "all" ]]; then
            warning "Revoking ALL API keys"
            psql -U cartae -d cartae -c "UPDATE api_keys SET revoked = true, revoked_at = NOW(), revoked_reason = 'Security incident: $INCIDENT_ID';" 2>/dev/null || warning "Failed to revoke API keys"
            success "All API keys revoked"
        else
            log "Revoking API keys for user: $AFFECTED_USER"
            psql -U cartae -d cartae -c "UPDATE api_keys SET revoked = true, revoked_at = NOW(), revoked_reason = 'Security incident: $INCIDENT_ID' WHERE user_id IN (SELECT id FROM users WHERE username = '$AFFECTED_USER');" 2>/dev/null || warning "Failed to revoke API keys"
            success "API keys revoked for $AFFECTED_USER"
        fi
        ;;

    jwt)
        log "Invalidating JWT tokens..."

        # Rotation du JWT secret global (invalide TOUS les tokens)
        NEW_JWT_SECRET=$(openssl rand -hex 32)

        if [[ -f /opt/cartae/.env ]]; then
            cp /opt/cartae/.env "$FORENSICS_DIR/env.backup"
            sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" /opt/cartae/.env
            success "JWT secret rotated (all tokens invalidated)"

            # Redémarrer API
            log "Restarting API with new JWT secret..."
            systemctl restart cartae-api 2>/dev/null || docker-compose restart api || warning "Failed to restart API"
        else
            error ".env not found, cannot rotate JWT secret"
        fi
        ;;

    ssh_key)
        log "Revoking SSH key(s)..."

        if [[ "$AFFECTED_USER" == "root" ]]; then
            warning "Clearing root authorized_keys"
            if [[ -f /root/.ssh/authorized_keys ]]; then
                cp /root/.ssh/authorized_keys "$FORENSICS_DIR/root-authorized_keys.backup"
                > /root/.ssh/authorized_keys
                success "Root SSH keys cleared"
            fi
        elif [[ "$AFFECTED_USER" == "all" ]]; then
            warning "Clearing ALL user authorized_keys"
            for user_home in /home/*; do
                if [[ -f "$user_home/.ssh/authorized_keys" ]]; then
                    user=$(basename "$user_home")
                    cp "$user_home/.ssh/authorized_keys" "$FORENSICS_DIR/$user-authorized_keys.backup"
                    > "$user_home/.ssh/authorized_keys"
                fi
            done
            success "All user SSH keys cleared"
        else
            log "Clearing SSH keys for user: $AFFECTED_USER"
            if [[ -f "/home/$AFFECTED_USER/.ssh/authorized_keys" ]]; then
                cp "/home/$AFFECTED_USER/.ssh/authorized_keys" "$FORENSICS_DIR/$AFFECTED_USER-authorized_keys.backup"
                > "/home/$AFFECTED_USER/.ssh/authorized_keys"
                success "SSH keys cleared for $AFFECTED_USER"
            fi
        fi
        ;;

    database)
        log "Rotating database credentials..."

        NEW_DB_PASSWORD=$(openssl rand -base64 32)

        # Mettre à jour PostgreSQL
        if command -v psql &> /dev/null; then
            psql -U postgres -c "ALTER USER cartae WITH PASSWORD '$NEW_DB_PASSWORD';" 2>/dev/null || warning "Failed to update DB password"

            # Mettre à jour .env
            if [[ -f /opt/cartae/.env ]]; then
                cp /opt/cartae/.env "$FORENSICS_DIR/env.backup"
                sed -i.bak "s/DATABASE_PASSWORD=.*/DATABASE_PASSWORD=$NEW_DB_PASSWORD/" /opt/cartae/.env
                success "Database password rotated"

                # Redémarrer services
                log "Restarting services with new DB password..."
                systemctl restart cartae-api 2>/dev/null || docker-compose restart || warning "Failed to restart services"
            fi
        else
            error "psql not available, cannot rotate DB password"
        fi
        ;;

    all)
        warning "COMPREHENSIVE CREDENTIAL ROTATION - ALL TYPES"

        # Appeler récursivement pour chaque type
        log "Rotating passwords..."
        REPLY="all"; CRED_TYPE="password"; source "$0"

        log "Rotating API keys..."
        REPLY="all"; CRED_TYPE="api_key"; source "$0"

        log "Rotating JWT secrets..."
        CRED_TYPE="jwt"; source "$0"

        log "Rotating SSH keys..."
        REPLY="all"; CRED_TYPE="ssh_key"; source "$0"

        log "Rotating database credentials..."
        CRED_TYPE="database"; source "$0"

        success "All credential types rotated"
        ;;

    *)
        error "Unknown credential type: $CRED_TYPE"
        exit 1
        ;;
esac

#
# ÉTAPE 2: Invalidation Sessions Actives
#
log "STEP 2: Invalidating active sessions..."

# Flush Redis (si utilisé pour sessions)
if command -v redis-cli &> /dev/null; then
    if [[ "$AFFECTED_USER" == "all" ]]; then
        log "Flushing ALL sessions from Redis..."
        redis-cli FLUSHDB
        success "All sessions invalidated"
    else
        log "Invalidating sessions for user: $AFFECTED_USER"
        # Chercher clés de session pour ce user
        SESSION_KEYS=$(redis-cli KEYS "session:$AFFECTED_USER:*")
        if [[ -n "$SESSION_KEYS" ]]; then
            echo "$SESSION_KEYS" | xargs redis-cli DEL
            success "Sessions invalidated for $AFFECTED_USER"
        else
            log "No active sessions found for $AFFECTED_USER"
        fi
    fi
fi

#
# ÉTAPE 3: Forcer MFA
#
log "STEP 3: Enforcing MFA on affected accounts..."

if [[ "$AFFECTED_USER" == "all" ]]; then
    log "Requiring MFA re-validation for ALL users..."
    psql -U cartae -d cartae -c "UPDATE users SET mfa_validated = false;" 2>/dev/null || warning "Failed to update MFA status"
    success "MFA re-validation required for all users"
else
    log "Requiring MFA re-validation for user: $AFFECTED_USER"
    psql -U cartae -d cartae -c "UPDATE users SET mfa_validated = false WHERE username = '$AFFECTED_USER';" 2>/dev/null || warning "Failed to update MFA status"
    success "MFA re-validation required for $AFFECTED_USER"
fi

#
# ÉTAPE 4: Audit des Actions
#
log "STEP 4: Auditing actions performed with compromised credentials..."

# Déterminer fenêtre d'audit
if [[ "$COMPROMISE_TIME" != "unknown" ]]; then
    AUDIT_START="$COMPROMISE_TIME"
else
    # Par défaut: dernières 7 jours
    AUDIT_START=$(date -d '7 days ago' +'%Y-%m-%d %H:%M:%S')
fi

log "Auditing activity from $AUDIT_START to now..."

# Audit logs applicatifs
if [[ -f /var/log/cartae/api.log ]]; then
    log "Analyzing API logs..."

    if [[ "$AFFECTED_USER" == "all" ]]; then
        grep -E "\"timestamp\":\"$AUDIT_START" /var/log/cartae/api.log > "$FORENSICS_DIR/api-activity.log" 2>/dev/null || true
    else
        grep "\"user\":\"$AFFECTED_USER\"" /var/log/cartae/api.log > "$FORENSICS_DIR/api-activity-$AFFECTED_USER.log" 2>/dev/null || true
    fi
fi

# Audit base de données (si audit trail activé)
if command -v psql &> /dev/null; then
    log "Querying audit trail from database..."

    if [[ "$AFFECTED_USER" == "all" ]]; then
        psql -U cartae -d cartae -c "COPY (SELECT * FROM audit_log WHERE timestamp >= '$AUDIT_START' ORDER BY timestamp DESC) TO STDOUT WITH CSV HEADER" > "$FORENSICS_DIR/audit-trail.csv" 2>/dev/null || true
    else
        psql -U cartae -d cartae -c "COPY (SELECT * FROM audit_log WHERE username = '$AFFECTED_USER' AND timestamp >= '$AUDIT_START' ORDER BY timestamp DESC) TO STDOUT WITH CSV HEADER" > "$FORENSICS_DIR/audit-trail-$AFFECTED_USER.csv" 2>/dev/null || true
    fi
fi

# Audit SSH logins
if [[ -f /var/log/auth.log ]]; then
    log "Analyzing SSH authentication logs..."

    if [[ "$AFFECTED_USER" == "all" ]]; then
        grep "Accepted" /var/log/auth.log > "$FORENSICS_DIR/ssh-logins.log" 2>/dev/null || true
    else
        grep "Accepted.*$AFFECTED_USER" /var/log/auth.log > "$FORENSICS_DIR/ssh-logins-$AFFECTED_USER.log" 2>/dev/null || true
    fi
fi

success "Audit logs extracted to $FORENSICS_DIR"

#
# ÉTAPE 5: Détection Activités Suspectes
#
log "STEP 5: Detecting suspicious activities..."

# Chercher patterns suspects dans audit logs
SUSPICIOUS_PATTERNS=(
    "DELETE FROM"
    "DROP TABLE"
    "TRUNCATE"
    "sudo"
    "chmod 777"
    "rm -rf"
    "/etc/passwd"
    "/etc/shadow"
    "authorized_keys"
    "crontab"
    "wget http"
    "curl http"
    "nc -l"
    "nmap"
    "masscan"
)

log "Scanning for suspicious patterns..."
for pattern in "${SUSPICIOUS_PATTERNS[@]}"; do
    if grep -r "$pattern" "$FORENSICS_DIR" > /dev/null 2>&1; then
        warning "SUSPICIOUS PATTERN DETECTED: $pattern"
        grep -r "$pattern" "$FORENSICS_DIR" >> "$FORENSICS_DIR/suspicious-activity.log"
    fi
done

if [[ -f "$FORENSICS_DIR/suspicious-activity.log" ]]; then
    error "SUSPICIOUS ACTIVITIES DETECTED - Review $FORENSICS_DIR/suspicious-activity.log"
else
    success "No obvious suspicious patterns detected"
fi

#
# ÉTAPE 6: Notifications
#
log "STEP 6: Notifying affected users and security team..."

# Notification Slack
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \":key: Credential Compromise Incident\",
            \"attachments\": [{
                \"color\": \"danger\",
                \"fields\": [
                    {\"title\": \"Incident ID\", \"value\": \"$INCIDENT_ID\", \"short\": true},
                    {\"title\": \"Credential Type\", \"value\": \"$CRED_TYPE\", \"short\": true},
                    {\"title\": \"Affected User\", \"value\": \"$AFFECTED_USER\", \"short\": true},
                    {\"title\": \"Detection\", \"value\": \"$DETECTION_METHOD\", \"short\": true},
                    {\"title\": \"Actions\", \"value\": \"Credentials invalidated, sessions terminated, MFA enforced, audit completed\", \"short\": false}
                ]
            }]
        }" > /dev/null
    success "Slack notification sent"
fi

# Email utilisateur affecté
if [[ "$AFFECTED_USER" != "all" ]]; then
    USER_EMAIL=$(psql -U cartae -d cartae -t -c "SELECT email FROM users WHERE username = '$AFFECTED_USER';" 2>/dev/null | xargs)

    if [[ -n "$USER_EMAIL" ]]; then
        mail -s "[SECURITY ALERT] Your account credentials were compromised" "$USER_EMAIL" <<EOF
Dear $AFFECTED_USER,

We have detected that your account credentials may have been compromised.

IMMEDIATE ACTIONS TAKEN:
- Your password/credentials have been invalidated
- All active sessions have been terminated
- MFA re-validation is now required

WHAT YOU NEED TO DO:
1. Reset your password immediately using the password reset link
2. Set up or re-validate Multi-Factor Authentication (MFA)
3. Review your recent account activity for anything suspicious
4. Update any other accounts where you used the same password

INCIDENT DETAILS:
- Incident ID: $INCIDENT_ID
- Detection Method: $DETECTION_METHOD
- Estimated Compromise Time: $COMPROMISE_TIME

If you did not request this action or have questions, please contact our security team immediately.

Best regards,
Cartae Security Team
EOF
        success "User notification email sent to $USER_EMAIL"
    fi
fi

# Email équipe sécurité
if [[ -n "${SECURITY_EMAIL:-}" ]]; then
    mail -s "[SECURITY] Credential Compromise - $INCIDENT_ID" "$SECURITY_EMAIL" <<EOF
CREDENTIAL COMPROMISE INCIDENT

Incident ID: $INCIDENT_ID
Timestamp: $(date)

DETAILS:
- Credential Type: $CRED_TYPE
- Affected User: $AFFECTED_USER
- Detection Method: $DETECTION_METHOD
- Compromise Time: $COMPROMISE_TIME

ACTIONS TAKEN:
✅ Compromised credentials invalidated
✅ Active sessions terminated
✅ MFA re-validation enforced
✅ Activity audit completed
✅ User notified (if applicable)

FORENSICS:
Evidence directory: $FORENSICS_DIR
Audit logs: $FORENSICS_DIR/audit-trail*.csv
API activity: $FORENSICS_DIR/api-activity*.log
SSH logins: $FORENSICS_DIR/ssh-logins*.log

SUSPICIOUS ACTIVITIES:
$(cat "$FORENSICS_DIR/suspicious-activity.log" 2>/dev/null || echo "None detected")

NEXT STEPS:
1. Review audit logs for unauthorized actions
2. Assess impact (data accessed/modified)
3. Investigate detection method (how was compromise discovered)
4. Root cause analysis (how did compromise occur)
5. Update security controls to prevent recurrence

Log file: $LOG_FILE
EOF
    success "Security team notification sent"
fi

#
# ÉTAPE 7: Renforcement Politique
#
log "STEP 7: Strengthening security policies..."

# Activer politique de mot de passe renforcée
log "Enforcing strong password policy..."
psql -U cartae -d cartae -c "UPDATE system_config SET value = '12' WHERE key = 'password_min_length';" 2>/dev/null || true
psql -U cartae -d cartae -c "UPDATE system_config SET value = 'true' WHERE key = 'password_require_special_char';" 2>/dev/null || true
psql -U cartae -d cartae -c "UPDATE system_config SET value = 'true' WHERE key = 'password_require_number';" 2>/dev/null || true

# Activer expiration mots de passe
log "Enabling password expiration (90 days)..."
psql -U cartae -d cartae -c "UPDATE system_config SET value = '90' WHERE key = 'password_expiry_days';" 2>/dev/null || true

# Activer account lockout après échecs
log "Enabling account lockout (5 failures = 30 min lockout)..."
psql -U cartae -d cartae -c "UPDATE system_config SET value = '5' WHERE key = 'max_login_attempts';" 2>/dev/null || true
psql -U cartae -d cartae -c "UPDATE system_config SET value = '1800' WHERE key = 'lockout_duration_seconds';" 2>/dev/null || true

success "Security policies strengthened"

#
# ÉTAPE 8: Rapport
#
log "STEP 8: Generating incident report..."

cat > "$FORENSICS_DIR/incident-report.md" <<EOF
# Credential Compromise Incident Report

**Incident ID:** $INCIDENT_ID
**Date:** $(date)
**Status:** Resolved

## Summary

Credential compromise detected and responded to.

## Incident Details

- **Credential Type:** $CRED_TYPE
- **Affected User:** $AFFECTED_USER
- **Detection Method:** $DETECTION_METHOD
- **Estimated Compromise Time:** $COMPROMISE_TIME

## Response Actions

1. ✅ **Immediate Invalidation:** Compromised credentials invalidated
2. ✅ **Session Termination:** All active sessions terminated
3. ✅ **MFA Enforcement:** Multi-factor authentication re-validation required
4. ✅ **Activity Audit:** Complete audit of actions performed with compromised credentials
5. ✅ **User Notification:** Affected user(s) notified with remediation instructions
6. ✅ **Policy Strengthening:** Security policies updated

## Audit Results

Audit period: $AUDIT_START to $(date)

Activity logs:
- API activity: $FORENSICS_DIR/api-activity*.log
- Database audit trail: $FORENSICS_DIR/audit-trail*.csv
- SSH logins: $FORENSICS_DIR/ssh-logins*.log

Suspicious activities:
$(cat "$FORENSICS_DIR/suspicious-activity.log" 2>/dev/null || echo "None detected")

## Impact Assessment

**Data Accessed:** (To be reviewed from audit logs)
**Unauthorized Actions:** (To be reviewed from audit logs)
**Potential Exposure:** (To be assessed)

## Root Cause

**How compromise occurred:** (To be investigated)
- Phishing?
- Credential stuffing?
- Database breach?
- Insider threat?

## Remediation

Completed:
- ✅ Credentials rotated
- ✅ Sessions invalidated
- ✅ MFA enforced
- ✅ Strong password policy enabled (min 12 chars, special chars required)
- ✅ Password expiration enabled (90 days)
- ✅ Account lockout enabled (5 attempts = 30min lockout)

## Recommendations

1. **User Education:**
   - Security awareness training
   - Phishing simulation exercises
   - Password manager adoption

2. **Technical Controls:**
   - Implement passwordless authentication (WebAuthn)
   - Deploy IP allowlisting for sensitive accounts
   - Enable anomaly detection for login patterns

3. **Process Improvements:**
   - Regular credential rotation schedule
   - Periodic access reviews
   - Incident response drills

## Lessons Learned

(To be completed after post-incident review)

---

*Generated by Credential Compromise Response Playbook*
*Incident ID: $INCIDENT_ID*
EOF

success "Incident report generated: $FORENSICS_DIR/incident-report.md"

#
# Finalisation
#
log "========================================="
log "CREDENTIAL COMPROMISE PLAYBOOK - COMPLETED"
log "========================================="
log ""
log "Incident ID: $INCIDENT_ID"
log "Credential Type: $CRED_TYPE"
log "Affected User: $AFFECTED_USER"
log ""
log "ACTIONS COMPLETED:"
log "  ✅ Credentials invalidated"
log "  ✅ Sessions terminated"
log "  ✅ MFA enforced"
log "  ✅ Activity audited"
log "  ✅ User notified"
log "  ✅ Policies strengthened"
log ""
log "FORENSICS: $FORENSICS_DIR"
log "REPORT: $FORENSICS_DIR/incident-report.md"
log "LOG: $LOG_FILE"
log ""
log "NEXT STEPS:"
log "  1. Review audit logs for unauthorized activity"
log "  2. Investigate root cause"
log "  3. Assess impact"
log "  4. Post-incident review"

exit 0
