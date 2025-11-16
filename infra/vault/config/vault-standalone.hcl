# Configuration HashiCorp Vault - Standalone Production (HTTP)
# Session 84 - Security Hardening
# Doc: https://developer.hashicorp.com/vault/docs/configuration
#
# Note: TLS sera ajouté dans Session 85 (certificats auto-signés)

# Stockage Backend - Fichier local (persisté dans volume Docker)
storage "file" {
  path = "/vault/data"
}

# Listener HTTP (TLS dans Session 85+)
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1  # HTTP seulement (TLS plus tard)
}

# UI Web intégrée
ui = true

# Désactiver mlock (requis pour containers Docker)
# En production bare-metal, mettre false
disable_mlock = true

# Telemetry (Prometheus metrics)
telemetry {
  disable_hostname = false
  prometheus_retention_time = "30s"
  # Metrics endpoint: http://localhost:8200/v1/sys/metrics
}

# API address (interne au réseau Docker)
api_addr = "http://cartae-vault:8200"

# Cache des secrets (performance)
cache {
  use_auto_auth_token = true
}

# Default lease TTL (durée de vie des tokens/secrets)
default_lease_ttl = "168h"  # 7 jours
max_lease_ttl     = "720h"  # 30 jours

# Log level
log_level  = "info"
log_format = "json"

# Plugin directory
plugin_directory = "/vault/plugins"
