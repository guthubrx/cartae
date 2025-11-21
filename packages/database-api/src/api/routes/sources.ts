/**
 * Sources Routes - API CRUD pour sources (PostgreSQL + RLS)
 * Session 129 - Persistance Hybride IndexedDB + PostgreSQL
 *
 * Endpoints:
 * - GET /api/sources - Get all sources (user-scoped via RLS)
 * - GET /api/sources/:id - Get source by ID
 * - POST /api/sources - Create new source
 * - PUT /api/sources/:id - Update source (optimistic locking)
 * - DELETE /api/sources/:id - Delete source
 * - GET /api/sources/:id/history - Get sync history
 * - POST /api/sources/:id/history - Save sync history entry
 * - GET /api/sync-queue - Get pending queue items
 * - POST /api/sync-queue - Enqueue offline operation
 * - POST /api/sync-queue/:id/process - Process queue item
 *
 * @module api/routes/sources
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { setRLSContext, cleanupRLSContext, getRLSClient } from '../../middleware/rls';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { createLogger } from '../../utils/logger';

const router = Router();
const logger = createLogger('SourcesRoutes');

// Appliquer les middlewares RLS à toutes les routes
router.use(requireAuth);
router.use(setRLSContext);
router.use(cleanupRLSContext);

/* ==================== Validation Schemas ==================== */

const SourceConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  connectorType: z.string(),
  config: z.record(z.any()),
  status: z.enum(['configuring', 'ready', 'syncing', 'error', 'disabled']).default('configuring'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastSyncAt: z.string().datetime().optional(),
  autoSync: z.boolean().optional(),
  syncInterval: z.number().optional(),
  fieldMappings: z.array(z.any()),
  metadata: z.record(z.any()).optional(),
});

const CreateSourceSchema = z.object({
  source: SourceConfigSchema,
});

const UpdateSourceSchema = z.object({
  source: SourceConfigSchema,
  expectedVersion: z.number().optional(),
});

const SyncHistoryEntrySchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  status: z.enum(['success', 'error', 'partial']),
  itemsProcessed: z.number().optional(),
  itemsAdded: z.number().optional(),
  itemsUpdated: z.number().optional(),
  itemsDeleted: z.number().optional(),
  error: z.string().optional(),
});

const SaveSyncHistorySchema = z.object({
  entry: SyncHistoryEntrySchema,
});

const EnqueueOperationSchema = z.object({
  queueItem: z.object({
    operation: z.enum(['create', 'update', 'delete']),
    entityType: z.literal('source'),
    entityId: z.string().optional(),
    payload: z.any(),
    maxRetries: z.number().default(3),
    userId: z.string().uuid(),
  }),
});

/* ==================== Sources CRUD ==================== */

