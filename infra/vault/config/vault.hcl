# Configuration HashiCorp Vault - Mode Production
# Doc: https://developer.hashicorp.com/vault/docs/configuration

# Stockage Backend - Fichier local (alternative: Consul, etcd, PostgreSQL)
storage "file" {
  path = "/vault/file"
}

# Listener HTTP (API)
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1 # ⚠️ À activer en production avec certificats TLS

  # Pour activer TLS (Phase 6 - Sécurité Production):
  # tls_disable     = 0
  # tls_cert_file   = "/vault/certs/vault.crt"
  # tls_key_file    = "/vault/certs/vault.key"
  # tls_min_version = "tls12"
}

# UI Web intégrée
ui = true

# Désactiver le mode développement
disable_mlock = false # mlock() empêche swap des secrets en RAM

# Telemetry (métriques pour monitoring)
telemetry {
  disable_hostname          = false
  prometheus_retention_time = "30s"

  # Prometheus scraping endpoint: http://vault:8200/v1/sys/metrics
}

# Audit Trail (logs des accès secrets) - Phase 6
# audit {
#   path = "/vault/logs/audit.log"
#   type = "file"
# }

# Seal/Unseal Configuration
# Par défaut: Shamir Seal (clés distribuées)
# Alternative: Auto-unseal avec cloud KMS (AWS, GCP, Azure)

# Limites API (rate limiting contre brute-force)
api_addr     = "http://0.0.0.0:8200"
cluster_addr = "http://0.0.0.0:8201"

# Cache des secrets (performance)
cache {
  use_auto_auth_token = true
}
