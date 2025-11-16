/**
 * Tenant Isolation Middleware
 * Session 88 - Phase 8A
 *
 * Filtre automatiquement les requêtes DB par user_id (isolation des données).
 * Chaque utilisateur ne voit QUE ses propres données.
 *
 * Usage:
 *   router.get('/items', requireAuth, tenantIsolation, async (req, res) => {
 *     // req.tenantUserId contient l'ID user pour filtrage
 *     // Toutes les queries DOIVENT inclure: WHERE user_id = $1
 *   })
 *
 * @module middleware/tenantIsolation
 */

import { Response, NextFunction } from 'express';
import { pool } from '../db/client';
import { AuthenticatedRequest } from './auth';

/**
 * Type extension pour Express Request (ajoute tenantUserId)
 */
export interface TenantRequest extends AuthenticatedRequest {
  /** ID de l'utilisateur authentifié (pour filtrage tenant) */
  tenantUserId?: string;
}

/**
 * Middleware tenant isolation
 * Extrait user_id depuis req.user (mis par requireAuth) et configure le contexte DB
 *
 * Ordre des middlewares REQUIS:
 * 1. requireAuth (extrait JWT, met req.user)
 * 2. tenantIsolation (extrait req.user.userId, configure DB context)
 * 3. Route handler (utilise req.tenantUserId pour filtrage)
 *
 * Utilise Row-Level Security (RLS) de PostgreSQL:
 * - Appelle set_current_user_id(userId) pour configurer session variable
 * - RLS policies utilisent current_setting('app.current_user_id') pour filtrage automatique
 *
 * @example
 * // Route avec tenant isolation
 * router.get('/items', requireAuth, tenantIsolation, async (req, res) => {
 *   const userId = (req as TenantRequest).tenantUserId!;
 *
 *   // Filtrage explicite (défensive, RLS fait déjà le job)
 *   const result = await pool.query(
 *     'SELECT * FROM cartae_items WHERE user_id = $1',
 *     [userId]
 *   );
 *
 *   res.json(result.rows);
 * });
 */
export async function tenantIsolation(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Vérifier que requireAuth a bien été appelé avant
    if (!req.user || !req.user.id) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required before tenant isolation',
      });
      return;
    }

    const userId = req.user.id;

    // Stocker userId dans req pour accès facile dans les routes
    (req as TenantRequest).tenantUserId = userId;

    // Configurer PostgreSQL session variable pour Row-Level Security
    // Cette variable sera utilisée par les RLS policies pour filtrage automatique
    await pool.query('SELECT set_current_user_id($1)', [userId]);

    // Log (dev only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 Tenant isolation activated for user ${userId}`);
    }

    next();
  } catch (error) {
    console.error('Tenant isolation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to configure tenant isolation',
    });
  }
}

/**
 * Middleware optionnel tenant isolation
 * Comme tenantIsolation mais ne bloque PAS si pas authentifié
 *
 * Cas d'usage:
 * - Routes publiques qui montrent des données différentes si connecté
 * - Search public + résultats user si JWT présent
 *
 * @example
 * router.get('/search', optionalAuth, optionalTenantIsolation, async (req, res) => {
 *   const userId = (req as TenantRequest).tenantUserId;
 *
 *   if (userId) {
 *     // User connecté: chercher dans SES items
 *     const result = await pool.query(
 *       'SELECT * FROM cartae_items WHERE user_id = $1 AND title ILIKE $2',
 *       [userId, `%${query}%`]
 *     );
 *   } else {
 *     // User non connecté: chercher items publics uniquement
 *     const result = await pool.query(
 *       'SELECT * FROM cartae_items WHERE is_public = TRUE AND title ILIKE $1',
 *       [`%${query}%`]
 *     );
 *   }
 * });
 */
export async function optionalTenantIsolation(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Si user authentifié, configurer tenant isolation
    if (req.user && req.user.id) {
      const userId = req.user.id;
      (req as TenantRequest).tenantUserId = userId;

      // Configurer PostgreSQL session variable
      await pool.query('SELECT set_current_user_id($1)', [userId]);

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔒 Optional tenant isolation activated for user ${userId}`);
      }
    } else {
      // Pas de user, pas d'isolation (OK pour routes publiques)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔓 No tenant isolation (anonymous request)');
      }
    }

    next();
  } catch (error) {
    console.error('Optional tenant isolation error:', error);
    // Ne PAS bloquer la requête si erreur
    next();
  }
}
