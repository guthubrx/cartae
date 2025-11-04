/**
 * Office365 Outlook Data Plugin
 * 
 * Plugin Data pour récupérer les emails Outlook via OWA REST API
 * S'appuie sur office365-connector-core pour l'authentification
 */

import type { CartaeItem } from '@cartae/core';
import type {
  DataPluginInterface,
  DataSearchOptions,
  SyncResult,
  ConnectionState,
  IPluginContext,
} from '@cartae/office365-plugin/src/types/DataPluginInterface';
import type { IOffice365AuthService } from '@cartae/office365-connector-core';
import { OwaRestEmailService } from '../services/OwaRestEmailService';
import { transformEmailsToCartaeItems } from '../transformers/EmailTransformer';

export class Office365OutlookPlugin implements DataPluginInterface {
  public readonly manifest = {
    id: 'office365-outlook',
    name: 'Office 365 Outlook',
    version: '1.0.0',
    description: 'Connect and sync with Outlook emails',
    author: 'Cartae Team',
    permissions: [
      'network.https://outlook.office.com',
      'storage.local',
    ],
    apiVersion: '1.0.0',
    engines: {
      cartae: '^1.0.0',
    },
  };

  public connectionState: ConnectionState = 'disconnected';

  private authService: IOffice365AuthService | null = null;
  private emailService: OwaRestEmailService | null = null;
  private context: IPluginContext | null = null;
  private syncInterval: number | null = null;

  /**
   * Injecte le service d'authentification depuis le plugin de connexion
   */
  setAuthService(authService: IOffice365AuthService): void {
    this.authService = authService;
    this.emailService = new OwaRestEmailService(authService);
  }

  /**
   * Activation du plugin
   */
  async activate(context: IPluginContext): Promise<void> {
    this.context = context;
    console.log('[Office365OutlookPlugin] Activation...');

    if (!this.authService) {
      throw new Error(
        '[Office365OutlookPlugin] AuthService non fourni. ' +
        'Utilisez setAuthService() ou activez office365-connector d\'abord.'
      );
    }

    await this.authService.startMonitoring();
    console.log('[Office365OutlookPlugin] Services initialisés');
  }

  /**
   * Désactivation du plugin
   */
  async deactivate(): Promise<void> {
    console.log('[Office365OutlookPlugin] Désactivation...');

    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.authService) {
      this.authService.stopMonitoring();
    }

    this.emailService = null;
    this.context = null;
    this.connectionState = 'disconnected';
  }

  /**
   * Connexion au service Outlook
   */
  async connect(): Promise<boolean> {
    if (this.connectionState === 'connected') {
      return true;
    }

    if (!this.authService) {
      throw new Error(
        '[Office365OutlookPlugin] AuthService non fourni. ' +
        'Appelez setAuthService() ou activez office365-connector d\'abord.'
      );
    }

    this.connectionState = 'checking';

    try {
      // Vérifier que l'extension Firefox est chargée
      const hasExtension = typeof (window as any).cartaeBrowserStorage !== 'undefined';

      if (!hasExtension) {
        throw new Error('Extension Firefox non détectée. Chargez l\'extension pour capturer les tokens.');
      }

      // Attendre que le token OWA soit disponible (max 30s)
      const maxWait = 30000;
      const startTime = Date.now();
      let hasToken = false;

      while (Date.now() - startTime < maxWait) {
        const token = await this.authService.getToken('owa');
        if (token) {
          hasToken = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!hasToken) {
        throw new Error('Aucun token OWA capturé. Ouvrez Outlook dans Firefox pour capturer les tokens.');
      }

      this.connectionState = 'connected';
      console.log('[Office365OutlookPlugin] Connecté avec succès');

      // Démarrer la synchro auto toutes les 5 minutes
      this.startAutoSync();

      return true;
    } catch (error) {
      console.error('[Office365OutlookPlugin] Erreur de connexion:', error);
      this.connectionState = 'failed';
      return false;
    }
  }

  /**
   * Déconnexion du service
   */
  async disconnect(): Promise<void> {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.connectionState = 'disconnected';
    console.log('[Office365OutlookPlugin] Déconnecté');
  }

  /**
   * Récupérer les emails récents
   */
  async getRecent(limit: number = 50): Promise<CartaeItem[]> {
    if (!this.isConnected()) {
      throw new Error('Plugin non connecté. Appelez connect() d\'abord.');
    }

    try {
      const emails = await this.emailService!.listInboxEmails(limit);
      return transformEmailsToCartaeItems(emails, { addDefaultTags: true });
    } catch (error) {
      console.error('[Office365OutlookPlugin] Erreur getRecent:', error);
      throw error;
    }
  }

  /**
   * Rechercher des emails
   */
  async search(options: DataSearchOptions): Promise<CartaeItem[]> {
    if (!this.isConnected()) {
      throw new Error('Plugin non connecté. Appelez connect() d\'abord.');
    }

    const { query, limit = 50 } = options;
    const items: CartaeItem[] = [];

    try {
      // Récupérer tous les emails et filtrer côté client pour l'instant
      const allEmails = await this.emailService!.listInboxEmails(Math.min(limit * 2, 100));
      
      let filteredEmails = allEmails;
      
      if (query) {
        filteredEmails = allEmails.filter(email =>
          email.subject.toLowerCase().includes(query.toLowerCase()) ||
          (email.body && email.body.toLowerCase().includes(query.toLowerCase()))
        );
      }

      items.push(...transformEmailsToCartaeItems(filteredEmails.slice(0, limit), { addDefaultTags: true }));

      // Trier par date (plus récent d'abord)
      items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      return items.slice(0, limit);
    } catch (error) {
      console.error('[Office365OutlookPlugin] Erreur search:', error);
      throw error;
    }
  }

  /**
   * Synchroniser les données
   */
  async sync(): Promise<SyncResult> {
    if (!this.isConnected()) {
      throw new Error('Plugin non connecté. Appelez connect() d\'abord.');
    }

    const syncedAt = new Date();
    const startTime = Date.now();
    let added = 0;
    const errors: Error[] = [];

    try {
      console.log('[Office365OutlookPlugin] Synchronisation...');

      const items = await this.getRecent(100);
      added = items.length;

      // Émettre un événement pour notifier les listeners
      if (this.context) {
        this.context.events?.emit('office365-outlook:synced', items, added, syncedAt);
      }

      const duration = Date.now() - startTime;
      console.log(`[Office365OutlookPlugin] Synchronisation terminée: ${added} items ajoutés (${duration}ms)`);

      return {
        added,
        updated: 0,
        deleted: 0,
        syncedAt,
        duration,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('[Office365OutlookPlugin] Erreur sync:', error);
      errors.push(error as Error);

      const duration = Date.now() - startTime;
      return {
        added,
        updated: 0,
        deleted: 0,
        syncedAt,
        duration,
        errors,
      };
    }
  }

  /**
   * Vérifier si le plugin est connecté
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Démarrer la synchronisation automatique (toutes les 5 minutes)
   */
  private startAutoSync(): void {
    if (this.syncInterval !== null) {
      return; // Déjà démarré
    }

    const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

    this.syncInterval = window.setInterval(async () => {
      try {
        await this.sync();
      } catch (error) {
        console.error('[Office365OutlookPlugin] Erreur synchro auto:', error);
      }
    }, SYNC_INTERVAL);

    console.log('[Office365OutlookPlugin] Synchro auto activée (toutes les 5min)');
  }
}

