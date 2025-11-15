#!/bin/bash
# Cartae - Firewall iptables (Defense-in-Depth)
# Session 81a - Network Segmentation & Firewall
#
# Implémente les règles de sécurité inter-zones:
# - Policy par défaut: DROP (tout est bloqué sauf règles explicites)
# - Whitelist approach (zéro-trust network segmentation)
# - Logging des tentatives d'accès bloquées
#
# Zones:
# - DMZ:     172.20.0.0/24 (Traefik reverse proxy)
# - APP:     172.21.0.0/24 (Backend API)
# - DATA:    172.22.0.0/24 (PostgreSQL, Redis)
# - SECRETS: 172.23.0.0/24 (Vault HA cluster)
#
# Usage:
#   ./firewall-setup.sh init    # Initialiser les règles (au boot)
#   ./firewall-setup.sh flush   # Reset (développement uniquement)
#   ./firewall-setup.sh status  # Afficher règles actives

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/cartae-firewall.log"

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" >&2
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

# Vérifier si exécuté en root (nécessaire pour iptables)
check_root() {
  if [[ $EUID -ne 0 ]]; then
    error "Ce script doit être exécuté en root (sudo required)"
    exit 1
  fi
}

# Flush toutes les règles (DANGER - développement uniquement)
flush_rules() {
  warn "⚠️  Suppression de toutes les règles firewall..."

  iptables -F            # Flush all chains
  iptables -X            # Delete user-defined chains
  iptables -t nat -F
  iptables -t nat -X
  iptables -t mangle -F
  iptables -t mangle -X

  # Policies par défaut: ACCEPT (mode dev uniquement)
  iptables -P INPUT ACCEPT
  iptables -P FORWARD ACCEPT
  iptables -P OUTPUT ACCEPT

  log "✅ Règles firewall réinitialisées (mode ACCEPT - DEV uniquement)"
}

