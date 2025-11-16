/**
 * Notification API Types
 */

export type NotificationType =
  | 'security'          // Alertes sécurité (jamais désactivable)
  | 'system_status'     // Vault, PostgreSQL down
  | 'plugin_updates'    // Mises à jour plugins
  | 'quota_warnings';   // Quotas plugins

export type NotificationFrequency = 'instant' | 'daily' | 'weekly';

export interface NotificationPreferences {
  userId: string;
  preferences: {
    [K in NotificationType]: {
      enabled: boolean;
      frequency: NotificationFrequency;
    };
  };
}

export interface SendNotificationRequest {
  to: string | string[];  // Email address(es)
  template: string;       // Template name (welcome, password-reset, etc.)
  data: Record<string, any>; // Template data
  type?: NotificationType;   // Optional: pour vérifier les préférences
}

export interface SendNotificationResponse {
  id: string;
  success: boolean;
  message?: string;
}

export interface GetPreferencesResponse {
  userId: string;
  preferences: NotificationPreferences['preferences'];
}

export interface UpdatePreferencesRequest {
  preferences: Partial<NotificationPreferences['preferences']>;
}

/**
 * Préférences par défaut (quand user créé)
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences['preferences'] = {
  security: {
    enabled: true,  // Toujours activé, non désactivable
    frequency: 'instant',
  },
  system_status: {
    enabled: true,
    frequency: 'instant',
  },
  plugin_updates: {
    enabled: true,
    frequency: 'weekly',
  },
  quota_warnings: {
    enabled: true,
    frequency: 'instant',
  },
};