/**
 * GET /api/sources
 * Get all sources for current user (RLS-scoped)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getRLSClient(req);

    const result = await client.query(`
      SELECT
        id, name, connector_type AS "connectorType", config, status,
        field_mappings AS "fieldMappings", auto_sync AS "autoSync",
        sync_interval AS "syncInterval", last_sync_at AS "lastSyncAt",
        items_count AS "itemsCount", total_size AS "totalSize",
        last_sync_duration AS "lastSyncDuration", last_sync_error AS "lastSyncError",
        created_at AS "createdAt", updated_at AS "updatedAt",
        metadata, version, checksum
      FROM sources
      ORDER BY created_at DESC
    `);

    logger.info('Sources fetched successfully', {
      userId: req.user!.id,
      count: result.rows.length,
    });

    res.json({
      status: 'success',
      sources: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching sources', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user!.id,
    });
    res.status(500).json({
      error: 'Failed to fetch sources',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/sources/:id
 * Get single source by ID (RLS-scoped)
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = getRLSClient(req);

    const result = await client.query(
      `
      SELECT
        id, name, connector_type AS "connectorType", config, status,
        field_mappings AS "fieldMappings", auto_sync AS "autoSync",
        sync_interval AS "syncInterval", last_sync_at AS "lastSyncAt",
        items_count AS "itemsCount", total_size AS "totalSize",
        last_sync_duration AS "lastSyncDuration", last_sync_error AS "lastSyncError",
        created_at AS "createdAt", updated_at AS "updatedAt",
        metadata, version, checksum
      FROM sources
      WHERE id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Source not found',
      });
      return;
    }

    logger.info('Source fetched successfully', {
      userId: req.user!.id,
      sourceId: id,
    });

    res.json({
      status: 'success',
      source: result.rows[0],
    });
  } catch (error) {
    logger.error('Error fetching source', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user!.id,
      sourceId: req.params.id,
    });
    res.status(500).json({
      error: 'Failed to fetch source',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/sources
 * Create new source
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = CreateSourceSchema.parse(req.body);
    const { source } = data;
    const client = getRLSClient(req);

    const result = await client.query(
      `
      INSERT INTO sources (
        id, name, connector_type, user_id, config, status, field_mappings,
        auto_sync, sync_interval, metadata, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id, name, connector_type AS "connectorType", config, status,
        field_mappings AS "fieldMappings", auto_sync AS "autoSync",
        sync_interval AS "syncInterval", created_at AS "createdAt",
        updated_at AS "updatedAt", metadata, version
    `,
      [
        source.id,
        source.name,
        source.connectorType,
        req.user!.id, // user_id automatique via RLS
        JSON.stringify(source.config),
        source.status || 'configuring',
        JSON.stringify(source.fieldMappings || []),
        source.autoSync ?? false,
        source.syncInterval || 300000, // 5 min par défaut
        JSON.stringify(source.metadata || {}),
        req.user!.id, // created_by
      ]
    );

    logger.info('Source created successfully', {
      userId: req.user!.id,
      sourceId: result.rows[0].id,
      connectorType: source.connectorType,
    });

    res.status(201).json({
      status: 'success',
      source: result.rows[0],
    });
  } catch (error) {
    logger.error('Error creating source', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user!.id,
    });
    res.status(400).json({
      error: 'Failed to create source',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/sources/:id
 * Update source (optimistic locking via version field)
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateSourceSchema.parse(req.body);
    const { source, expectedVersion } = data;
    const client = getRLSClient(req);

    // Si expectedVersion fourni, utiliser resolve_source_conflict
    if (expectedVersion !== undefined) {
      const conflictResult = await client.query(
        `SELECT resolve_source_conflict($1, $2, $3) AS result`,
        [
          id,
          expectedVersion,
          JSON.stringify({
            name: source.name,
            config: source.config,
            status: source.status,
            field_mappings: source.fieldMappings,
            auto_sync: source.autoSync,
            sync_interval: source.syncInterval,
            metadata: source.metadata,
            updated_at: source.updatedAt,
          }),
        ]
      );

      const result = conflictResult.rows[0].result;

      // Conflit détecté
      if (result.conflict) {
        logger.warn('Optimistic locking conflict detected', {
          userId: req.user!.id,
          sourceId: id,
          expectedVersion,
          resolution: result.resolution,
        });

        // Fetch server data pour retourner au client
        const serverDataResult = await client.query(
          `SELECT * FROM sources WHERE id = $1`,
          [id]
        );

        res.status(409).json({
          error: 'Conflict detected',
          conflict: {
            detected: true,
            resolution: result.resolution,
            currentVersion: result.current_version,
            serverData: serverDataResult.rows[0],
          },
        });
        return;
      }

      // Pas de conflit → fetch updated source
      const updatedResult = await client.query(
        `SELECT * FROM sources WHERE id = $1`,
        [id]
      );

      logger.info('Source updated successfully (conflict resolved)', {
        userId: req.user!.id,
        sourceId: id,
        resolution: result.resolution,
      });

      res.json({
        status: 'success',
        source: updatedResult.rows[0],
      });
    } else {
      // Update simple sans optimistic locking
      const result = await client.query(
        `
        UPDATE sources
        SET
          name = $2,
          config = $3,
          status = $4,
          field_mappings = $5,
          auto_sync = $6,
          sync_interval = $7,
          metadata = $8,
          updated_at = NOW(),
          version = version + 1
        WHERE id = $1
        RETURNING
          id, name, connector_type AS "connectorType", config, status,
          field_mappings AS "fieldMappings", auto_sync AS "autoSync",
          sync_interval AS "syncInterval", created_at AS "createdAt",
          updated_at AS "updatedAt", metadata, version
      `,
        [
          id,
          source.name,
          JSON.stringify(source.config),
          source.status,
          JSON.stringify(source.fieldMappings || []),
          source.autoSync,
          source.syncInterval,
          JSON.stringify(source.metadata || {}),
        ]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          error: 'Source not found',
        });
        return;
      }

      logger.info('Source updated successfully', {
        userId: req.user!.id,
        sourceId: id,
      });

      res.json({
        status: 'success',
        source: result.rows[0],
      });
    }
  } catch (error) {
    logger.error('Error updating source', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user!.id,
      sourceId: req.params.id,
    });
    res.status(400).json({
      error: 'Failed to update source',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/sources/:id
 * Delete source (cascade sync_history via FK)
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = getRLSClient(req);

    const result = await client.query(`DELETE FROM sources WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
      res.status(404).json({
        error: 'Source not found',
      });
      return;
    }

    logger.info('Source deleted successfully', {
      userId: req.user!.id,
      sourceId: id,
    });

    res.json({
      status: 'success',
      message: 'Source deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting source', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user!.id,
      sourceId: req.params.id,
    });
    res.status(500).json({
      error: 'Failed to delete source',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/* ==================== Sync History ==================== */

