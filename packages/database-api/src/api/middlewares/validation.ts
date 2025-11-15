/**
 * Middlewares - Validation des requêtes API
 *
 * Utilise Zod pour validation runtime des body/query/params
 * Retourne erreurs HTTP 400 si validation échoue
 *
 * @module api/middlewares/validation
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Middleware de validation Zod
 *
 * @param schema - Schema Zod à valider
 * @param target - Partie de la requête à valider ('body' | 'query' | 'params')
 * @returns Express middleware
 *
 * @example
 * router.post('/api/parse',
 *   validate(CartaeItemSchema, 'body'),
 *   parseController
 * );
 */
export function validate(schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Valide la partie ciblée de la requête
      const validated = schema.parse(req[target]);

      // Remplace par données validées (type-safe)
      req[target] = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      // Erreur inattendue
      return res.status(500).json({
        error: 'Internal validation error',
      });
    }
  };
}
