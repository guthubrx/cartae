/**
 * Sync Background Worker - Synchronisation automatique périodique
 * Session 129 - Persistance Hybride
 *
 * Responsabilités:
 * - Vérifier périodiquement les sources avec auto_sync = true
 * - Déclencher les syncs pour sources où next_sync_at <= NOW()
 * - Logger dans sync_history
 * - Calculer next_sync_at après sync
 * - Gérer les erreurs et retry logic
 */

import { pool } from '../db/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('SyncWorker');

/**
 * Configuration du worker
 */
export interface SyncWorkerConfig {
  /** Intervalle de vérification (ms) */
  checkInterval?: number;

  /** Nombre max de syncs simultanées */
  maxConcurrentSyncs?: number;

  /** Activer le worker */
  enabled?: boolean;
}

/**
 * Sync Background Worker
 */
export class SyncWorker {
  private checkInterval: number;
  private maxConcurrentSyncs: number;
  private enabled: boolean;
  private timer?: NodeJS.Timeout;
  private activeSyncs: Set<string> = new Set();

  constructor(config: SyncWorkerConfig = {}) {
    this.checkInterval = config.checkInterval ?? 60000; // 1 min par défaut
    this.maxConcurrentSyncs = config.maxConcurrentSyncs ?? 5;
    this.enabled = config.enabled ?? true;
  }

  /**
   * Démarrer le worker
   */
  start(): void {
    if (!this.enabled) {
      logger.warn('Sync worker is disabled');
      return;
    }

    if (this.timer) {
      logger.warn('Sync worker already running');
      return;
    }

    logger.info('Starting sync worker', {
      checkInterval: this.checkInterval,
      maxConcurrentSyncs: this.maxConcurrentSyncs,
    });

    // Exécuter immédiatement puis à intervalle régulier
    this.checkAndSyncSources();

    this.timer = setInterval(() => {
      this.checkAndSyncSources();
    }, this.checkInterval);
  }

