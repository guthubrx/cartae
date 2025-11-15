/**
 * Cartae - Database API - TLS/mTLS Clients Configuration
 * Session 81b - TLS/mTLS End-to-End
 *
 * Exemples de configuration clients TLS pour:
 * - VaultClient (mTLS avec node-vault)
 * - PostgreSQL Pool (TLS avec pg)
 *
 * À intégrer dans packages/database-api/src/
 */

import fs from 'fs';
import path from 'path';
import vault from 'node-vault';
import { Pool, PoolConfig } from 'pg';

// ==================================================
// CONFIGURATION TLS - Environment Variables
// ==================================================

interface TLSConfig {
  enabled: boolean;
  caPath: string;
  certPath: string;
  keyPath: string;
  verify: boolean;
}

function getTLSConfig(): TLSConfig {
  return {
    enabled: process.env.TLS_ENABLED === 'true',
    caPath: process.env.TLS_CA_PATH || '/app/tls/ca/ca.crt',
    certPath: process.env.TLS_CERT_PATH || '/app/tls/client/database-api.crt',
    keyPath: process.env.TLS_KEY_PATH || '/app/tls/client/database-api.key',
    verify: process.env.TLS_VERIFY !== 'false', // true par défaut
  };
}

// ==================================================
// VAULT CLIENT - mTLS Configuration
// ==================================================

/**
 * Créer client Vault avec mTLS (mutual TLS)
 *
 * Requiert certificat client signé par Cartae CA:
 * - /app/tls/client/database-api.crt (certificat client)
 * - /app/tls/client/database-api.key (clé privée client)
 * - /app/tls/ca/ca.crt (CA root pour vérifier serveur)
 */
export function createVaultClientWithMTLS() {
  const tlsConfig = getTLSConfig();

  // Mode dev: pas de TLS (http://vault:8200)
  if (!tlsConfig.enabled) {
    return vault({
      apiVersion: 'v1',
      endpoint: process.env.VAULT_ADDR || 'http://vault:8200',
      token: process.env.VAULT_TOKEN,
    });
  }

  // Mode production: TLS + mTLS (https://vault:8200)
  const requestOptions: any = {
    // HTTPS agent avec mTLS
    agentOptions: {
      // Certificat client (mTLS)
      cert: fs.readFileSync(tlsConfig.certPath),
      key: fs.readFileSync(tlsConfig.keyPath),

      // CA root (pour vérifier certificat serveur Vault)
      ca: fs.readFileSync(tlsConfig.caPath),

      // Vérifier certificat serveur (hostname + CA)
      rejectUnauthorized: tlsConfig.verify,

      // Cipher suites sécurisés uniquement (TLS 1.3 + TLS 1.2)
      ciphers: 'TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256',

      // TLS 1.2 minimum
      minVersion: 'TLSv1.2',
    },
  };

  return vault({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR || 'https://vault:8200',
    token: process.env.VAULT_TOKEN,
    requestOptions,
  });
}

// ==================================================
// POSTGRESQL CLIENT - TLS Configuration
// ==================================================

/**
 * Créer Pool PostgreSQL avec TLS
 *
 * Modes SSL supportés:
 * - sslmode=require     : TLS obligatoire, pas de vérif client cert
 * - sslmode=verify-ca   : TLS + vérif CA serveur
 * - sslmode=verify-full : TLS + vérif CA + hostname serveur (RECOMMANDÉ)
 *
 * Avec certificat client (optionnel, pour mTLS):
 * - /app/tls/client/database-api.crt
 * - /app/tls/client/database-api.key
 */
