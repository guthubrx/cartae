#!/bin/bash
# Configuration iptables pour isolation réseau stricte
# Session 78 - Zero Trust Network
# Usage: sudo ./setup-firewall.sh

set -e

if [ "$EUID" -ne 0 ]; then
  echo "❌ Ce script doit être exécuté en tant que root (sudo)"
  exit 1
fi

echo "🔥 Configuration du firewall iptables pour Cartae (Zero Trust)"
echo ""

# ============================================================
# Réseaux Docker (subnets)
# ============================================================

DMZ_NETWORK="172.25.1.0/24"
APP_NETWORK="172.25.2.0/24"
SECRETS_NETWORK="172.25.3.0/24"
DATA_NETWORK="172.25.4.0/24"

# IPs fixes
VAULT_IP="172.25.3.10"
POSTGRES_IP="172.25.4.10"

# ============================================================
# Flush des règles existantes
# ============================================================

echo "🧹 Nettoyage des règles existantes..."

iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# Politique par défaut: DROP (deny by default)
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

echo "   ✅ Règles nettoyées"
echo ""

# ============================================================
# INPUT Rules (trafic entrant sur l'hôte)
# ============================================================

echo "📥 Configuration INPUT rules..."

# Loopback (localhost)
iptables -A INPUT -i lo -j ACCEPT

# Connexions établies et reliées
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# ICMP (ping) - limiter pour éviter flood
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j ACCEPT

# SSH (port 22) - limiter pour éviter brute-force
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# HTTPS (port 443) - Traefik
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# HTTP (port 80) - Redirection vers HTTPS uniquement
iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Drop tout le reste
iptables -A INPUT -j DROP

echo "   ✅ INPUT rules configurées"
echo ""

# ============================================================
# FORWARD Rules (isolation inter-réseaux Docker)
# ============================================================

echo "🔀 Configuration FORWARD rules (isolation réseaux)..."

# Autoriser connexions établies
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# ============================================================
# DMZ Network → App Network (Traefik → Cartae Web uniquement)
# ============================================================

# Traefik → Cartae Web (port 3000)
iptables -A FORWARD -s "$DMZ_NETWORK" -d "$APP_NETWORK" -p tcp --dport 3000 -j ACCEPT

# Bloquer tout le reste DMZ → App
iptables -A FORWARD -s "$DMZ_NETWORK" -d "$APP_NETWORK" -j DROP

# ============================================================
# App Network → Secrets Network (Cartae Web → Vault uniquement)
# ============================================================

# Cartae Web → Vault (port 8200)
iptables -A FORWARD -s "$APP_NETWORK" -d "$VAULT_IP" -p tcp --dport 8200 -j ACCEPT

# Bloquer tout le reste App → Secrets
iptables -A FORWARD -s "$APP_NETWORK" -d "$SECRETS_NETWORK" -j DROP

# ============================================================
# App Network → Data Network (Cartae Web → PostgreSQL uniquement)
# ============================================================

# Cartae Web → PostgreSQL (port 5432)
iptables -A FORWARD -s "$APP_NETWORK" -d "$POSTGRES_IP" -p tcp --dport 5432 -j ACCEPT

# Bloquer tout le reste App → Data
iptables -A FORWARD -s "$APP_NETWORK" -d "$DATA_NETWORK" -j DROP

# ============================================================
# Secrets Network → Data Network (Vault → PostgreSQL uniquement)
# ============================================================

# Vault → PostgreSQL (port 5432) - pour dynamic secrets
iptables -A FORWARD -s "$VAULT_IP" -d "$POSTGRES_IP" -p tcp --dport 5432 -j ACCEPT

# Bloquer tout le reste Secrets → Data
iptables -A FORWARD -s "$SECRETS_NETWORK" -d "$DATA_NETWORK" -j DROP

# ============================================================
# Bloquer accès Internet depuis Secrets et Data Networks
# ============================================================

# Secrets Network: PAS d'accès Internet
iptables -A FORWARD -s "$SECRETS_NETWORK" ! -d "$APP_NETWORK" ! -d "$DATA_NETWORK" -j DROP

# Data Network: PAS d'accès Internet
iptables -A FORWARD -s "$DATA_NETWORK" ! -d "$SECRETS_NETWORK" -j DROP

# ============================================================
# Bloquer tout le reste (deny by default)
# ============================================================

iptables -A FORWARD -j DROP

echo "   ✅ FORWARD rules configurées (isolation stricte)"
echo ""

# ============================================================
# NAT Rules (masquerading pour DMZ uniquement)
# ============================================================

echo "🌐 Configuration NAT rules..."

# Masquerading pour DMZ Network uniquement (accès Internet)
iptables -t nat -A POSTROUTING -s "$DMZ_NETWORK" -j MASQUERADE

# App Network: Masquerading uniquement pour updates (peut être désactivé)
# iptables -t nat -A POSTROUTING -s "$APP_NETWORK" -j MASQUERADE

echo "   ✅ NAT rules configurées"
echo ""

# ============================================================
# Logging (optionnel - pour debugging)
# ============================================================

echo "📝 Configuration logging..."

# Logger les DROP (utile pour debugging)
iptables -N LOGGING
iptables -A INPUT -j LOGGING
iptables -A FORWARD -j LOGGING
iptables -A LOGGING -m limit --limit 2/min -j LOG --log-prefix "IPTables-Dropped: " --log-level 4
iptables -A LOGGING -j DROP

echo "   ✅ Logging configuré"
echo ""

# ============================================================
# Sauvegarder les règles
# ============================================================

echo "💾 Sauvegarde des règles..."

# Debian/Ubuntu
if command -v iptables-save > /dev/null; then
  iptables-save > /etc/iptables/rules.v4
  echo "   ✅ Règles sauvegardées dans /etc/iptables/rules.v4"
fi

# CentOS/RHEL
if command -v service > /dev/null; then
  service iptables save
fi

echo ""

# ============================================================
# Afficher résumé
# ============================================================

echo "✅ Firewall configuré avec succès !"
echo ""
echo "📋 Résumé de l'isolation réseau:"
echo ""
echo "  DMZ Network (172.25.1.0/24):"
echo "    → App Network: Port 3000 uniquement (Traefik → Cartae Web)"
echo "    → Accès Internet: Autorisé"
echo ""
echo "  App Network (172.25.2.0/24):"
echo "    → Secrets Network: Port 8200 uniquement (Cartae Web → Vault)"
echo "    → Data Network: Port 5432 uniquement (Cartae Web → PostgreSQL)"
echo "    → Accès Internet: Bloqué"
echo ""
echo "  Secrets Network (172.25.3.0/24):"
echo "    → Data Network: Port 5432 uniquement (Vault → PostgreSQL)"
echo "    → Accès Internet: Bloqué"
echo ""
echo "  Data Network (172.25.4.0/24):"
echo "    → Accès Internet: Bloqué"
echo "    → Accessible uniquement depuis: App + Secrets Networks"
echo ""
echo "🔍 Vérifier les règles:"
echo "   sudo iptables -L -v -n"
echo "   sudo iptables -t nat -L -v -n"
echo ""
echo "⚠️  Pour rendre persistant au redémarrage:"
echo "   - Debian/Ubuntu: sudo apt install iptables-persistent"
echo "   - CentOS/RHEL: sudo systemctl enable iptables"
echo ""
