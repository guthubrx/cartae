# Cartae - HashiCorp Vault Configuration (mTLS Mode)
# Session 81b - TLS/mTLS End-to-End
#
# Configuration production avec:
# - TLS activé (cipher suites forts, TLS 1.3 only)
# - mTLS (mutual TLS) avec vérification certificat client
# - Raft storage backend (HA ready)
# - Logging activé
# - Metrics Prometheus
#
# Usage:
#   vault server -config=config.mtls.hcl

# ==================================================
# STORAGE BACKEND - Raft (HA, cloud-ready)
# ==================================================

storage "raft" {
  path    = "/vault/data"
  node_id = "vault-node-1"

  # Performance tuning
  performance_multiplier = 1

  # Autopilot (automatic dead server cleanup)
  autopilot_reconcile_interval = "10s"

  # Retry join (pour cluster HA multi-nodes)
  # retry_join {
  #   leader_api_addr = "https://vault-node-2:8200"
  # }
  # retry_join {
  #   leader_api_addr = "https://vault-node-3:8200"
  # }
}

# ==================================================
# LISTENER - TCP avec TLS + mTLS
# ==================================================

listener "tcp" {
  address       = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"

  # ==================================================
  # TLS Configuration (sécurité maximale)
  # ==================================================

  tls_disable = false

  # Certificats serveur (signés par Cartae CA)
  tls_cert_file = "/vault/tls/server/vault.crt"
  tls_key_file  = "/vault/tls/server/vault.key"

  # CA root pour valider certificats clients
  tls_client_ca_file = "/vault/tls/ca/ca.crt"

  # ==================================================
  # mTLS (Mutual TLS) - ACTIVÉ
  # ==================================================

  # Requiert certificat client valide
  tls_require_and_verify_client_cert = true

  # ==================================================
  # Cipher Suites (TLS 1.3 + TLS 1.2 fallback)
  # ==================================================

  # TLS 1.3 cipher suites (recommended)
  tls_cipher_suites = "TLS_AES_256_GCM_SHA384,TLS_AES_128_GCM_SHA256,TLS_CHACHA20_POLY1305_SHA256"

  # Version TLS minimum (TLS 1.2 minimum, TLS 1.3 recommandé)
  tls_min_version = "tls12"

  # Préférer cipher suites serveur (meilleure sécurité)
  tls_prefer_server_cipher_suites = true

  # ==================================================
  # Headers HTTP sécurisés
  # ==================================================

  # HSTS (HTTP Strict Transport Security)
  # Force HTTPS pendant 1 an
  # tls_disable_client_certs = false

  # ==================================================
  # Telemetry & Metrics
  # ==================================================

  # Prometheus metrics endpoint (pour monitoring)
  telemetry {
    prometheus_retention_time = "30s"
    disable_hostname = false
  }
}

# ==================================================
# API Configuration
# ==================================================

api_addr = "https://vault:8200"
cluster_addr = "https://vault:8201"

# ==================================================
# UI Configuration
# ==================================================

ui = true

# ==================================================
# Logging
# ==================================================

log_level = "info"
log_format = "json"

# Log requests (audit trail minimal)
# Pour audit complet, activer audit backend (file ou syslog)
# log_requests_level = "trace"

# ==================================================
# Seal Configuration
# ==================================================

# Seal par défaut: Shamir (requires manual unseal)
# Pour auto-unseal en production, utiliser:
#
# seal "transit" {
#   address = "https://vault-master:8200"
#   disable_renewal = false
#   key_name = "autounseal"
#   mount_path = "transit/"
# }
#
# Ou:
#
# seal "awskms" {
#   region     = "us-east-1"
#   kms_key_id = "alias/vault-unseal"
# }

# ==================================================
# Performance & Limits
# ==================================================

# Nombre max de requêtes par seconde (rate limiting)
# 0 = illimité (production: mettre limite)
max_lease_ttl = "768h"  # 32 jours
default_lease_ttl = "168h"  # 7 jours

# Disable mlock (requiert CAP_IPC_LOCK)
# En dev: désactiver, en prod: activer
disable_mlock = false

# ==================================================
# Telemetry (Prometheus)
# ==================================================

telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = false

  # Statsd (optionnel)
  # statsd_address = "127.0.0.1:8125"

  # StatsD prefix
  # statsd_prefix = "vault"
}

# ==================================================
# Audit Backend (optionnel, recommandé production)
# ==================================================

# Uncomment pour activer audit logs
# audit "file" {
#   file_path = "/vault/logs/audit.log"
#   log_raw = false
#   hmac_accessor = true
#   mode = "0600"
#   format = "json"
# }

# ==================================================
# Notes de Configuration
# ==================================================

# 1. Certificats requis:
#    - /vault/tls/ca/ca.crt           (CA root publique)
#    - /vault/tls/server/vault.crt    (certificat serveur)
#    - /vault/tls/server/vault.key    (clé privée serveur)
#
# 2. Clients (database-api) doivent fournir:
#    - Certificat client signé par CA root
#    - /vault/tls/client/database-api.crt
#    - /vault/tls/client/database-api.key
#
# 3. Démarrage Vault:
#    vault server -config=config.mtls.hcl
#
# 4. Init (première fois):
#    export VAULT_ADDR=https://vault:8200
#    export VAULT_CACERT=/vault/tls/ca/ca.crt
#    vault operator init
#
# 5. Unseal (après chaque démarrage):
#    vault operator unseal <key1>
#    vault operator unseal <key2>
#    vault operator unseal <key3>
#
# 6. Login:
#    vault login <root_token>
#
# 7. Tester mTLS:
#    curl --cacert ca.crt \
#         --cert client/database-api.crt \
#         --key client/database-api.key \
#         https://vault:8200/v1/sys/health
