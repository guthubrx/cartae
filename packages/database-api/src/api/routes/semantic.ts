/**
 * Route /api/semantic - Recherche vectorielle pgvector
 *
 * POST /api/semantic
 * Body: { embedding: number[], limit?: number, minSimilarity?: number }
 *
 * Recherche par similarité cosinus sur embeddings via index HNSW
 * Ultra-rapide sur 100k+ items (< 10ms)
 *
 * @module api/routes/semantic
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validation';
import { semanticSearch } from '../../db/queries/search';

export const semanticRouter = Router();

/**
 * Schema de validation pour body
 */
const SemanticSearchSchema = z.object({
  embedding: z.array(z.number()).length(1536), // OpenAI embeddings dimension
  limit: z.number().int().min(1).max(100).default(20),
  minSimilarity: z.number().min(0).max(1).default(0.7),
});

/**
 * POST /api/semantic
 *
 * Recherche vectorielle par similarité
 *
 * @example
 * POST /api/semantic
 * {
 *   "embedding": [0.1, 0.2, ...], // 1536 floats
 *   "limit": 10,
 *   "minSimilarity": 0.75
 * }
 */
semanticRouter.post('/', validate(SemanticSearchSchema, 'body'), async (req, res, next) => {
  try {
    const { embedding, limit, minSimilarity } = req.body;

    const results = await semanticSearch(embedding, limit, minSimilarity);

    return res.json({
      query: {
        embeddingDimension: embedding.length,
        limit,
        minSimilarity,
      },
      count: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/semantic/batch
 *
 * Recherche vectorielle pour multiples embeddings en parallèle
 * Optimisé pour performance (évite N requêtes HTTP)
 */
semanticRouter.post('/batch', async (req, res, next) => {
  try {
    const { embeddings, limit = 20, minSimilarity = 0.7 } = req.body;

    if (!Array.isArray(embeddings)) {
      return res.status(400).json({
        error: 'Body must contain "embeddings" array',
      });
    }

    // Valide chaque embedding
    embeddings.forEach((emb, index) => {
      if (!Array.isArray(emb) || emb.length !== 1536) {
        throw new Error(`Invalid embedding at index ${index}: must be array of 1536 numbers`);
      }
    });

    // Execute searches en parallèle
    const results = await Promise.all(
      embeddings.map((emb: number[]) => semanticSearch(emb, limit, minSimilarity))
    );

    return res.json({
      count: embeddings.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});
