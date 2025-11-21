/**
 * Office365Plugin
 * Implémente DataPluginInterface pour fournir accès unifié aux données Office 365
 */

import { CartaeItem } from '@cartae/core';
import {
  DataPluginInterface,
  DataSearchOptions,
  SyncResult,
  ConnectionState,
  IPluginContext,
} from './types/DataPluginInterface';

import { TokenRefreshManager } from '@cartae/office365-connector-core/services/TokenRefreshManager';
import {
  OAuthRefreshStrategy,
  IFrameRefreshStrategy,
} from '@cartae/office365-connector-core/strategies';
import { OwaEmailService } from './services/OwaEmailService';
import { TeamsService } from './services/TeamsService';
import { SharePointService } from './services/SharePointService';
import { PlannerService } from './services/PlannerService';

import { EmailTransformer } from './transformers/EmailTransformer';
import { TeamsTransformer } from './transformers/TeamsTransformer';
import { SharePointTransformer } from './transformers/SharePointTransformer';
import { PlannerTransformer } from './transformers/PlannerTransformer';

/**
 * Office365Plugin - Plugin de données pour Office 365
 *
 * Récupère les données provenant de:
 * - Emails (OWA)
 * - Teams (chats, messages)
 * - SharePoint (documents)
 * - Planner (tâches)
 *
 * Tous les données sont transformées en CartaeItems universels
 * et exposées via l'interface DataPluginInterface standardisée.
 */
export class Office365Plugin implements DataPluginInterface {
  // Services
  private authService: TokenRefreshManager;

  private emailService: OwaEmailService;

  private teamsService: TeamsService;

  private sharePointService: SharePointService;

  private plannerService: PlannerService;

  // État
  public connectionState: ConnectionState = 'disconnected';

  private syncInterval: NodeJS.Timeout | null = null;

  private context: IPluginContext | null = null;

  // Plugin interface
  name: string = 'office365-plugin';

  version: string = '1.0.0';

  description: string = 'Office 365 Data Plugin - Emails, Teams, SharePoint, Planner';

  constructor() {
    // Configuration TokenRefreshManager avec stratégies
    // Priorité 1: OAuth (si refresh_token disponible)
    // Priorité 2: IFrame (fallback toujours fonctionnel)
    this.authService = new TokenRefreshManager([
      new OAuthRefreshStrategy(), // Essaye OAuth d'abord
      new IFrameRefreshStrategy(), // Fallback iframe si OAuth échoue
    ]);

    this.emailService = new OwaEmailService(this.authService);
    this.teamsService = new TeamsService(this.authService);
    this.sharePointService = new SharePointService(this.authService);
    this.plannerService = new PlannerService(this.authService);
  }

  /**
   * Active le plugin et initialise les services
   */
  async activate(context: IPluginContext): Promise<void> {
    this.context = context;
    console.log('[Office365Plugin] Activated');
  }

  /**
   * Désactive le plugin et nettoie les ressources
   */
  async deactivate(): Promise<void> {
    await this.disconnect();
    this.context = null;
    console.log('[Office365Plugin] Deactivated');
  }

