/**
 * Notification API Routes
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { NotificationService } from '../services/NotificationService.js';
import type { SendNotificationRequest, UpdatePreferencesRequest } from '../types/index.js';

const router: Router = Router();
const notificationService = new NotificationService();

/**
 * Validation schemas avec Zod
 */
const SendNotificationSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  template: z.string().min(1),
  data: z.record(z.any()),
  type: z.enum(['security', 'system_status', 'plugin_updates', 'quota_warnings']).optional(),
});

const UpdatePreferencesSchema = z.object({
  preferences: z.record(
    z.object({
      enabled: z.boolean(),
      frequency: z.enum(['instant', 'daily', 'weekly']),
    })
  ),
});

/**
 * POST /api/notifications/send
 * Envoyer une notification email
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    // Valider la requête
    const validated = SendNotificationSchema.parse(req.body);

    // Envoyer la notification
    const result = await notificationService.send(validated as SendNotificationRequest);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    } else {
      console.error('Error sending notification:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
});

/**
 * GET /api/users/:userId/notification-preferences
 * Récupérer les préférences de notification d'un utilisateur
 */
router.get('/users/:userId/notification-preferences', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const preferences = await notificationService.getPreferences(userId);

    res.status(200).json({
      userId,
      preferences,
    });
  } catch (error: any) {
    console.error('Error getting preferences:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * PATCH /api/users/:userId/notification-preferences
 * Mettre à jour les préférences de notification
 */
router.patch('/users/:userId/notification-preferences', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Valider la requête
    const validated = UpdatePreferencesSchema.parse(req.body);

    // Mettre à jour
    const updatedPreferences = await notificationService.updatePreferences(
      userId,
      validated.preferences
    );

    res.status(200).json({
      userId,
      preferences: updatedPreferences,
      message: 'Preferences updated successfully',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    } else {
      console.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
});

/**
 * POST /api/users/:userId/notification-preferences/reset
 * Réinitialiser aux valeurs par défaut
 */
router.post('/users/:userId/notification-preferences/reset', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const defaultPreferences = await notificationService.resetPreferences(userId);

    res.status(200).json({
      userId,
      preferences: defaultPreferences,
      message: 'Preferences reset to defaults',
    });
  } catch (error: any) {
    console.error('Error resetting preferences:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/admin/notification-preferences
 * Liste toutes les préférences (admin only)
 */
router.get('/admin/notification-preferences', async (req: Request, res: Response) => {
  try {
    // TODO: Vérifier authentification admin

    const allPreferences = await notificationService.listAllPreferences();

    res.status(200).json({
      total: allPreferences.length,
      preferences: allPreferences,
    });
  } catch (error: any) {
    console.error('Error listing preferences:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