# Initialiser règles firewall (Production-ready)
init_rules() {
  log "🔥 Initialisation du firewall Cartae (Defense-in-Depth)..."

  # ==================================================
  # 1. FLUSH RÈGLES EXISTANTES
  # ==================================================
  iptables -F
  iptables -X
  iptables -t nat -F
  iptables -t nat -X

  # ==================================================
  # 2. POLICIES PAR DÉFAUT: DROP (Zero-Trust)
  # ==================================================
  log "🔒 Application policy DROP par défaut (zero-trust)..."
  iptables -P INPUT DROP
  iptables -P FORWARD DROP
  iptables -P OUTPUT DROP

  # ==================================================
  # 3. LOOPBACK (localhost) - TOUJOURS AUTORISÉ
  # ==================================================
  iptables -A INPUT -i lo -j ACCEPT
  iptables -A OUTPUT -o lo -j ACCEPT

  # ==================================================
  # 4. CONNEXIONS ÉTABLIES (stateful firewall)
  # ==================================================
  log "🔗 Autorisation connexions établies (stateful)..."
  iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

  # ==================================================
  # 5. ZONE DMZ (172.20.0.0/24)
  # ==================================================
  log "🌐 Configuration zone DMZ (Internet → Traefik)..."

  # Allow HTTP/HTTPS depuis Internet → Traefik (DMZ)
  iptables -A INPUT -p tcp --dport 80 -j ACCEPT
  iptables -A INPUT -p tcp --dport 443 -j ACCEPT

  # Allow Traefik → répondre (output vers Internet)
  iptables -A OUTPUT -p tcp --sport 80 -j ACCEPT
  iptables -A OUTPUT -p tcp --sport 443 -j ACCEPT

  # Allow Traefik (DMZ) → Database API (APP) sur port 3001
  iptables -A FORWARD -s 172.20.0.0/24 -d 172.21.0.0/24 -p tcp --dport 3001 -j ACCEPT

  # ==================================================
  # 6. ZONE APP (172.21.0.0/24)
  # ==================================================
  log "🚀 Configuration zone APP (Backend API)..."

  # Allow APP → PostgreSQL (DATA) sur port 5432
  iptables -A FORWARD -s 172.21.0.0/24 -d 172.22.0.0/24 -p tcp --dport 5432 -j ACCEPT

  # Allow APP → Redis (DATA) sur port 6379
  iptables -A FORWARD -s 172.21.0.0/24 -d 172.22.0.0/24 -p tcp --dport 6379 -j ACCEPT

  # Allow APP → Vault (SECRETS) sur port 8200
  iptables -A FORWARD -s 172.21.0.0/24 -d 172.23.0.0/24 -p tcp --dport 8200 -j ACCEPT

  # ==================================================
  # 7. ZONE DATA (172.22.0.0/24)
  # ==================================================
  log "🗄️  Configuration zone DATA (PostgreSQL, Redis)..."

  # PostgreSQL n'initie PAS de connexions sortantes (sauf replication en HA)
  # Redis pareil (sauf cluster mode, pas activé ici)
  # Donc: AUCUNE règle OUTPUT pour DATA zone (isolation stricte)

  # ==================================================
  # 8. ZONE SECRETS (172.23.0.0/24)
  # ==================================================
  log "🔐 Configuration zone SECRETS (Vault HA)..."

  # Allow Vault cluster internal communication (Raft consensus)
  # Vault node 1 (172.23.0.10) ↔ Vault node 2 (172.23.0.11) ↔ Vault node 3 (172.23.0.12)
  iptables -A FORWARD -s 172.23.0.0/24 -d 172.23.0.0/24 -p tcp --dport 8201 -j ACCEPT  # Vault cluster port

  # Vault ne peut PAS sortir vers Internet (ultra-isolé)
  # Unsealing manuel ou via Shamir keys (pas de cloud auto-unseal en self-hosted)

  # ==================================================
  # 9. DNS (optionnel - si résolution DNS nécessaire)
  # ==================================================
  log "🌍 Autorisation DNS (résolution noms de domaine)..."

  # Allow DNS queries (UDP 53) pour APP zone uniquement
  # (PostgreSQL/Redis/Vault n'ont pas besoin de DNS)
  iptables -A FORWARD -s 172.21.0.0/24 -p udp --dport 53 -j ACCEPT
  iptables -A OUTPUT -p udp --dport 53 -j ACCEPT

  # ==================================================
  # 10. LOGGING DES TENTATIVES BLOQUÉES (audit)
  # ==================================================
  log "📊 Activation logging tentatives bloquées..."

  # Log INPUT bloqués (attaques externes)
  iptables -A INPUT -j LOG --log-prefix "[CARTAE-FW-INPUT-DROP] " --log-level 4

  # Log FORWARD bloqués (tentatives inter-zones non autorisées)
  iptables -A FORWARD -j LOG --log-prefix "[CARTAE-FW-FORWARD-DROP] " --log-level 4

  # ==================================================
  # 11. ICMP (ping) - OPTIONNEL
  # ==================================================
  # Autorise ping pour monitoring (peut être désactivé en prod)
  iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT
  iptables -A OUTPUT -p icmp --icmp-type echo-reply -j ACCEPT

  # ==================================================
  # 12. SAUVEGARDER RÈGLES (persistance après reboot)
  # ==================================================
  log "💾 Sauvegarde des règles iptables..."

  if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || \
    iptables-save > /tmp/cartae-iptables-rules.bak
    log "✅ Règles sauvegardées dans /etc/iptables/rules.v4 (ou /tmp si non root)"
  else
    warn "iptables-save non disponible, règles non persistantes"
  fi

  log "✅ Firewall Cartae initialisé (Defense-in-Depth activée)"
}

# Afficher règles actives
show_status() {
  echo ""
  echo "=========================================="
  echo "  CARTAE FIREWALL STATUS"
  echo "=========================================="
  echo ""

  echo "--- Policies par défaut ---"
  iptables -L -n | grep "^Chain" | grep "policy"
  echo ""

  echo "--- Règles INPUT (Internet → DMZ) ---"
  iptables -L INPUT -n -v --line-numbers | head -20
  echo ""

  echo "--- Règles FORWARD (Inter-zones) ---"
  iptables -L FORWARD -n -v --line-numbers | head -30
  echo ""

  echo "--- Règles OUTPUT (Sorties) ---"
  iptables -L OUTPUT -n -v --line-numbers | head -20
  echo ""
}

# Main
case "${1:-}" in
  init)
    check_root
    init_rules
    ;;
  flush)
    check_root
    warn "⚠️  DANGER: Suppression des règles firewall (DEV uniquement)"
    read -p "Confirmer (oui/non)? " -r
    if [[ $REPLY == "oui" ]]; then
      flush_rules
    else
      echo "Opération annulée"
    fi
    ;;
  status)
    show_status
    ;;
  *)
    echo "Usage: $0 {init|flush|status}"
    echo ""
    echo "  init    - Initialiser firewall (Production-ready)"
    echo "  flush   - Reset règles (DEV uniquement, DANGEREUX)"
    echo "  status  - Afficher règles actives"
    exit 1
    ;;
esac

exit 0