  /**
   * Se connecte à Office 365 via l'extension Firefox
   * Démarre la synchronisation automatique
   */
  async connect(): Promise<boolean> {
    try {
      this.connectionState = 'checking';

      // Attendre le token de l'extension (max 30 secondes)
      const startTime = Date.now();
      const timeout = 30000; // 30 secondes

      while (!this.authService.isAuthenticated()) {
        if (Date.now() - startTime > timeout) {
          this.connectionState = 'failed';
          console.error('[Office365Plugin] Connection timeout: No token received from extension');
          return false;
        }
        // Attendre 500ms avant de re-vérifier
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.connectionState = 'connected';
      console.log('[Office365Plugin] ✅ Connected successfully');

      // Démarrer la synchronisation automatique
      this.setupAutoSync();

      return true;
    } catch (error) {
      this.connectionState = 'failed';
      console.error('[Office365Plugin] Connection error:', error);
      return false;
    }
  }

  /**
   * Se déconnecte de Office 365
   */
  async disconnect(): Promise<void> {
    // Arrêter la synchronisation automatique
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Réinitialiser l'authentification
    this.authService.reset();
    this.connectionState = 'disconnected';

    console.log('[Office365Plugin] Disconnected');
  }

  /**
   * Récupère les items récents de toutes les sources
   * Mélange emails, chats, documents et tâches
   *
   * @param limit - Nombre d'items à récupérer (défaut: 50)
   */
  async getRecent(limit: number = 50): Promise<CartaeItem[]> {
    if (!this.isConnected()) {
      throw new Error('Office365Plugin not connected');
    }

    try {
      const allItems: CartaeItem[] = [];

      // Récupérer d'environ 1/4 du limite de chaque source
      const perSource = Math.ceil(limit / 4);

      // Récupérer en parallèle
      const [emails, chats, documents, tasks] = await Promise.all([
        this.emailService.getRecentEmails(perSource),
        this.teamsService.getRecentMessages(perSource),
        this.sharePointService.getRecentDocuments(perSource),
        this.plannerService.getMyTasks(perSource),
      ]);

      // Transformer les emails
      if (emails.length > 0) {
        const emailItems = EmailTransformer.toCartaeItems(emails);
        allItems.push(...emailItems);
      }

      // Transformer les messages Teams
      if (chats.length > 0) {
        const teamItems = chats.flatMap(chat => TeamsTransformer.chatToCartaeItems(chat));
        allItems.push(...teamItems);
      }

      // Transformer les documents SharePoint
      if (documents.length > 0) {
        const docItems = SharePointTransformer.toCartaeItems(documents);
        allItems.push(...docItems);
      }

      // Transformer les tâches Planner
      if (tasks.length > 0) {
        const taskItems = PlannerTransformer.toCartaeItems(tasks);
        allItems.push(...taskItems);
      }

      // Trier par date décroissante et limiter
      return allItems
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('[Office365Plugin] Error getting recent items:', error);
      return [];
    }
  }

  /**
   * Recherche des items selon les critères spécifiés
   *
   * @param options - Options de recherche (query, types, tags, dates, limit)
   */
  async search(options: DataSearchOptions): Promise<CartaeItem[]> {
    if (!this.isConnected()) {
      throw new Error('Office365Plugin not connected');
    }

    try {
      // Récupérer une grande liste d'items pour filtrer
      const allItems = await this.getRecent(Math.min(options.limit || 100, 200));

      // Appliquer les filtres
      let filtered = allItems;

      // Filtrer par type
      if (options.types && options.types.length > 0) {
        filtered = filtered.filter(item => options.types!.includes(item.type));
      }

      // Filtrer par tags
      if (options.tags && options.tags.length > 0) {
        filtered = filtered.filter(item =>
          options.tags!.some((tag: string) => item.tags.includes(tag))
        );
      }

      // Filtrer par dates
      if (options.startDate) {
        const startDate = new Date(options.startDate);
        filtered = filtered.filter(item => new Date(item.createdAt) >= startDate);
      }

      if (options.endDate) {
        const endDate = new Date(options.endDate);
        filtered = filtered.filter(item => new Date(item.createdAt) <= endDate);
      }

      // Filtrer par query texte
      if (options.query) {
        const queryLower = options.query.toLowerCase();
        filtered = filtered.filter(
          item =>
            item.title.toLowerCase().includes(queryLower) ||
            (item.content && item.content.toLowerCase().includes(queryLower)) ||
            item.tags.some(tag => tag.toLowerCase().includes(queryLower))
        );
      }

      // Limiter le résultat
      const resultLimit = options.limit || 50;
      return filtered.slice(0, resultLimit);
    } catch (error) {
      console.error('[Office365Plugin] Error searching items:', error);
      return [];
    }
  }

  /**
   * Synchronise les données avec Office 365
   * Récupère les items récents et retourne les statistiques
   *
   * @returns SyncResult avec statistiques de synchronisation
   */
  async sync(): Promise<SyncResult> {
    if (!this.isConnected()) {
      throw new Error('Office365Plugin not connected');
    }

    try {
      const startTime = Date.now();

      // Récupérer les items récents (plus que d'habitude pour le delta)
      const recentItems = await this.getRecent(100);

      const duration = Date.now() - startTime;

      const result: SyncResult = {
        added: recentItems.length,
        updated: 0, // Serait calculé avec cache local
        deleted: 0, // Serait détecté avec tracking
        syncedAt: new Date(),
        duration,
      };

      // Émettre un event de synchronisation
      if (this.context?.events) {
        this.context.events.emit('office365:synced', {
          type: 'office365:synced',
          timestamp: new Date(),
          data: result,
        });
      }

      console.log('[Office365Plugin] Sync completed:', result);

      return result;
    } catch (error) {
      console.error('[Office365Plugin] Error syncing:', error);
      return {
        added: 0,
        updated: 0,
        deleted: 0,
        syncedAt: new Date(),
        duration: 0,
      };
    }
  }

  /**
   * Vérifie si le plugin est connecté
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.authService.isAuthenticated();
  }

  /**
   * Configure la synchronisation automatique (5 minutes)
   */
  private setupAutoSync(): void {
    // Arrêter la synchro existante si elle tourne
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Démarrer une synchro toutes les 5 minutes
    const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

    this.syncInterval = setInterval(() => {
      this.sync().catch(error => {
        console.error('[Office365Plugin] Auto-sync error:', error);
      });
    }, SYNC_INTERVAL);

    console.log('[Office365Plugin] Auto-sync enabled (interval: 5 minutes)');
  }
}
