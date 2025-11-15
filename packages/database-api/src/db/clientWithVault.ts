/**
 * PostgreSQL Client avec Vault Integration
 * Session 78 - Phase 5
 *
 * Extension du client PostgreSQL pour récupérer credentials depuis Vault.
 * Compatible avec client.ts existant (fallback sur env vars si Vault disabled).
 *
 * @module db/clientWithVault
 */

import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import { getVaultClient } from '../vault/VaultClient';

dotenv.config();

/**
 * Crée un pool PostgreSQL avec credentials depuis Vault ou env vars
 *
 * Mode 1: Vault enabled (VAULT_ENABLED=true)
 * - Récupère credentials depuis Vault (secret: database/postgres)
 * - Construit connection string dynamiquement
 *
 * Mode 2: Vault disabled (VAULT_ENABLED=false ou absent)
 * - Utilise DATABASE_URL depuis .env (comportement classique)
 *
 * @returns Pool PostgreSQL configuré
 */
export async function createPoolWithVault(): Promise<Pool> {
  const vaultEnabled = process.env.VAULT_ENABLED === 'true';

  let poolConfig: PoolConfig;

  if (vaultEnabled) {
    try {
      console.log('🔐 Fetching PostgreSQL credentials from Vault...');

      // Récupérer credentials depuis Vault
      const vaultClient = getVaultClient();
      const credentials = await vaultClient.getPostgresCredentials();

      // Construire connection string depuis Vault
      const connectionString = `postgresql://${credentials.username}:${credentials.password}@${credentials.host}:${credentials.port}/${credentials.database}`;

      console.log('✅ PostgreSQL credentials retrieved from Vault');
      console.log(`   Host: ${credentials.host}:${credentials.port}`);
      console.log(`   Database: ${credentials.database}`);
      console.log(`   User: ${credentials.username}`);

      poolConfig = {
        connectionString,
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
        application_name: 'cartae-database-api',
      };
    } catch (error) {
      console.error('❌ Failed to fetch credentials from Vault:', error);
      console.warn('⚠️ Falling back to DATABASE_URL from .env');

      // Fallback sur env vars
      poolConfig = {
        connectionString: process.env.DATABASE_URL,
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
        application_name: 'cartae-database-api',
      };
    }
  } else {
    // Vault disabled, utiliser DATABASE_URL classique
    console.log('🔌 Using PostgreSQL credentials from DATABASE_URL (.env)');

    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
      application_name: 'cartae-database-api',
    };
  }

  // Créer et retourner pool
  const pool = new Pool(poolConfig);

  return pool;
}

/**
 * Teste la connexion PostgreSQL avec pgvector
 *
 * @param pool Pool PostgreSQL
 * @returns Promise<true> si connexion OK, throw sinon
 */
export async function testConnectionWithVault(pool: Pool): Promise<boolean> {
  const client = await pool.connect();

  try {
    // Test basique
    const result = await client.query('SELECT NOW() as now, version() as version');
    console.log('✅ PostgreSQL connected:', {
      time: result.rows[0].now,
      version: result.rows[0].version.split(' ')[0], // "PostgreSQL 16.x"
    });

    // Vérifier pgvector installé
    const vectorCheck = await client.query("SELECT * FROM pg_extension WHERE extname = 'vector'");

    if (vectorCheck.rows.length === 0) {
      throw new Error('❌ pgvector extension NOT installed! Run 01-extensions.sql');
    }

    console.log('✅ pgvector extension installed');

    return true;
  } finally {
    client.release();
  }
}

/**
 * Exemple d'utilisation:
 *
 * ```typescript
 * // Au démarrage du serveur
 * const pool = await createPoolWithVault();
 * await testConnectionWithVault(pool);
 *
 * // Utiliser pool normalement
 * const result = await pool.query('SELECT * FROM cartae_items LIMIT 10');
 * ```
 */