  /**
   * Arrêter le worker
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      logger.info('Sync worker stopped');
    }
  }

  /**
   * Vérifier et synchroniser les sources
   */
  private async checkAndSyncSources(): Promise<void> {
    try {
      // Récupérer les sources à synchroniser
      const result = await pool.query(`
        SELECT id, name, connector_type AS "connectorType", config,
               field_mappings AS "fieldMappings", sync_interval AS "syncInterval",
               user_id AS "userId"
        FROM sources
        WHERE auto_sync = TRUE
          AND status = 'idle'
          AND next_sync_at <= NOW()
        ORDER BY next_sync_at ASC
        LIMIT $1
      `, [this.maxConcurrentSyncs - this.activeSyncs.size]);

      const sources = result.rows;

      if (sources.length === 0) {
        logger.debug('No sources to sync');
        return;
      }

      logger.info('Found sources to sync', {
        count: sources.length,
        activeSyncs: this.activeSyncs.size,
      });

      // Lancer les syncs en parallèle (limité par maxConcurrentSyncs)
      for (const source of sources) {
        if (this.activeSyncs.size >= this.maxConcurrentSyncs) {
          logger.warn('Max concurrent syncs reached, deferring remaining sources');
          break;
        }

        // Lancer sync en arrière-plan (fire-and-forget)
        this.syncSource(source).catch((error) => {
          logger.error('Uncaught error in syncSource', {
            sourceId: source.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    } catch (error) {
      logger.error('Error checking sources for sync', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Synchroniser une source
   */
  private async syncSource(source: any): Promise<void> {
    const sourceId = source.id;

    if (this.activeSyncs.has(sourceId)) {
      logger.warn('Sync already in progress for source', { sourceId });
      return;
    }

    this.activeSyncs.add(sourceId);

    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startedAt = new Date();

    try {
      logger.info('Starting sync for source', {
        sourceId,
        sourceName: source.name,
        connectorType: source.connectorType,
      });

      // Marquer la source comme 'syncing'
      await pool.query(`
        UPDATE sources
        SET status = 'syncing', last_sync_at = NOW()
        WHERE id = $1
      `, [sourceId]);

      // Créer l'entrée d'historique (status = 'running')
      await pool.query(`
        INSERT INTO sync_history (
          id, source_id, started_at, status, triggered_by, sync_type
        )
        VALUES ($1, $2, $3, 'running', 'worker', 'auto')
      `, [syncId, sourceId, startedAt]);

      // TODO: Appeler le connecteur pour effectuer la sync
      // const connector = getConnector(source.connectorType);
      // const result = await connector.sync(source.config, source.fieldMappings);

      // Pour l'instant, simuler une sync réussie
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();

      // Simuler résultat sync (à remplacer par vrai résultat du connecteur)
      const syncResult = {
        itemsAdded: 0,
        itemsUpdated: 0,
        itemsDeleted: 0,
        itemsSkipped: 0,
        totalItems: 0,
      };

      // Mettre à jour l'historique (success)
      await pool.query(`
        UPDATE sync_history
        SET
          finished_at = $2,
          duration_ms = $3,
          status = 'success',
          items_added = $4,
          items_updated = $5,
          items_deleted = $6,
          items_skipped = $7,
          total_items = $8
        WHERE id = $1
      `, [
        syncId,
        finishedAt,
        durationMs,
        syncResult.itemsAdded,
        syncResult.itemsUpdated,
        syncResult.itemsDeleted,
        syncResult.itemsSkipped,
        syncResult.totalItems,
      ]);

      // Calculer next_sync_at et mettre à jour la source
      const nextSyncAt = new Date(Date.now() + source.syncInterval);

      await pool.query(`
        UPDATE sources
        SET
          status = 'idle',
          last_sync_at = NOW(),
          next_sync_at = $2,
          last_sync_duration = $3,
          last_sync_error = NULL
        WHERE id = $1
      `, [sourceId, nextSyncAt, durationMs]);

      logger.info('Sync completed successfully', {
        sourceId,
        syncId,
        durationMs,
        nextSyncAt,
      });
    } catch (error) {
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Sync failed for source', {
        sourceId,
        syncId,
        error: errorMessage,
      });

      // Mettre à jour l'historique (error)
      await pool.query(`
        UPDATE sync_history
        SET
          finished_at = $2,
          duration_ms = $3,
          status = 'error',
          error_message = $4
        WHERE id = $1
      `, [syncId, finishedAt, durationMs, errorMessage]);

      // Marquer la source en erreur et calculer next retry
      const nextRetryAt = new Date(Date.now() + 300000); // Retry dans 5 min

      await pool.query(`
        UPDATE sources
        SET
          status = 'error',
          last_sync_error = $2,
          next_sync_at = $3
        WHERE id = $1
      `, [sourceId, errorMessage, nextRetryAt]);
    } finally {
      this.activeSyncs.delete(sourceId);
    }
  }

  /**
   * Forcer la sync d'une source spécifique
   */
  async forceSyncSource(sourceId: string): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT id, name, connector_type AS "connectorType", config,
               field_mappings AS "fieldMappings", sync_interval AS "syncInterval",
               user_id AS "userId"
        FROM sources
        WHERE id = $1
      `, [sourceId]);

      if (result.rows.length === 0) {
        throw new Error(`Source ${sourceId} not found`);
      }

      const source = result.rows[0];

      logger.info('Forcing sync for source', {
        sourceId,
        sourceName: source.name,
      });

      await this.syncSource(source);
    } catch (error) {
      logger.error('Error forcing sync for source', {
        sourceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Obtenir le statut du worker
   */
  getStatus(): {
    running: boolean;
    activeSyncs: number;
    maxConcurrentSyncs: number;
    checkInterval: number;
  } {
    return {
      running: this.timer !== undefined,
      activeSyncs: this.activeSyncs.size,
      maxConcurrentSyncs: this.maxConcurrentSyncs,
      checkInterval: this.checkInterval,
    };
  }
}

// Instance globale du worker
let syncWorkerInstance: SyncWorker | null = null;

/**
 * Obtenir l'instance du worker (singleton)
 */
export function getSyncWorker(config?: SyncWorkerConfig): SyncWorker {
  if (!syncWorkerInstance) {
    syncWorkerInstance = new SyncWorker(config);
  }

  return syncWorkerInstance;
}

/**
 * Démarrer le worker automatiquement (appelé depuis index.ts)
 */
export function startSyncWorker(config?: SyncWorkerConfig): SyncWorker {
  const worker = getSyncWorker(config);
  worker.start();
  return worker;
}

/**
 * Arrêter le worker
 */
export function stopSyncWorker(): void {
  if (syncWorkerInstance) {
    syncWorkerInstance.stop();
  }
}
