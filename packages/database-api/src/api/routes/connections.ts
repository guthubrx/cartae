/**
 * Routes API pour les connexions sémantiques IA
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../db/client';
import { z } from 'zod';

const router = Router();

/**
 * Schema Zod pour créer une connexion
 */
const CreateConnectionSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  overallScore: z.number().min(0).max(1),
  vectorSimilarity: z.number().min(0).max(1).optional(),
  temporalSimilarity: z.number().min(0).max(1).optional(),
  sentimentAlignment: z.number().min(0).max(1).optional(),
  priorityAlignment: z.number().min(0).max(1).optional(),
  sharedParticipants: z.number().min(0).max(1).optional(),
  sharedTags: z.number().min(0).max(1).optional(),
  reason: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  bidirectional: z.boolean().optional(),
});

/**
 * POST /api/connections
 * Créer une connexion sémantique entre deux items
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateConnectionSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO connections (
        source_id, target_id, overall_score,
        vector_similarity, temporal_similarity, sentiment_alignment,
        priority_alignment, shared_participants, shared_tags,
        reason, confidence, bidirectional
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (source_id, target_id) DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        updated_at = NOW()
      RETURNING *`,
      [
        data.sourceId,
        data.targetId,
        data.overallScore,
        data.vectorSimilarity || null,
        data.temporalSimilarity || null,
        data.sentimentAlignment || null,
        data.priorityAlignment || null,
        data.sharedParticipants || null,
        data.sharedTags || null,
        data.reason || null,
        data.confidence || null,
        data.bidirectional ?? true,
      ]
    );

    res.status(201).json({
      status: 'created',
      connection: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create connection',
    });
  }
});

/**
 * GET /api/connections/:itemId
 * Récupérer toutes les connexions d'un item (bidirectionnelles)
 */
router.get('/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const minScore = parseFloat(req.query.minScore as string) || 0.0;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const result = await pool.query(`SELECT * FROM get_item_connections($1, $2, $3)`, [
      itemId,
      minScore,
      limit,
    ]);

    res.json({
      itemId,
      connections: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch connections',
    });
  }
});

/**
 * GET /api/connections/graph/:itemId
 * Récupérer le graphe de connexions (pour visualisation)
 */
router.get('/graph/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const depth = parseInt(req.query.depth as string, 10) || 1;
    const minScore = parseFloat(req.query.minScore as string) || 0.6;

    const result = await pool.query(`SELECT * FROM get_connections_graph($1, $2, $3)`, [
      itemId,
      depth,
      minScore,
    ]);

    // Formater pour viz (nodes + edges)
    const edges = result.rows.map(row => ({
      source: row.source_id,
      target: row.target_id,
      score: row.overall_score,
      reason: row.reason,
      level: row.level,
    }));

    // Extraire nodes uniques
    const nodeIds = new Set<string>();
    edges.forEach(edge => {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    });

    res.json({
      centerItemId: itemId,
      nodes: Array.from(nodeIds).map(id => ({ id })),
      edges,
      depth,
      minScore,
    });
  } catch (error) {
    console.error('Error fetching connections graph:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch connections graph',
    });
  }
});

/**
 * DELETE /api/connections/:connectionId
 * Supprimer une connexion
 */
router.delete('/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;

    const result = await pool.query(`DELETE FROM connections WHERE id = $1 RETURNING *`, [
      connectionId,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Connection not found',
      });
      return;
    }

    res.json({
      status: 'deleted',
      connection: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete connection',
    });
  }
});

/**
 * GET /api/connections/stats
 * Statistiques globales des connexions
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM get_connections_stats()`);

    res.json({
      stats: result.rows[0] || {},
    });
  } catch (error) {
    console.error('Error fetching connections stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch connections stats',
    });
  }
});

export default router;