export function createPostgresPoolWithTLS(): Pool {
  const tlsConfig = getTLSConfig();

  const baseConfig: PoolConfig = {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'cartae',
    user: process.env.POSTGRES_USER || 'cartae',
    password: process.env.POSTGRES_PASSWORD,

    // Pool settings
    max: 20, // Max 20 connexions
    idleTimeoutMillis: 30000, // 30s idle timeout
    connectionTimeoutMillis: 10000, // 10s connection timeout
  };

  // Mode dev: pas de TLS
  if (!tlsConfig.enabled) {
    return new Pool({
      ...baseConfig,
      ssl: false,
    });
  }

  // Mode production: TLS (avec certificat client optionnel)
  const sslConfig: any = {
    // CA root (pour vérifier certificat serveur PostgreSQL)
    ca: fs.readFileSync(tlsConfig.caPath),

    // Vérifier certificat serveur (hostname + CA)
    rejectUnauthorized: tlsConfig.verify,

    // Certificat client (optionnel, pour mTLS)
    // Si pg_hba.conf requiert clientcert=verify-full
    cert: fs.readFileSync(tlsConfig.certPath),
    key: fs.readFileSync(tlsConfig.keyPath),
  };

  return new Pool({
    ...baseConfig,
    ssl: sslConfig,
  });
}

// ==================================================
// EXEMPLE USAGE
// ==================================================

async function exampleUsage() {
  // Vault client avec mTLS
  const vaultClient = createVaultClientWithMTLS();

  try {
    // Tester connexion Vault
    const health = await vaultClient.health();
    console.log('✅ Vault health:', health);

    // Lire secret
    const secret = await vaultClient.read('secret/data/database/postgres');
    console.log('✅ Secret lu depuis Vault:', secret.data.data);
  } catch (error) {
    console.error('❌ Erreur Vault:', error);
  }

  // PostgreSQL pool avec TLS
  const pool = createPostgresPoolWithTLS();

  try {
    // Tester connexion PostgreSQL
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ PostgreSQL version:', result.rows[0].version);

    // Vérifier SSL actif
    const sslStatus = await client.query('SELECT ssl, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid()');
    console.log('✅ PostgreSQL SSL:', sslStatus.rows[0]);

    client.release();
  } catch (error) {
    console.error('❌ Erreur PostgreSQL:', error);
  } finally {
    await pool.end();
  }
}

// ==================================================
// ENVIRONMENT VARIABLES REQUISES
// ==================================================

/**
 * Mode DEV (pas de TLS):
 * - TLS_ENABLED=false
 * - VAULT_ADDR=http://vault:8200
 * - VAULT_TOKEN=root-dev-token
 * - POSTGRES_HOST=postgres
 * - POSTGRES_PASSWORD=changeme123
 *
 * Mode PRODUCTION (TLS + mTLS):
 * - TLS_ENABLED=true
 * - TLS_CA_PATH=/app/tls/ca/ca.crt
 * - TLS_CERT_PATH=/app/tls/client/database-api.crt
 * - TLS_KEY_PATH=/app/tls/client/database-api.key
 * - TLS_VERIFY=true
 * - VAULT_ADDR=https://vault:8200
 * - VAULT_TOKEN=<from-vault-init>
 * - POSTGRES_HOST=postgres
 * - POSTGRES_PASSWORD=<from-env-file>
 */

// ==================================================
// TROUBLESHOOTING
// ==================================================

/**
 * Erreur: "certificate verify failed"
 * → Vérifier que ca.crt est bien le CA qui a signé le certificat serveur
 * → Vérifier hostname matches SANs dans certificat serveur
 *
 * Erreur: "unable to get local issuer certificate"
 * → CA root manquant ou incorrect
 * → Vérifier TLS_CA_PATH pointe vers ca.crt
 *
 * Erreur: "no pg_hba.conf entry for host"
 * → pg_hba.conf ne permet pas connexions depuis cette IP
 * → Vérifier que APP zone (172.21.0.0/24) est autorisée
 *
 * Erreur: "connection requires a valid client certificate"
 * → PostgreSQL requiert certificat client (clientcert=verify-full)
 * → Fournir cert + key dans ssl config
 *
 * Erreur: "Vault is sealed"
 * → Vault non unsealed après démarrage
 * → Exécuter: vault operator unseal <key1>
 */
