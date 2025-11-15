# Configuration HashiCorp Vault - Production Hardened (TLS 1.3)
# Session 78 - Security-Driven Development
# Doc: https://developer.hashicorp.com/vault/docs/configuration

# Stockage Backend - Fichier local
storage "file" {
  path = "/vault/file"
}

# Listener HTTPS (TLS 1.3 uniquement)
listener "tcp" {
  address = "0.0.0.0:8200"

  # TLS Configuration (Production-Ready)
  tls_disable = 0 # TLS ACTIVÉ

  # Certificats
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file  = "/vault/certs/vault.key"
  tls_client_ca_file = "/vault/certs/ca.crt" # Pour mTLS

  # TLS 1.3 uniquement (modern security)
  tls_min_version = "tls13"

  # Cipher suites (TLS 1.3)
  tls_cipher_suites = "TLS_AES_256_GCM_SHA384,TLS_CHACHA20_POLY1305_SHA256,TLS_AES_128_GCM_SHA256"

  # Prefer server cipher suites
  tls_prefer_server_cipher_suites = true

  # Mutual TLS (client cert required)
  tls_require_and_verify_client_cert = false # true pour mTLS strict

  # HTTP/2 (performance)
  http_read_timeout  = "30s"
  http_write_timeout = "30s"
  http_idle_timeout  = "5m"
}

# UI Web intégrée (accessible via HTTPS uniquement)
ui = true

# Désactiver mlock (DOIT être false en production)
disable_mlock = false # mlock() empêche swap des secrets en RAM

# Telemetry (Prometheus metrics)
telemetry {
  disable_hostname = false
  prometheus_retention_time = "30s"
  # Metrics endpoint: https://vault:8200/v1/sys/metrics
}

# Audit Trail (OBLIGATOIRE en production)
# Tous les accès aux secrets sont loggés
audit {
  enabled = true
}

# Seal/Unseal Configuration
# Mode: Shamir Secret Sharing (5 clés, seuil 3)
# Alternative Phase 6: Auto-unseal avec Transit seal ou cloud KMS

seal "shamir" {
  # 5 key shares, 3 required to unseal
  # Généré lors de vault operator init
}

# Alternative: Auto-unseal avec Transit seal (Phase 6)
# seal "transit" {
#   address            = "https://vault-primary:8200"
#   token              = "s.xyz..."
#   disable_renewal    = false
#   key_name           = "autounseal"
#   mount_path         = "transit/"
#   tls_ca_cert        = "/vault/certs/ca.crt"
#   tls_client_cert    = "/vault/certs/vault.crt"
#   tls_client_key     = "/vault/certs/vault.key"
#   tls_server_name    = "vault-primary"
#   tls_skip_verify    = false
# }

# Limites API (rate limiting contre brute-force)
api_addr     = "https://vault:8200" # HTTPS !
cluster_addr = "https://vault:8201" # HTTPS !

# API rate limiting (requests par seconde)
# Note: Rate limiting aussi géré par Traefik en amont
# api_rate_limit {
#   enabled = true
#   rate = 1000 # 1000 req/s max
# }

# Cache des secrets (performance)
cache {
  use_auto_auth_token = true
}

# High Availability (HA) - Phase 6
# ha_storage "consul" {
#   address = "consul:8500"
#   path    = "vault/"
#   tls_ca_file   = "/vault/certs/ca.crt"
#   tls_cert_file = "/vault/certs/vault.crt"
#   tls_key_file  = "/vault/certs/vault.key"
# }

# Plugin directory
plugin_directory = "/vault/plugins"

# Default lease TTL (durée de vie des tokens/secrets)
default_lease_ttl = "168h" # 7 jours
max_lease_ttl     = "720h" # 30 jours

# Log level (info en production, debug en dev)
log_level = "info"
log_format = "json" # Format JSON pour parsing par SIEM

# Disable caching (sécurité maximale, impact performance)
# disable_cache = true

# Disable printable check (accepte tous caractères UTF-8)
disable_printable_check = false
