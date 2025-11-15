/**
 * Routes API Vault - Secrets management
 * Session 78 - Phase 5
 *
 * Endpoints:
 * - POST   /api/vault/secrets        - Store secret
 * - GET    /api/vault/secrets/:path  - Retrieve secret
 * - DELETE /api/vault/secrets/:path  - Delete secret
 * - GET    /api/vault/secrets        - List secrets (query: ?path=database/)
 * - GET    /api/vault/health         - Vault health check
 *
 * @module api/routes/vault
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getVaultClient } from '../../vault/VaultClient';

const router = Router();

/**
 * Validation schema pour store secret
 */
const storeSecretSchema = z.object({
  path: z.string().min(1, 'Path cannot be empty'),
  data: z.record(z.any()).refine((data) => Object.keys(data).length > 0, {
    message: 'Data cannot be empty',
  }),
});

/**
 * Validation schema pour list secrets
 */
const listSecretsSchema = z.object({
  path: z.string().optional().default(''),
});

/**
 * POST /api/vault/secrets - Store un secret dans Vault
 *
 * Body:
 * {
 *   "path": "database/postgres",
 *   "data": {
 *     "username": "cartae",
 *     "password": "secure-password-123",
 *     "host": "localhost",
 *     "port": 5432,
 *     "database": "cartae"
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Secret stored successfully",
 *   "path": "database/postgres",
 *   "version": 1
 * }
 */
router.post('/secrets', async (req: Request, res: Response) => {
  try {
    // Valider input
    const { path, data } = storeSecretSchema.parse(req.body);

    // Récupérer Vault client
    const vaultClient = getVaultClient();

    // Vérifier que Vault est ready
    await vaultClient.ensureVaultReady();

    // Store secret
    const version = await vaultClient.writeSecret(path, data);

    res.status(201).json({
      success: true,
      message: 'Secret stored successfully',
      path,
      version,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to store secret',
    });
  }
});

/**
 * GET /api/vault/secrets/:path - Retrieve un secret depuis Vault
 *
 * Params:
 * - path: Chemin du secret (ex: database/postgres)
 *
 * Query:
 * - version: Version spécifique (optionnel, par défaut: dernière version)
 *
 * Response:
 * {
 *   "success": true,
 *   "path": "database/postgres",
 *   "data": {
 *     "username": "cartae",
 *     "password": "secure-password-123",
 *     "host": "localhost",
 *     "port": 5432,
 *     "database": "cartae"
 *   }
 * }
 */
router.get('/secrets/:path(*)', async (req: Request, res: Response) => {
  try {
    const { path } = req.params;
    const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;

    if (!path) {
      res.status(400).json({
        success: false,
        message: 'Path parameter is required',
      });
      return;
    }

    // Récupérer Vault client
    const vaultClient = getVaultClient();

    // Vérifier que Vault est ready
    await vaultClient.ensureVaultReady();

    // Read secret
    const data = await vaultClient.readSecret(path, version);

    res.json({
      success: true,
      path,
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to read secret',
    });
  }
});

/**
 * DELETE /api/vault/secrets/:path - Delete un secret de Vault
 *
 * Params:
 * - path: Chemin du secret (ex: database/postgres)
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Secret deleted successfully",
 *   "path": "database/postgres"
 * }
 */
router.delete('/secrets/:path(*)', async (req: Request, res: Response) => {
  try {
    const { path } = req.params;

    if (!path) {
      res.status(400).json({
        success: false,
        message: 'Path parameter is required',
      });
      return;
    }

    // Récupérer Vault client
    const vaultClient = getVaultClient();

    // Vérifier que Vault est ready
    await vaultClient.ensureVaultReady();

    // Delete secret
    await vaultClient.deleteSecret(path);

    res.json({
      success: true,
      message: 'Secret deleted successfully',
      path,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete secret',
    });
  }
});

/**
 * GET /api/vault/secrets - List secrets dans un path
 *
 * Query:
 * - path: Chemin du dossier (ex: database/, par défaut: root)
 *
 * Response:
 * {
 *   "success": true,
 *   "path": "database/",
 *   "keys": ["postgres", "mongodb", "redis"]
 * }
 */
router.get('/secrets', async (req: Request, res: Response) => {
  try {
    const { path } = listSecretsSchema.parse(req.query);

    // Récupérer Vault client
    const vaultClient = getVaultClient();

    // Vérifier que Vault est ready
    await vaultClient.ensureVaultReady();

    // List secrets
    const keys = await vaultClient.listSecrets(path);

    res.json({
      success: true,
      path: path || '(root)',
      keys,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to list secrets',
    });
  }
});

/**
 * GET /api/vault/health - Vault health check
 *
 * Response:
 * {
 *   "success": true,
 *   "vault": {
 *     "initialized": true,
 *     "sealed": false,
 *     "standby": false,
 *     "version": "1.15.0",
 *     "cluster_id": "xxx-yyy-zzz"
 *   }
 * }
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Récupérer Vault client
    const vaultClient = getVaultClient();

    // Health check
    const health = await vaultClient.health();

    res.json({
      success: true,
      vault: health,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: error instanceof Error ? error.message : 'Vault health check failed',
    });
  }
});

export { router as vaultRouter };