/**
 * GET /api/sources/:id/history
 * Get sync history for source (ordered by startedAt DESC)
 */
router.get('/:id/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const client = getRLSClient(req);

    // Vérifier que la source appartient à l'utilisateur
    const sourceCheck = await client.query(`SELECT id FROM sources WHERE id = $1`, [id]);

    if (sourceCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Source not found',
      });
      return;
    }

    const result = await client.query(
      `
      SELECT
        id, source_id AS "sourceId", started_at AS "startedAt",
        finished_at AS "finishedAt", duration_ms AS "durationMs",
        status, items_added AS "itemsAdded", items_updated AS "itemsUpdated",
        items_deleted AS "itemsDeleted", items_skipped AS "itemsSkipped",
        total_items AS "totalItems", error_message AS "errorMessage",
        error_code AS "errorCode", conflicts_resolved AS "conflictsResolved",
        conflicts_manual AS "conflictsManual", triggered_by AS "triggeredBy",
        sync_type AS "syncType", metadata
      FROM sync_history
      WHERE source_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `,
      [id, limit]
    );

    logger.info('Sync history fetched successfully', {
      userId: req.user!.id,
      sourceId: id,
      count: result.rows.length,
    });

    res.json({
      status: 'success',
      history: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching sync history', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user!.id,
      sourceId: req.params.id,
    });
    res.status(500).json({
      error: 'Failed to fetch sync history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/sources/:id/history
 * Save new sync history entry
 */
router.post('/:id/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = SaveSyncHistorySchema.parse(req.body);
    const { entry } = data;
    const client = getRLSClient(req);

    // Vérifier que la source appartient à l'utilisateur
    const sourceCheck = await client.query(`SELECT id FROM sources WHERE id = $1`, [id]);

    if (sourceCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Source not found',
      });
      return;
    }

    await client.query(
      `
      INSERT INTO sync_history (
        id, source_id, started_at, finished_at, status,
        items_added, items_updated, items_deleted, items_skipped,
        total_items, error_message, triggered_by, sync_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `,
      [
        entry.id,
        id,
        entry.startedAt,
        entry.finishedAt,
        entry.status,
        entry.itemsAdded || 0,
        entry.itemsUpdated || 0,
        entry.itemsDeleted || 0,
        entry.itemsSkipped || 0,
        entry.itemsProcessed || 0,
        entry.error || null,
        'client',
        'manual',
      ]
    );

    logger.info('Sync history saved successfully', {
      userId: req.user!.id,
      sourceId: id,
      entryId: entry.id,
    });

    res.status(201).json({
      status: 'success',
      message: 'Sync history saved successfully',
    });
  } catch (error) {
    logger.error('Error saving sync history', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user!.id,
      sourceId: req.params.id,
    });
    res.status(400).json({
      error: 'Failed to save sync history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/* ==================== Offline Sync Queue ==================== */

/**
 * GET /api/sync-queue
 * Get pending queue items (user-scoped via RLS)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const client = getRLSClient(req);

    const result = await client.query(
      `
      SELECT
        id, operation, entity_type AS "entityType", entity_id AS "entityId",
        payload, status, retry_count AS "retryCount", max_retries AS "maxRetries",
        created_at AS "createdAt", processed_at AS "processedAt",
        next_retry_at AS "nextRetryAt", last_error AS "lastError"
      FROM sync_queue
      WHERE status = $1
      ORDER BY created_at ASC
    `,
      [status]
    );

    logger.info('Sync queue items fetched successfully', {
      userId: req.user!.id,
      status,
      count: result.rows.length,
    });

    res.json({
      status: 'success',
      items: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching sync queue', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user!.id,
    });
    res.status(500).json({
      error: 'Failed to fetch sync queue',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/sync-queue
 * Enqueue offline operation
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = EnqueueOperationSchema.parse(req.body);
    const { queueItem } = data;
    const client = getRLSClient(req);

    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const result = await client.query(
      `
      INSERT INTO sync_queue (
        id, operation, entity_type, entity_id, payload,
        max_retries, user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id, operation, entity_type AS "entityType", entity_id AS "entityId",
        payload, status, retry_count AS "retryCount", max_retries AS "maxRetries",
        created_at AS "createdAt"
    `,
      [
        queueId,
        queueItem.operation,
        queueItem.entityType,
        queueItem.entityId || null,
        JSON.stringify(queueItem.payload),
        queueItem.maxRetries,
        req.user!.id,
      ]
    );

    logger.info('Queue item created successfully', {
      userId: req.user!.id,
      queueId,
      operation: queueItem.operation,
    });

    res.status(201).json({
      status: 'success',
      queueItem: result.rows[0],
    });
  } catch (error) {
    logger.error('Error creating queue item', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user!.id,
    });
    res.status(400).json({
      error: 'Failed to create queue item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/sync-queue/:id/process
 * Process single queue item (calls process_sync_queue_item function)
 */
router.post('/:id/process', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = getRLSClient(req);

    // Appeler la fonction PostgreSQL process_sync_queue_item
    const result = await client.query(`SELECT process_sync_queue_item($1) AS result`, [id]);

    const processingResult = result.rows[0].result;

    if (!processingResult.success) {
      logger.error('Queue item processing failed', {
        userId: req.user!.id,
        queueId: id,
        error: processingResult.error,
      });

      res.status(400).json({
        status: 'error',
        error: processingResult.error,
        result: processingResult,
      });
      return;
    }

    logger.info('Queue item processed successfully', {
      userId: req.user!.id,
      queueId: id,
      operation: processingResult.operation,
    });

    res.json({
      status: 'success',
      result: processingResult,
    });
  } catch (error) {
    logger.error('Error processing queue item', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user!.id,
      queueId: req.params.id,
    });
    res.status(500).json({
      error: 'Failed to process queue item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
