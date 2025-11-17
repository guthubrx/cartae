/**
 * PostgreSQL Client - Pool de connexions avec pgvector
 *
 * Pool de connexions optimisé pour performance sur gros volumes (100k+ items).
 * Configure automatiquement pgvector et les paramètres de recherche.
 *
 * @module db/client
 */

import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Configuration du pool de connexions PostgreSQL
 *
 * Pool = ensemble de connexions réutilisables (évite overhead connect/disconnect)
 * Optimisé pour API haute performance
 */
const poolConfig: PoolConfig = {
  // Connection string depuis .env
  connectionString: process.env.DATABASE_URL,

  // Pool size (nombre de connexions simultanées)
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),

  // Timeouts
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10), // 30s
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10), // 5s

  // Retry logic
  application_name: 'cartae-database-api',
};

/**
 * Pool global de connexions PostgreSQL
 *
 * Réutilisé par toutes les requêtes de l'API
 * Fermé automatiquement au shutdown de l'application
 */
export const pool = new Pool(poolConfig);

/**
 * Teste la connexion PostgreSQL et vérifie pgvector
 *
 * @returns Promise<true> si connexion OK, throw sinon
 */
export async function testConnection(): Promise<boolean> {
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
 * Ferme proprement le pool de connexions
 *
 * À appeler au shutdown de l'application (signal SIGTERM/SIGINT)
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('🔌 PostgreSQL pool closed');
}

/**
 * Helper - Exécute une requête avec gestion d'erreurs
 *
 * @param query - Requête SQL
 * @param params - Paramètres SQL (parameterized query, protection SQL injection)
 * @returns Résultat de la requête
 *
 * @example
 * const items = await executeQuery('SELECT * FROM cartae_items WHERE type = $1', ['email']);
 */
export async function executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect();

  try {
    const result = await client.query(query, params);
    return result.rows as T[];
  } catch (error) {
    console.error('❌ SQL Query Error:', {
      query: query.substring(0, 200), // Tronquer pour logs
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper - Transaction SQL (atomicité garantie)
 *
 * @param callback - Fonction à exécuter dans la transaction
 * @returns Résultat du callback
 *
 * @example
 * await withTransaction(async (client) => {
 *   await client.query('INSERT INTO cartae_items ...');
 *   await client.query('UPDATE other_table ...');
 * });
 */
export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Cleanup au shutdown
process.on('SIGTERM', closePool);
process.on('SIGINT', closePool);
