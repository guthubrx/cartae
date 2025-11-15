/**
 * Audit Storage (PostgreSQL)
 * Session 81g - Incident Response & Security Operations
 *
 * Stockage des audit logs dans PostgreSQL avec contraintes d'immutabilité.
 * Implémente le pattern WORM (Write Once Read Many).
 *
 * Fonctionnalités:
 * - Write-only table (pas de UPDATE/DELETE autorisés)
 * - Rétention configurable (défaut 7 ans pour compliance)
 * - Indexes optimisés pour recherche
 * - Compression automatique des anciennes entrées
 */

import { Pool, PoolClient } from 'pg';
import { AuditLogEntry } from './audit-logger';

/**
 * Configuration du storage
 */
export interface AuditStorageConfig {
  connectionString: string;
  retentionDays?: number;
  tableName?: string;
  enableCompression?: boolean;
}

/**
 * Audit Storage
 */
export class AuditStorage {
  private pool: Pool;
  private retentionDays: number;
  private tableName: string;
  private enableCompression: boolean;

  constructor(config: AuditStorageConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.retentionDays = config.retentionDays ?? 2555; // 7 ans (compliance SOC2)
    this.tableName = config.tableName || 'audit_log';
    this.enableCompression = config.enableCompression ?? true;
  }

