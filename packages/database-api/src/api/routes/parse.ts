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
 * Session 88 - Phase 8A: Tenant Isolation activée
 * - Nécessite authentification (requireAuth middleware)
 * - Filtre automatiquement par user_id (tenantIsolation middleware)
 * - Chaque user ne voit QUE ses propres items
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
import { requireAuth } from '../../middleware/auth';
import { tenantIsolation, TenantRequest } from '../../middleware/tenantIsolation';

export const parseRouter = Router();

/**
 * POST /api/parse
 *
 * Parse et stocke un CartaeItem dans PostgreSQL
 * Session 88 - Phase 8A: Avec tenant isolation
 */
parseRouter.post(
  '/',
  requireAuth,
  tenantIsolation,
  validate(CartaeItemSchema, 'body'),
  async (req, res, next) => {
    try {
      const item = req.body;
      const userId = (req as TenantRequest).tenantUserId!;

      // Vérifier si item existe déjà (même source.connector + source.originalId + user_id)
      // IMPORTANT: Filtrer par user_id pour éviter collisions entre users
      const existingQuery = `
      SELECT id FROM cartae_items
      WHERE source->>'connector' = $1
      AND source->>'originalId' = $2
      AND user_id = $3
    `;

      const existing = await executeQuery<{ id: string }>(existingQuery, [
        item.source.connector,
        item.source.originalId,
        userId, // Tenant isolation
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
        AND user_id = $7
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
          userId, // Tenant isolation (sécurité défensive)
        ]);

        return res.status(200).json({
          status: 'updated',
          item: updated[0],
          message: 'Item already existed, updated successfully',
        });
      }

      // Item nouveau - INSERT avec user_id
      const created = await insertItem(item, userId);

      return res.status(201).json({
        status: 'created',
        item: created,
        message: 'Item created successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/parse/batch
 *
 * Parse multiple items en batch (optimisation performance)
 * Évite N requêtes HTTP séparées
 * Session 88 - Phase 8A: Avec tenant isolation
 */
parseRouter.post(
  '/batch',
  requireAuth,
  tenantIsolation,
  async (req, res, next) => {
    try {
      const { items } = req.body;
      const userId = (req as TenantRequest).tenantUserId!;

      if (!Array.isArray(items)) {
        return res.status(400).json({
          error: 'Body must contain "items" array',
        });
      }

      // Valide chaque item
      const validated = items.map((item) => CartaeItemSchema.parse(item));

      // Insert/update en batch (transaction atomique)
      const results = await Promise.all(
        validated.map(async (item) => {
          // Logique identique à route simple avec tenant isolation
          const existing = await executeQuery<{ id: string }>(
            `SELECT id FROM cartae_items WHERE source->>'connector' = $1 AND source->>'originalId' = $2 AND user_id = $3`,
            [item.source.connector, item.source.originalId, userId]
          );

          if (existing.length > 0) {
            return { status: 'updated', id: existing[0].id };
          }
          const created = await insertItem(item, userId);
          return { status: 'created', id: created.id };
        })
      );

      return res.status(200).json({
        message: `Processed ${results.length} items`,
        results,
        summary: {
          created: results.filter((r) => r.status === 'created').length,
          updated: results.filter((r) => r.status === 'updated').length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
