/**
 * Route /api/search - Recherche full-text PostgreSQL
 *
 * GET /api/search?q=query&limit=20
 *
 * Recherche textuelle dans title + content via index GIN
 * Algorithme: PostgreSQL ts_rank (TF/IDF)
 *
 * @module api/routes/search
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validation';
import { fullTextSearch, searchByTags } from '../../db/queries/search';
import { executeQuery } from '../../db/client';
import { countItems } from '../../db/queries/items';

export const searchRouter = Router();

/**
 * Schema de validation pour query params
 */
const SearchQuerySchema = z.object({
  q: z.string().min(1).max(500).optional(),
  tags: z.string().optional(), // Comma-separated tags
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/search?q=query&limit=20
 *
 * Recherche full-text dans title et content
 */
searchRouter.get('/', validate(SearchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q, tags, limit } = req.query as z.infer<typeof SearchQuerySchema>;

    // Recherche par tags si fournis
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      const results = await searchByTags(tagArray, false, limit);

      return res.json({
        query: { tags: tagArray },
        count: results.length,
        results,
      });
    }

    // Recherche full-text si query fournie
    if (q) {
      const results = await fullTextSearch(q, limit);

      return res.json({
        query: { text: q },
        count: results.length,
        results,
      });
    }

    // Aucun filtre fourni
    return res.status(400).json({
      error: 'Missing query parameter: "q" or "tags" required',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/search/stats
 *
 * Statistiques sur la DB (nombre d'items, types, etc.)
 */
searchRouter.get('/stats', async (req, res, next) => {
  try {
    const total = await countItems();

    // Stats par type
    const byType = await executeQuery<{ type: string; count: string }>(
      'SELECT type, COUNT(*) as count FROM cartae_items GROUP BY type ORDER BY count DESC'
    );

    // Stats embeddings
    const withEmbeddings = await executeQuery<{ count: string }>(
      'SELECT COUNT(*) as count FROM cartae_items WHERE embedding IS NOT NULL'
    );

    return res.json({
      total,
      byType: byType.map(r => ({ type: r.type, count: parseInt(r.count, 10) })),
      withEmbeddings: parseInt(withEmbeddings[0].count, 10),
      withoutEmbeddings: total - parseInt(withEmbeddings[0].count, 10),
    });
  } catch (error) {
    next(error);
  }
});
