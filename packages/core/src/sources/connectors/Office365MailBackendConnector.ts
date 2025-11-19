/**
 * Office365MailBackendConnector - Connecteur Office365 Mail via Backend API
 *
 * Architecture unifiée Session 119 + Session 90:
 * - Implémente SourceConnector (Session 119)
 * - Appelle backend API PostgreSQL (Session 90)
 * - Récupère les emails synchronisés dans PostgreSQL
 */

import type { SourceConnector } from '../SourceManager';
import type { FieldMapping, TestConnectionResult, SyncOptions } from '../types';
import type { CartaeItem } from '../../types/CartaeItem';

/**
 * Configuration du connecteur Office365 Mail Backend
 */
export interface Office365MailBackendConfig {
  /** URL de l'API backend (ex: http://localhost:3001/api/office365) */
  apiUrl: string;

  /** Token Office365 (OAuth2) pour authentification */
  token: string;

  /** ID utilisateur (UUID) */
  userId: string;

  /** Nombre max d'emails à synchroniser (défaut: 50) */
  maxEmails?: number;

  /** Dossier à synchroniser (défaut: Inbox) */
  folder?: string;
}

/**
 * Connecteur Office365 Mail Backend
 *
 * Flow:
 * 1. testConnection() - Vérifie backend + token Office365
 * 2. sync() - POST /api/office365/sync ’ GET /api/office365/items
 * 3. Retourne CartaeItems depuis PostgreSQL
 */
export class Office365MailBackendConnector implements SourceConnector {
  readonly type = 'office365-mail-backend';

  /**
   * Valider la configuration
   */
  validateConfig(config: Record<string, any>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!config.apiUrl || typeof config.apiUrl !== 'string') {
      errors.push('apiUrl est requis (string)');
    }

    if (!config.token || typeof config.token !== 'string') {
      errors.push('token est requis (string)');
    }

    if (!config.userId || typeof config.userId !== 'string') {
      errors.push('userId est requis (string UUID)');
    }

    // Valider format UUID
    if (
      config.userId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.userId)
    ) {
      errors.push('userId doit être un UUID valide');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Tester la connexion (backend API + Office365)
   */
  async testConnection(config: Record<string, any>): Promise<TestConnectionResult> {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        message: 'Configuration invalide',
        errors: validation.errors,
      };
    }

    const cfg = config as Office365MailBackendConfig;

    try {
      // Test 1: Health check backend API
      const healthUrl = `${cfg.apiUrl.replace('/api/office365', '')}/health`;
      const healthResponse = await fetch(healthUrl);

      if (!healthResponse.ok) {
        return {
          success: false,
          message: `Backend API inaccessible: ${healthResponse.status}`,
          errors: [`Backend health check failed: ${healthResponse.statusText}`],
        };
      }

      // Test 2: Test sync 1 email pour vérifier token Office365
      const syncUrl = `${cfg.apiUrl}/sync`;
      const testSyncResponse = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Office365-Token': cfg.token,
        },
        body: JSON.stringify({
          userId: cfg.userId,
          maxEmails: 1,
          folder: cfg.folder || 'Inbox',
        }),
      });

      if (!testSyncResponse.ok) {
        const errorData = await testSyncResponse.json();
        return {
          success: false,
          message: `Office365 connexion échouée: ${errorData.error || testSyncResponse.statusText}`,
          errors: [`Office365 API error: ${errorData.error || 'Unknown error'}`],
        };
      }

      const testData = await testSyncResponse.json();

      return {
        success: true,
        message: `Connexion réussie! ${testData.itemsImported || 0} email(s) de test`,
        details: {
          endpoint: syncUrl,
          auth: 'ok',
          sampleData: {
            itemsImported: testData.itemsImported,
            itemsSkipped: testData.itemsSkipped,
            totalProcessed: testData.totalProcessed,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        errors: [error instanceof Error ? error.stack || error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Synchroniser les emails (appelle backend API)
   */
  async sync(
    config: Record<string, any>,
    fieldMappings: FieldMapping[],
    options?: SyncOptions
  ): Promise<{ items: CartaeItem[]; errors?: Array<{ itemId: string; error: string }> }> {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Configuration invalide: ${validation.errors?.join(', ')}`);
    }

    const cfg = config as Office365MailBackendConfig;

    try {
      // Étape 1: Synchroniser emails Office365 ’ PostgreSQL
      const syncUrl = `${cfg.apiUrl}/sync`;

      if (options?.onProgress) {
        options.onProgress({
          current: 0,
          total: cfg.maxEmails || 50,
          message: 'Synchronisation des emails Office365...',
        });
      }

      const syncResponse = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Office365-Token': cfg.token,
        },
        body: JSON.stringify({
          userId: cfg.userId,
          maxEmails: cfg.maxEmails || 50,
          folder: cfg.folder || 'Inbox',
        }),
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(`Sync failed: ${errorData.error || syncResponse.statusText}`);
      }

      const syncData = await syncResponse.json();

      if (options?.onProgress) {
        options.onProgress({
          current: syncData.itemsImported || 0,
          total: syncData.totalProcessed || 0,
          message: `Synchronisé ${syncData.itemsImported} emails`,
        });
      }

      // Étape 2: Récupérer les emails depuis PostgreSQL
      const itemsUrl = `${cfg.apiUrl}/items?userId=${cfg.userId}&limit=${cfg.maxEmails || 50}`;
      const itemsResponse = await fetch(itemsUrl);

      if (!itemsResponse.ok) {
        const errorData = await itemsResponse.json();
        throw new Error(`Items fetch failed: ${errorData.error || itemsResponse.statusText}`);
      }

      const itemsData = await itemsResponse.json();
      const items: CartaeItem[] = itemsData.items || [];

      // Note: Les items sont déjà transformés par le backend (emailToCartaeItem)
      // Les fieldMappings custom peuvent être appliqués ici si nécessaire

      return {
        items,
        errors: syncData.errors,
      };
    } catch (error) {
      throw new Error(
        `Office365 Mail sync error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
