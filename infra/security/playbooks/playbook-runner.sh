#!/bin/bash
#
# Incident Response Playbook Runner
# Session 81g - Incident Response & Security Operations
#
# Menu interactif pour lancer les playbooks d'incident response.
# Orchestre les différents playbooks et vérifie les pré-requis.
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/var/log/cartae/incident-response"

# Couleurs
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Créer répertoire logs
mkdir -p "$LOG_DIR"

#
# Banner
#
show_banner() {
    clear
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   CARTAE INCIDENT RESPONSE PLAYBOOK RUNNER                  ║
║                                                              ║
║   Session 81g - Security Operations                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

#
# Vérifications pré-flight
#
preflight_checks() {
    echo -e "${BLUE}Running pre-flight checks...${NC}"

    local errors=0

    # Check permissions root
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}✗ Must run as root${NC}"
        ((errors++))
    else
        echo -e "${GREEN}✓ Root permissions${NC}"
    fi

    # Check playbooks disponibles
    if [[ -f "$SCRIPT_DIR/ddos-response.sh" ]]; then
        echo -e "${GREEN}✓ DDoS Response playbook found${NC}"
    else
        echo -e "${RED}✗ DDoS Response playbook not found${NC}"
        ((errors++))
    fi

    if [[ -f "$SCRIPT_DIR/breach-response.sh" ]]; then
        echo -e "${GREEN}✓ Breach Response playbook found${NC}"
    else
        echo -e "${RED}✗ Breach Response playbook not found${NC}"
        ((errors++))
    fi

    if [[ -f "$SCRIPT_DIR/credential-compromise.sh" ]]; then
        echo -e "${GREEN}✓ Credential Compromise playbook found${NC}"
    else
        echo -e "${RED}✗ Credential Compromise playbook not found${NC}"
        ((errors++))
    fi

    # Check commandes requises
    local required_cmds=("iptables" "psql" "curl" "mail")
    for cmd in "${required_cmds[@]}"; do
        if command -v "$cmd" &> /dev/null; then
            echo -e "${GREEN}✓ $cmd available${NC}"
        else
            echo -e "${YELLOW}⚠ $cmd not available (some features may not work)${NC}"
        fi
    done

    # Check logs directory writable
    if [[ -w "$LOG_DIR" ]]; then
        echo -e "${GREEN}✓ Log directory writable${NC}"
    else
        echo -e "${RED}✗ Log directory not writable: $LOG_DIR${NC}"
        ((errors++))
    fi

    # Check variables d'environnement (optionnelles)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        echo -e "${GREEN}✓ Slack webhook configured${NC}"
    else
        echo -e "${YELLOW}⚠ Slack webhook not configured (notifications disabled)${NC}"
    fi

    if [[ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]]; then
        echo -e "${GREEN}✓ PagerDuty configured${NC}"
    else
        echo -e "${YELLOW}⚠ PagerDuty not configured (alerts disabled)${NC}"
    fi

    echo ""

    if [[ $errors -gt 0 ]]; then
        echo -e "${RED}Pre-flight checks failed with $errors error(s)${NC}"
        echo -e "${YELLOW}Some playbooks may not function correctly.${NC}"
        read -p "Continue anyway? (yes/no): " -r
        if [[ ! "$REPLY" =~ ^[Yy][Ee][Ss]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}All pre-flight checks passed!${NC}"
    fi

    echo ""
    read -p "Press Enter to continue..."
}

#
# Menu principal
#
show_menu() {
    show_banner

    echo -e "${CYAN}Available Incident Response Playbooks:${NC}"
    echo ""
    echo -e "  ${GREEN}1)${NC} DDoS Response"
    echo -e "     ${YELLOW}→${NC} Mitigate distributed denial of service attacks"
    echo -e "     ${YELLOW}→${NC} Actions: Rate limiting, IP blocking, CloudFlare, notifications"
    echo ""
    echo -e "  ${GREEN}2)${NC} Data Breach Response"
    echo -e "     ${YELLOW}→${NC} Respond to data breach or system intrusion"
    echo -e "     ${YELLOW}→${NC} Actions: Isolation, forensics, credential rotation, notifications"
    echo ""
    echo -e "  ${GREEN}3)${NC} Credential Compromise"
    echo -e "     ${YELLOW}→${NC} Respond to compromised passwords/keys/tokens"
    echo -e "     ${YELLOW}→${NC} Actions: Invalidation, rotation, MFA enforcement, audit"
    echo ""
    echo -e "  ${GREEN}4)${NC} View Recent Incidents"
    echo -e "     ${YELLOW}→${NC} List recent incident response logs"
    echo ""
    echo -e "  ${GREEN}5)${NC} View Forensics Archives"
    echo -e "     ${YELLOW}→${NC} Browse forensics evidence from past incidents"
    echo ""
    echo -e "  ${GREEN}6)${NC} System Status"
    echo -e "     ${YELLOW}→${NC} Check security system health (Fail2ban, firewall, etc.)"
    echo ""
    echo -e "  ${GREEN}0)${NC} Exit"
    echo ""
}

#
# Lancer playbook DDoS
#
run_ddos_playbook() {
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}DDoS RESPONSE PLAYBOOK${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""

    echo -e "${YELLOW}This playbook will:${NC}"
    echo "  • Analyze attack patterns"
    echo "  • Activate aggressive rate limiting"
    echo "  • Block attacking IPs"
    echo "  • Enable CloudFlare protection (if configured)"
    echo "  • Notify security team"
    echo "  • Collect forensics"
    echo ""

    read -p "Proceed with DDoS response? (yes/no): " -r
    if [[ "$REPLY" =~ ^[Yy][Ee][Ss]$ ]]; then
        bash "$SCRIPT_DIR/ddos-response.sh"
        echo ""
        read -p "Press Enter to return to menu..."
    fi
}

#
# Lancer playbook Breach
#
run_breach_playbook() {
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}DATA BREACH RESPONSE PLAYBOOK${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""

    echo -e "${RED}WARNING: This is a critical incident response playbook.${NC}"
    echo ""
    echo -e "${YELLOW}This playbook will:${NC}"
    echo "  • Isolate compromised systems (optional)"
    echo "  • Preserve forensics evidence"
    echo "  • Analyze breach scope"
    echo "  • Rotate ALL credentials"
    echo "  • Invalidate ALL user sessions"
    echo "  • Notify stakeholders"
    echo "  • Generate incident report"
    echo ""

    read -p "Confirm data breach response? (type 'BREACH' to confirm): " -r
    if [[ "$REPLY" == "BREACH" ]]; then
        bash "$SCRIPT_DIR/breach-response.sh"
        echo ""
        read -p "Press Enter to return to menu..."
    else
        echo -e "${YELLOW}Breach response cancelled.${NC}"
    fi
}

#
# Lancer playbook Credential Compromise
#
run_creds_playbook() {
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}CREDENTIAL COMPROMISE RESPONSE PLAYBOOK${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""

    echo -e "${YELLOW}This playbook will:${NC}"
    echo "  • Invalidate compromised credentials"
    echo "  • Rotate related credentials"
    echo "  • Terminate active sessions"
    echo "  • Enforce MFA re-validation"
    echo "  • Audit account activity"
    echo "  • Notify affected users"
    echo "  • Strengthen password policies"
    echo ""

    read -p "Proceed with credential compromise response? (yes/no): " -r
    if [[ "$REPLY" =~ ^[Yy][Ee][Ss]$ ]]; then
        bash "$SCRIPT_DIR/credential-compromise.sh"
        echo ""
        read -p "Press Enter to return to menu..."
    fi
}

#
# Voir incidents récents
#
view_recent_incidents() {
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}RECENT INCIDENTS${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""

    if [[ -d "$LOG_DIR" ]]; then
        echo -e "${GREEN}Incident logs:${NC}"
        ls -lht "$LOG_DIR"/*.log 2>/dev/null | head -20 || echo "No incidents found"
    else
        echo -e "${YELLOW}No incident logs found.${NC}"
    fi

    echo ""
    read -p "View specific log? (filename or Enter to skip): " -r
    if [[ -n "$REPLY" && -f "$LOG_DIR/$REPLY" ]]; then
        less "$LOG_DIR/$REPLY"
    fi

    echo ""
    read -p "Press Enter to return to menu..."
}

#
# Voir forensics
#
view_forensics() {
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}FORENSICS ARCHIVES${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""

    FORENSICS_DIR="/var/log/cartae/forensics"

    if [[ -d "$FORENSICS_DIR" ]]; then
        echo -e "${GREEN}Forensics archives:${NC}"
        ls -lht "$FORENSICS_DIR" 2>/dev/null || echo "No forensics found"
    else
        echo -e "${YELLOW}No forensics archives found.${NC}"
    fi

    echo ""
    read -p "Browse specific incident? (incident ID or Enter to skip): " -r
    if [[ -n "$REPLY" && -d "$FORENSICS_DIR/$REPLY" ]]; then
        echo ""
        echo -e "${GREEN}Contents of $REPLY:${NC}"
        ls -lh "$FORENSICS_DIR/$REPLY"

        echo ""
        read -p "View incident report? (yes/no): " -r
        if [[ "$REPLY" =~ ^[Yy][Ee][Ss]$ ]]; then
            if [[ -f "$FORENSICS_DIR/$REPLY/incident-report.md" ]]; then
                less "$FORENSICS_DIR/$REPLY/incident-report.md"
            else
                echo "Incident report not found"
            fi
        fi
    fi

    echo ""
    read -p "Press Enter to return to menu..."
}

#
# Status système
#
system_status() {
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}SECURITY SYSTEM STATUS${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""

    # Fail2ban status
    echo -e "${BLUE}Fail2ban Status:${NC}"
    if command -v fail2ban-client &> /dev/null; then
        fail2ban-client status || echo "Fail2ban not running"
    else
        echo "Fail2ban not installed"
    fi
    echo ""

    # Firewall status
    echo -e "${BLUE}Firewall Status:${NC}"
    if command -v ufw &> /dev/null; then
        ufw status verbose
    elif command -v iptables &> /dev/null; then
        iptables -L -n -v | head -20
    else
        echo "No firewall found"
    fi
    echo ""

    # Services critiques
    echo -e "${BLUE}Critical Services:${NC}"
    systemctl status cartae-api --no-pager 2>/dev/null || docker ps | grep cartae || echo "Cartae not running"
    echo ""

    # Disk space
    echo -e "${BLUE}Disk Space (logs):${NC}"
    df -h /var/log
    echo ""

    # Recent security events
    echo -e "${BLUE}Recent Security Events (last 10):${NC}"
    tail -10 /var/log/cartae/api.log 2>/dev/null | grep -i "error\|warning\|fail" || echo "No recent events"
    echo ""

    read -p "Press Enter to return to menu..."
}

#
# Main loop
#
main() {
    # Pre-flight checks au premier lancement
    preflight_checks

    while true; do
        show_menu

        read -p "Select option: " -r choice

        case "$choice" in
            1)
                run_ddos_playbook
                ;;
            2)
                run_breach_playbook
                ;;
            3)
                run_creds_playbook
                ;;
            4)
                view_recent_incidents
                ;;
            5)
                view_forensics
                ;;
            6)
                system_status
                ;;
            0)
                echo ""
                echo -e "${GREEN}Exiting Playbook Runner.${NC}"
                echo ""
                exit 0
                ;;
            *)
                echo ""
                echo -e "${RED}Invalid option. Please try again.${NC}"
                sleep 2
                ;;
        esac
    done
}

# Lancer main
main
