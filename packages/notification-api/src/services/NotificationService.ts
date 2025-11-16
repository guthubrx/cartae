/**
 * Notification Service - Gère l'envoi de notifications avec vérification des préférences
 */

import { EmailService } from '@cartae/email-service';
import type {
  NotificationPreferences,
  SendNotificationRequest,
  SendNotificationResponse,
  NotificationType,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../types/index.js';

export class NotificationService {
  private emailService: InstanceType<typeof EmailService>;
  private preferencesStore: Map<string, NotificationPreferences['preferences']>;

  constructor() {
    // Initialiser email service depuis env
    this.emailService = EmailService.fromEnv();

    // Store in-memory pour les préférences (en prod: PostgreSQL)
    this.preferencesStore = new Map();
  }

  /**
   * Envoyer une notification (vérifie les préférences utilisateur)
   */
  async send(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    const { to, template, data, type } = request;

    // Si type spécifié, vérifier les préférences
    if (type) {
      const shouldSend = await this.shouldSendNotification(to, type);
      if (!shouldSend) {
        return {
          id: '',
          success: false,
          message: `Notification de type "${type}" désactivée pour cet utilisateur`,
        };
      }
    }

    // Envoyer via email service
    try {
      const emailTo = Array.isArray(to)
        ? to.map((email) => ({ email }))
        : { email: to };

      const result = await this.emailService.sendTemplate(template, emailTo, data);

      return {
        id: result.id,
        success: result.success,
        message: 'Notification envoyée avec succès',
      };
    } catch (error: any) {
      console.error('Erreur envoi notification:', error);
      return {
        id: '',
        success: false,
        message: error.message || 'Erreur lors de l\'envoi',
      };
    }
  }

  /**
   * Vérifier si notification doit être envoyée (selon préférences user)
   */
  private async shouldSendNotification(
    email: string | string[],
    type: NotificationType
  ): Promise<boolean> {
    // Pour l'instant: email = userId (simplification)
    const userId = Array.isArray(email) ? email[0] : email;

    const prefs = await this.getPreferences(userId);

    // Sécurité: toujours envoyée (non désactivable)
    if (type === 'security') {
      return true;
    }

    // Vérifier si activé
    return prefs[type]?.enabled ?? true;
  }

  /**
   * Récupérer préférences utilisateur
   */
  async getPreferences(userId: string): Promise<NotificationPreferences['preferences']> {
    // Vérifier le store
    let prefs = this.preferencesStore.get(userId);

    if (!prefs) {
      // Créer préférences par défaut
      const { DEFAULT_NOTIFICATION_PREFERENCES } = await import('../types/index.js');
      prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES };
      this.preferencesStore.set(userId, prefs);
    }

    return prefs;
  }

  /**
   * Mettre à jour préférences utilisateur
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences['preferences']>
  ): Promise<NotificationPreferences['preferences']> {
    const currentPrefs = await this.getPreferences(userId);

    // Merge updates (sauf security qui reste toujours enabled: true)
    const updatedPrefs = {
      ...currentPrefs,
      ...updates,
      security: {
        enabled: true, // Force toujours enabled
        frequency: updates.security?.frequency || currentPrefs.security.frequency,
      },
    };

    this.preferencesStore.set(userId, updatedPrefs);

    return updatedPrefs;
  }

  /**
   * Réinitialiser préférences aux valeurs par défaut
   */
  async resetPreferences(userId: string): Promise<NotificationPreferences['preferences']> {
    const { DEFAULT_NOTIFICATION_PREFERENCES } = await import('../types/index.js');
    const defaultPrefs = { ...DEFAULT_NOTIFICATION_PREFERENCES };
    this.preferencesStore.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  /**
   * Lister tous les utilisateurs avec leurs préférences (admin)
   */
  async listAllPreferences(): Promise<Array<{ userId: string; preferences: NotificationPreferences['preferences'] }>> {
    const all: Array<{ userId: string; preferences: NotificationPreferences['preferences'] }> = [];

    for (const [userId, preferences] of this.preferencesStore.entries()) {
      all.push({ userId, preferences });
    }

    return all;
  }
}
