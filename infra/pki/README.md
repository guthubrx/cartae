# Cartae PKI Interne - Infrastructure TLS/mTLS

## 📋 Vue d'Ensemble

Infrastructure PKI (Public Key Infrastructure) interne pour sécuriser les communications entre composants Cartae avec TLS/mTLS end-to-end.

**Objectif:** Chiffrer TOUS les flux réseau (Internet → API, API ↔ PostgreSQL, API ↔ Vault).

---

## 🏗️ Architecture PKI

```
┌─────────────────────────────────────────────────────────────┐
│  Cartae Root CA (Self-Signed, 10 ans)                       │
│  • Clé: RSA 4096 bits                                       │
│  • CN: Cartae Root CA                                       │
│  • Fichiers: infra/pki/ca/ca.{crt,key}                     │
└─────────────────────────────────────────────────────────────┘
           │
           │ Signs (signature)
           │
    ┌──────┴───────┬──────────────────┬─────────────────┐
    │              │                  │                 │
    ▼              ▼                  ▼                 ▼
┌─────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐
│ Vault   │  │PostgreSQL│  │ database-api │  │ backup-      │
│ Server  │  │ Server   │  │ Client       │  │ service      │
│ Cert    │  │ Cert     │  │ Cert         │  │ Client Cert  │
│         │  │          │  │              │  │              │
│ TLS     │  │ TLS      │  │ mTLS         │  │ mTLS         │
└─────────┘  └──────────┘  └──────────────┘  └──────────────┘
```

---

## 📁 Structure Fichiers

```
infra/pki/
├── scripts/
│   ├── setup-pki.sh             # 🚀 Script master (génère tout)
│   ├── generate-ca.sh           # Génération CA root
│   ├── generate-server-cert.sh  # Génération certificats serveurs
│   └── generate-client-cert.sh  # Génération certificats clients
│
├── ca/                          # CA Root (privé, NE PAS commiter *.key)
│   ├── ca.crt                   # Certificat CA public
│   ├── ca.key                   # Clé privée CA (⚠️ SECRET)
│   └── ca.srl                   # Serial number (auto-généré)
│
├── server/                      # Certificats serveurs
│   ├── vault.crt                # Certificat Vault (public)
│   ├── vault.key                # Clé privée Vault (⚠️ SECRET)
│   ├── postgres.crt             # Certificat PostgreSQL (public)
│   └── postgres.key             # Clé privée PostgreSQL (⚠️ SECRET)
│
├── client/                      # Certificats clients (mTLS)
│   ├── database-api.crt         # Certificat database-api (public)
│   └── database-api.key         # Clé privée database-api (⚠️ SECRET)
│
└── README.md                    # Cette documentation
```

**⚠️ IMPORTANT:** Tous les fichiers `*.key` sont des **secrets critiques** et NE DOIVENT PAS être commités dans Git.

---

## 🚀 Usage Rapide

### 1. Générer Toute la PKI (1 Commande)

```bash
cd infra/pki/scripts
./setup-pki.sh
```

Ce script génère automatiquement:

- ✅ CA root (validité 10 ans)
- ✅ Certificat serveur Vault (validité 1 an)
- ✅ Certificat serveur PostgreSQL (validité 1 an)
- ✅ Certificat client database-api (validité 1 an)

### 2. Générer Certificats Individuellement

**CA Root uniquement:**

```bash
./generate-ca.sh
```

**Certificat serveur (Vault):**

```bash
./generate-server-cert.sh vault "DNS:vault,DNS:cartae-vault,DNS:localhost,IP:127.0.0.1,IP:172.23.0.10"
```

**Certificat serveur (PostgreSQL):**

```bash
./generate-server-cert.sh postgres "DNS:postgres,DNS:cartae-postgres,DNS:localhost,IP:127.0.0.1,IP:172.22.0.10"
```

**Certificat client (database-api):**

```bash
./generate-client-cert.sh database-api
```

---

## 📊 Spécifications Certificats

### CA Root

- **Algorithme:** RSA 4096 bits
- **Validité:** 10 ans (3650 jours)
- **Hash:** SHA-256
- **Usage:** Signature de certificats (CA:TRUE)
- **CN:** Cartae Root CA

### Certificats Serveurs (Vault, PostgreSQL)

- **Algorithme:** RSA 2048 bits
- **Validité:** 1 an (365 jours)
- **Hash:** SHA-256
- **Usage:** digitalSignature, keyEncipherment, dataEncipherment
- **SANs:** DNS + IP (Subject Alternative Names)
  - Vault: `DNS:vault,DNS:cartae-vault,DNS:localhost,IP:127.0.0.1,IP:172.23.0.10`
  - PostgreSQL: `DNS:postgres,DNS:cartae-postgres,DNS:localhost,IP:127.0.0.1,IP:172.22.0.10`