  /**
   * Initialiser storage (créer table si nécessaire)
   */
  public async initialize(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Créer table audit_log avec contraintes WORM
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id UUID PRIMARY KEY,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          user_id UUID,
          username TEXT,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          resource_id TEXT,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          query JSONB,
          body JSONB,
          ip_address INET NOT NULL,
          user_agent TEXT,
          status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
          status_code INTEGER NOT NULL,
          response_time INTEGER NOT NULL,
          error_message TEXT,
          metadata JSONB,
          hash_prev TEXT,
          hash_current TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Contrainte d'immutabilité: bloquer UPDATE et DELETE
        CREATE OR REPLACE RULE audit_log_no_update AS
          ON UPDATE TO ${this.tableName} DO INSTEAD NOTHING;

        CREATE OR REPLACE RULE audit_log_no_delete AS
          ON DELETE TO ${this.tableName} DO INSTEAD NOTHING;

        -- Indexes pour performance
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON ${this.tableName} (timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_user_id ON ${this.tableName} (user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_username ON ${this.tableName} (username);
        CREATE INDEX IF NOT EXISTS idx_audit_action ON ${this.tableName} (action);
        CREATE INDEX IF NOT EXISTS idx_audit_resource ON ${this.tableName} (resource);
        CREATE INDEX IF NOT EXISTS idx_audit_ip ON ${this.tableName} (ip_address);
        CREATE INDEX IF NOT EXISTS idx_audit_status ON ${this.tableName} (status);

        -- Index GIN pour recherche JSONB
        CREATE INDEX IF NOT EXISTS idx_audit_metadata ON ${this.tableName} USING GIN (metadata);
        CREATE INDEX IF NOT EXISTS idx_audit_query ON ${this.tableName} USING GIN (query);

        -- Partition par mois (pour archivage futur)
        -- Note: Nécessite PostgreSQL 10+
        -- CREATE TABLE IF NOT EXISTS ${this.tableName}_y2025m01 PARTITION OF ${this.tableName}
        --   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
      `);

      console.log('Audit storage initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Écrire entrée d'audit (WORM - Write Once)
   */
  public async write(entry: AuditLogEntry): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `
        INSERT INTO ${this.tableName} (
          id, timestamp, user_id, username, action, resource, resource_id,
          method, path, query, body, ip_address, user_agent, status,
          status_code, response_time, error_message, metadata,
          hash_prev, hash_current
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20
        )
      `,
        [
          entry.id,
          entry.timestamp,
          entry.userId,
          entry.username,
          entry.action,
          entry.resource,
          entry.resourceId,
          entry.method,
          entry.path,
          JSON.stringify(entry.query),
          entry.body ? JSON.stringify(entry.body) : null,
          entry.ipAddress,
          entry.userAgent,
          entry.status,
          entry.statusCode,
          entry.responseTime,
          entry.errorMessage,
          JSON.stringify(entry.metadata),
          entry.hashPrev,
          entry.hashCurrent,
        ]
      );
    } catch (error) {
      console.error('Failed to write audit entry:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Lire entrées d'audit (avec filtres)
   */
  public async read(filters: {
    userId?: string;
    username?: string;
    action?: string;
    resource?: string;
    ipAddress?: string;
    status?: 'success' | 'failure';
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    const client = await this.pool.connect();

    try {
      let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.userId) {
        query += ` AND user_id = $${paramIndex++}`;
        params.push(filters.userId);
      }

      if (filters.username) {
        query += ` AND username = $${paramIndex++}`;
        params.push(filters.username);
      }

      if (filters.action) {
        query += ` AND action = $${paramIndex++}`;
        params.push(filters.action);
      }

      if (filters.resource) {
        query += ` AND resource = $${paramIndex++}`;
        params.push(filters.resource);
      }

      if (filters.ipAddress) {
        query += ` AND ip_address = $${paramIndex++}`;
        params.push(filters.ipAddress);
      }

      if (filters.status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.dateFrom) {
        query += ` AND timestamp >= $${paramIndex++}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ` AND timestamp <= $${paramIndex++}`;
        params.push(filters.dateTo);
      }

      query += ` ORDER BY timestamp DESC`;

      if (filters.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await client.query(query, params);

      return result.rows.map(this.rowToEntry);
    } finally {
      client.release();
    }
  }

  /**
   * Lire TOUTES les entrées (pour vérification intégrité)
   */
  public async readAll(): Promise<AuditLogEntry[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM ${this.tableName} ORDER BY timestamp ASC`
      );
      return result.rows.map(this.rowToEntry);
    } finally {
      client.release();
    }
  }

  /**
   * Compter entrées (pour pagination)
   */
  public async count(filters: {
    userId?: string;
    username?: string;
    action?: string;
    resource?: string;
    status?: 'success' | 'failure';
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<number> {
    const client = await this.pool.connect();

    try {
      let query = `SELECT COUNT(*) FROM ${this.tableName} WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.userId) {
        query += ` AND user_id = $${paramIndex++}`;
        params.push(filters.userId);
      }

      if (filters.username) {
        query += ` AND username = $${paramIndex++}`;
        params.push(filters.username);
      }

      if (filters.action) {
        query += ` AND action = $${paramIndex++}`;
        params.push(filters.action);
      }

      if (filters.resource) {
        query += ` AND resource = $${paramIndex++}`;
        params.push(filters.resource);
      }

      if (filters.status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.dateFrom) {
        query += ` AND timestamp >= $${paramIndex++}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ` AND timestamp <= $${paramIndex++}`;
        params.push(filters.dateTo);
      }

      const result = await client.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } finally {
      client.release();
    }
  }

  /**
   * Archiver anciennes entrées (compression)
   * Note: Ne supprime PAS, juste compresse pour économiser espace
   */
  public async archiveOldEntries(): Promise<number> {
    if (!this.enableCompression) return 0;

    const client = await this.pool.connect();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      // TODO: Implémenter archivage réel (pg_dump + compression + S3)
      // Pour l'instant, juste compter ce qui serait archivé

      const result = await client.query(
        `SELECT COUNT(*) FROM ${this.tableName} WHERE timestamp < $1`,
        [cutoffDate]
      );

      const count = parseInt(result.rows[0].count, 10);

      console.log(`${count} entries eligible for archiving (older than ${this.retentionDays} days)`);

      return count;
    } finally {
      client.release();
    }
  }

  /**
   * Convertir row PostgreSQL en AuditLogEntry
   */
  private rowToEntry(row: any): AuditLogEntry {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      userId: row.user_id,
      username: row.username,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      method: row.method,
      path: row.path,
      query: row.query || {},
      body: row.body || null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status,
      statusCode: row.status_code,
      responseTime: row.response_time,
      errorMessage: row.error_message,
      metadata: row.metadata || {},
      hashPrev: row.hash_prev,
      hashCurrent: row.hash_current,
    };
  }

  /**
   * Fermer connexion pool
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export default AuditStorage;
