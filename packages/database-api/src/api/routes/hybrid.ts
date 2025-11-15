/**
 * Route /api/hybrid - Recherche hybride (full-text + vectorielle)
 *
 * POST /api/hybrid
 * Body: {
 *   text: string,
 *   embedding: number[],
 *   textWeight?: number,
 *   vectorWeight?: number,
 *   limit?: number
 * }
 *
 * Combine recherche textuelle et sémantique avec pondération ajustable
 * Meilleure précision que recherche simple seule
 *
 * @module api/routes/hybrid
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validation';
import { hybridSearch } from '../../db/queries/search';

export const hybridRouter = Router();

/**
 * Schema de validation pour body
 */
const HybridSearchSchema = z.object({
  text: z.string().min(1).max(500),
  embedding: z.array(z.number()).length(1536),
  textWeight: z.number().min(0).max(1).default(0.5),
  vectorWeight: z.number().min(0).max(1).default(0.5),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * POST /api/hybrid
 *
 * Recherche hybride combinant full-text et vectoriel
 *
 * @example
 * POST /api/hybrid
 * {
 *   "text": "urgent task deadline",
 *   "embedding": [0.1, 0.2, ...],
 *   "textWeight": 0.3,    // 30% textuel
 *   "vectorWeight": 0.7,  // 70% sémantique
 *   "limit": 20
 * }
 */
hybridRouter.post('/', validate(HybridSearchSchema, 'body'), async (req, res, next) => {
  try {
    const { text, embedding, textWeight, vectorWeight, limit } = req.body;

    // Validation poids (doivent sommer à 1.0 ou proche)
    const weightSum = textWeight + vectorWeight;
    if (Math.abs(weightSum - 1.0) > 0.01) {
      return res.status(400).json({
        error: 'textWeight + vectorWeight must sum to 1.0',
        provided: { textWeight, vectorWeight, sum: weightSum },
      });
    }

    const results = await hybridSearch(text, embedding, textWeight, vectorWeight, limit);

    return res.json({
      query: {
        text,
        embeddingDimension: embedding.length,
        weights: { text: textWeight, vector: vectorWeight },
        limit,
      },
      count: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/hybrid/auto
 *
 * Recherche hybride avec poids auto-ajustés selon la query
 *
 * Heuristique:
 * - Query courte (< 10 mots) → Privilégie vectoriel (sémantique)
 * - Query longue (> 10 mots) → Privilégie textuel (keywords)
 */
hybridRouter.post('/auto', async (req, res, next) => {
  try {
    const { text, embedding, limit = 20 } = req.body;

    if (!text || !embedding) {
      return res.status(400).json({
        error: 'Missing required fields: text, embedding',
      });
    }

    // Auto-adjust weights basé sur longueur query
    const wordCount = text.split(/\s+/).length;

    let textWeight: number;
    let vectorWeight: number;

    if (wordCount <= 5) {
      // Query courte → Sémantique plus important
      textWeight = 0.3;
      vectorWeight = 0.7;
    } else if (wordCount <= 15) {
      // Query moyenne → Balance équilibrée
      textWeight = 0.5;
      vectorWeight = 0.5;
    } else {
      // Query longue → Keywords plus importants
      textWeight = 0.7;
      vectorWeight = 0.3;
    }

    const results = await hybridSearch(text, embedding, textWeight, vectorWeight, limit);

    return res.json({
      query: {
        text,
        wordCount,
        weights: {
          text: textWeight,
          vector: vectorWeight,
          strategy: wordCount <= 5 ? 'semantic' : wordCount <= 15 ? 'balanced' : 'textual',
        },
        limit,
      },
      count: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});