### Certificats Clients (database-api)

- **Algorithme:** RSA 2048 bits
- **Validité:** 1 an (365 jours)
- **Hash:** SHA-256
- **Usage:** digitalSignature, keyEncipherment
- **Extended Usage:** clientAuth (mTLS)
- **CN:** database-api

---

## 🔒 Sécurité

### Permissions Fichiers

```bash
# Clés privées (SECRET - propriétaire seulement)
chmod 600 ca/ca.key
chmod 600 server/*.key
chmod 600 client/*.key

# Certificats publics (lecture seule)
chmod 644 ca/ca.crt
chmod 644 server/*.crt
chmod 644 client/*.crt
```

### .gitignore

```gitignore
# PKI - NE JAMAIS COMMITER LES CLÉS PRIVÉES
infra/pki/ca/ca.key
infra/pki/ca/ca.srl
infra/pki/server/*.key
infra/pki/server/*.csr
infra/pki/server/*.ext
infra/pki/client/*.key
infra/pki/client/*.csr
infra/pki/client/*.ext
```

### Stockage Sécurisé (Recommandations)

1. **Dev:** Clés locales (OK, pas de données sensibles)
2. **Staging/Prod:** Clés dans **HashiCorp Vault** (secrets/pki/\*)
   ```bash
   vault kv put secret/pki/ca key=@ca/ca.key
   vault kv put secret/pki/vault key=@server/vault.key
   vault kv put secret/pki/postgres key=@server/postgres.key
   vault kv put secret/pki/database-api key=@client/database-api.key
   ```

---

## 🔄 Renouvellement Certificats

Les certificats serveurs/clients expirent après **1 an**. Voici comment les renouveler:

### Méthode Manuelle

```bash
# Régénérer certificat serveur Vault (expire dans < 30 jours)
cd infra/pki/scripts
./generate-server-cert.sh vault "DNS:vault,DNS:cartae-vault,DNS:localhost,IP:127.0.0.1,IP:172.23.0.10"

# Redémarrer Vault pour charger nouveau certificat
docker-compose restart vault
```

### Méthode Automatisée (TODO - Session 81h)

- Cron job quotidien: vérifie expiration certificats (< 30 jours)
- Si expire bientôt → Régénère auto + redémarre service
- Alerte Slack/Email si échec renouvellement

---

## ✅ Vérification Certificats

### Vérifier Validité Certificat

```bash
# Afficher détails certificat
openssl x509 -in server/vault.crt -noout -text

# Vérifier expiration
openssl x509 -in server/vault.crt -noout -enddate

# Vérifier signature par CA
openssl verify -CAfile ca/ca.crt server/vault.crt
```

### Tester Handshake TLS

```bash
# Vault (port 8200)
openssl s_client -connect localhost:8200 -CAfile ca/ca.crt

# PostgreSQL (port 5432)
openssl s_client -connect localhost:5432 -CAfile ca/ca.crt -starttls postgres
```

### Tester mTLS (Mutual Authentication)

```bash
# Vault avec certificat client
openssl s_client \
  -connect localhost:8200 \
  -CAfile ca/ca.crt \
  -cert client/database-api.crt \
  -key client/database-api.key
```

---

## 📖 Références

- **OpenSSL Documentation:** https://www.openssl.org/docs/
- **TLS 1.3 Best Practices:** https://wiki.mozilla.org/Security/Server_Side_TLS
- **mTLS Guide:** https://smallstep.com/hello-mtls/
- **Vault TLS:** https://developer.hashicorp.com/vault/docs/configuration/listener/tcp#tls-parameters
- **PostgreSQL SSL:** https://www.postgresql.org/docs/current/ssl-tcp.html

---

## 🆘 Troubleshooting

### Erreur: "CA root non trouvé"

```bash
# Générer d'abord le CA root
cd infra/pki/scripts
./generate-ca.sh
```

### Erreur: "Certificat invalide (non signé par CA)"

```bash
# Vérifier que CA existe et est valide
openssl x509 -in ../ca/ca.crt -noout -text

# Régénérer certificat
./generate-server-cert.sh vault "DNS:vault,DNS:localhost,IP:127.0.0.1"
```

### Erreur: "Permission denied" lors signature

```bash
# Vérifier permissions clé CA
chmod 600 ../ca/ca.key
```

### Vault: "tls: failed to verify certificate"

- Vérifier que SANs incluent hostname/IP utilisé
- Vérifier que `ca.crt` est bien le CA qui a signé `vault.crt`
- Vérifier permissions fichiers (600 pour .key, 644 pour .crt)

---

**Auteur:** Claude Code
**Session:** 81b - TLS/mTLS End-to-End
**Date:** 15 Novembre 2025
