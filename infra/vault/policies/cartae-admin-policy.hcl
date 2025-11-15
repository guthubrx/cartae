# Policy ACL pour les administrateurs Cartae
# Doc: https://developer.hashicorp.com/vault/docs/concepts/policies

# Accès complet aux secrets (CRUD)
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Gestion des policies (créer/modifier/supprimer)
path "sys/policies/acl/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Gestion des auth methods (token, userpass, AppRole)
path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Gestion du seal/unseal (déverrouillage Vault)
path "sys/seal" {
  capabilities = ["update", "sudo"]
}

path "sys/unseal" {
  capabilities = ["update", "sudo"]
}

path "sys/seal-status" {
  capabilities = ["read"]
}

# Accès aux logs d'audit
path "sys/audit" {
  capabilities = ["read", "list", "sudo"]
}

path "sys/audit-hash/*" {
  capabilities = ["update"]
}

# Health & Monitoring
path "sys/health" {
  capabilities = ["read"]
}

path "sys/metrics" {
  capabilities = ["read"]
}

# Gestion des tokens (création, révocation)
path "auth/token/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Rotation des secrets automatique
path "sys/leases/+/+/+/rotate" {
  capabilities = ["update"]
}

# Backup & Restore (raft snapshot pour HA)
path "sys/storage/raft/snapshot" {
  capabilities = ["read", "update"]
}
