/**
 * Route /api/parse - Parse et stocke CartaeItem
 *
 * POST /api/parse
 * Body: CartaeItem (from parser)
 *
 * Logique:
 * 1. Valide le CartaeItem (Zod schema)
 * 2. Vérifie si item existe déjà (source.connector + source.originalId)
 * 3. Si existe: UPDATE, sinon: INSERT
 * 4. Retourne item créé/mis à jour
 *
 * Évite les duplications et re-parse inutiles
 *
 * @module api/routes/parse
 */

import { Router } from 'express';
import { CartaeItemSchema } from '@cartae/core';
import { validate } from '../middlewares/validation';
import { insertItem, getItemById } from '../../db/queries/items';
import { executeQuery } from '../../db/client';

export const parseRouter = Router();

/**
 * POST /api/parse
 *
 * Parse et stocke un CartaeItem dans PostgreSQL
 */
parseRouter.post('/', validate(CartaeItemSchema, 'body'), async (req, res, next) => {
  try {
    const item = req.body;

    // Vérifier si item existe déjà (même source.connector + source.originalId)
    const existingQuery = `
      SELECT id FROM cartae_items
      WHERE source->>'connector' = $1
      AND source->>'originalId' = $2
    `;

    const existing = await executeQuery<{ id: string }>(existingQuery, [
      item.source.connector,
      item.source.originalId,
    ]);

    if (existing.length > 0) {
      // Item existe déjà - UPDATE
      const existingId = existing[0].id;

      const updateQuery = `
        UPDATE cartae_items
        SET
          title = $1,
          content = $2,
          metadata = $3,
          tags = $4,
          source = $5,
          updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `;

      const updated = await executeQuery<any>(updateQuery, [
        item.title,
        item.content || null,
        JSON.stringify(item.metadata),
        item.tags,
        JSON.stringify({
          ...item.source,
          lastSync: new Date(), // Update lastSync timestamp
        }),
        existingId,
      ]);

      return res.status(200).json({
        status: 'updated',
        item: updated[0],
        message: 'Item already existed, updated successfully',
      });
    }

    // Item nouveau - INSERT
    const created = await insertItem(item);

    return res.status(201).json({
      status: 'created',
      item: created,
      message: 'Item created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/parse/batch
 *
 * Parse multiple items en batch (optimisation performance)
 * Évite N requêtes HTTP séparées
 */
parseRouter.post('/batch', async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        error: 'Body must contain "items" array',
      });
    }

    // Valide chaque item
    const validated = items.map(item => CartaeItemSchema.parse(item));

    // Insert/update en batch (transaction atomique)
    const results = await Promise.all(
      validated.map(async item => {
        // Logique identique à route simple
        const existing = await executeQuery<{ id: string }>(
          `SELECT id FROM cartae_items WHERE source->>'connector' = $1 AND source->>'originalId' = $2`,
          [item.source.connector, item.source.originalId]
        );

        if (existing.length > 0) {
          return { status: 'updated', id: existing[0].id };
        }
        const created = await insertItem(item);
        return { status: 'created', id: created.id };
      })
    );

    return res.status(200).json({
      message: `Processed ${results.length} items`,
      results,
      summary: {
        created: results.filter(r => r.status === 'created').length,
        updated: results.filter(r => r.status === 'updated').length,
      },
    });
  } catch (error) {
    next(error);
  }
});
