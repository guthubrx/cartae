# Policy ACL pour l'application Cartae
# Doc: https://developer.hashicorp.com/vault/docs/concepts/policies

# Lecture des secrets Office 365 (credentials OAuth)
path "secret/data/office365/*" {
  capabilities = ["read", "list"]
}

# Lecture des secrets Gmail (credentials OAuth)
path "secret/data/gmail/*" {
  capabilities = ["read", "list"]
}

# Lecture des secrets Database (PostgreSQL credentials)
path "secret/data/database/*" {
  capabilities = ["read", "list"]
}

# Lecture des clés de chiffrement (AES-256-GCM pour HybridStore)
path "secret/data/encryption/*" {
  capabilities = ["read", "list"]
}

# Rotation des secrets (renouvellement auto des credentials)
path "secret/data/office365/+/rotate" {
  capabilities = ["update"]
}

path "secret/data/gmail/+/rotate" {
  capabilities = ["update"]
}

# Metadata des secrets (timestamps, versions)
path "secret/metadata/*" {
  capabilities = ["read", "list"]
}

# Interdiction de supprimer ou détruire des secrets
# Seul l'admin peut supprimer via Vault UI ou CLI
path "secret/data/*" {
  capabilities = ["deny"]
  denied_parameters = {
    "delete" = []
    "destroy" = []
  }
}

# Health check endpoint
path "sys/health" {
  capabilities = ["read"]
}

# Metrics endpoint (pour monitoring)
path "sys/metrics" {
  capabilities = ["read"]
}
