/**
 * Routes API pour les résumés IA
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../db/client';
import { z } from 'zod';

const router = Router();

/**
 * Schema Zod pour créer un résumé
 */
const CreateSummarySchema = z.object({
  itemId: z.string().uuid(),
  summaryType: z.enum(['extractive', 'abstractive', 'thread', 'bullet_points']),
  summaryText: z.string().min(1),
  summaryLength: z.enum(['short', 'medium', 'long']).optional(),
  keyPoints: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
  actionItems: z.array(z.string()).optional(),
  modelUsed: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  generationMethod: z.string().optional(),
  threadId: z.string().optional(),
  threadItemCount: z.number().int().positive().optional(),
});

/**
 * POST /api/summaries
 * Créer un résumé IA pour un item
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateSummarySchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO summaries (
        item_id, summary_type, summary_text, summary_length,
        key_points, topics, action_items,
        model_used, confidence, generation_method,
        thread_id, thread_item_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (item_id, summary_type) DO UPDATE SET
        summary_text = EXCLUDED.summary_text,
        key_points = EXCLUDED.key_points,
        topics = EXCLUDED.topics,
        action_items = EXCLUDED.action_items,
        updated_at = NOW()
      RETURNING *`,
      [
        data.itemId,
        data.summaryType,
        data.summaryText,
        data.summaryLength || null,
        data.keyPoints ? JSON.stringify(data.keyPoints) : null,
        data.topics ? JSON.stringify(data.topics) : null,
        data.actionItems ? JSON.stringify(data.actionItems) : null,
        data.modelUsed || null,
        data.confidence || null,
        data.generationMethod || null,
        data.threadId || null,
        data.threadItemCount || null,
      ]
    );

    res.status(201).json({
      status: 'created',
      summary: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating summary:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create summary',
    });
  }
});

/**
 * GET /api/summaries/item/:itemId
 * Récupérer tous les résumés d'un item
 */
router.get('/item/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;

    const result = await pool.query(`SELECT * FROM get_item_summaries($1)`, [itemId]);

    res.json({
      itemId,
      summaries: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch summaries',
    });
  }
});

/**
 * GET /api/summaries/thread/:threadId
 * Récupérer le résumé d'un thread complet
 */
router.get('/thread/:threadId', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;

    const result = await pool.query(`SELECT * FROM get_thread_summary($1)`, [threadId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Thread summary not found',
      });
      return;
    }

    res.json({
      threadId,
      summary: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching thread summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch thread summary',
    });
  }
});

/**
 * DELETE /api/summaries/:summaryId
 * Supprimer un résumé
 */
router.delete('/:summaryId', async (req: Request, res: Response) => {
  try {
    const { summaryId } = req.params;

    const result = await pool.query(`DELETE FROM summaries WHERE id = $1 RETURNING *`, [summaryId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Summary not found',
      });
      return;
    }

    res.json({
      status: 'deleted',
      summary: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete summary',
    });
  }
});

/**
 * GET /api/summaries/stats
 * Statistiques globales des résumés
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM get_summaries_stats()`);

    res.json({
      stats: result.rows[0] || {},
    });
  } catch (error) {
    console.error('Error fetching summaries stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch summaries stats',
    });
  }
});

export default router;
