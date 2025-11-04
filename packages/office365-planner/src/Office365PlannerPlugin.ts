/**
 * Office365 Planner Data Plugin
 * 
 * Plugin Data pour récupérer les tâches Planner via Graph API
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
import { PlannerService } from '../services/PlannerService';
import { transformTasksToCartaeItems } from '../transformers/PlannerTransformer';

export class Office365PlannerPlugin implements DataPluginInterface {
  public readonly manifest = {
    id: 'office365-planner',
    name: 'Office 365 Planner',
    version: '1.0.0',
    description: 'Connect and sync with Microsoft Planner tasks',
    author: 'Cartae Team',
    permissions: [
      'network.https://graph.microsoft.com',
      'storage.local',
    ],
    apiVersion: '1.0.0',
    engines: {
      cartae: '^1.0.0',
    },
  };

  public connectionState: ConnectionState = 'disconnected';

  private authService: IOffice365AuthService | null = null;
  private plannerService: PlannerService | null = null;
  private context: IPluginContext | null = null;
  private syncInterval: number | null = null;

  setAuthService(authService: IOffice365AuthService): void {
    this.authService = authService;
    this.plannerService = new PlannerService(authService);
  }

  async activate(context: IPluginContext): Promise<void> {
    this.context = context;
    console.log('[Office365PlannerPlugin] Activation...');

    if (!this.authService) {
      throw new Error('[Office365PlannerPlugin] AuthService non fourni.');
    }

    await this.authService.startMonitoring();
    console.log('[Office365PlannerPlugin] Services initialisés');
  }

  async deactivate(): Promise<void> {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.authService) {
      this.authService.stopMonitoring();
    }

    this.plannerService = null;
    this.context = null;
    this.connectionState = 'disconnected';
  }

  async connect(): Promise<boolean> {
    if (this.connectionState === 'connected') return true;
    if (!this.authService) throw new Error('[Office365PlannerPlugin] AuthService non fourni.');

    this.connectionState = 'checking';

    try {
      const hasExtension = typeof (window as any).cartaeBrowserStorage !== 'undefined';
      if (!hasExtension) throw new Error('Extension Firefox non détectée.');

      const maxWait = 30000;
      const startTime = Date.now();
      let hasToken = false;

      while (Date.now() - startTime < maxWait) {
        const token = await this.authService.getToken('graph');
        if (token) {
          hasToken = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!hasToken) throw new Error('Aucun token Graph capturé.');

      this.connectionState = 'connected';
      this.startAutoSync();
      return true;
    } catch (error) {
      console.error('[Office365PlannerPlugin] Erreur de connexion:', error);
      this.connectionState = 'failed';
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.connectionState = 'disconnected';
  }

  async getRecent(limit: number = 50): Promise<CartaeItem[]> {
    if (!this.isConnected()) throw new Error('Plugin non connecté.');
    const tasks = await this.plannerService!.listMyTasks();
    const activeTasks = tasks.filter(t => t.percentComplete < 100).slice(0, limit);
    return transformTasksToCartaeItems(activeTasks, { addDefaultTags: true });
  }

  async search(options: DataSearchOptions): Promise<CartaeItem[]> {
    if (!this.isConnected()) throw new Error('Plugin non connecté.');
    const { query, limit = 50 } = options;
    const tasks = await this.plannerService!.listMyTasks();
    let filteredTasks = tasks;
    if (query) {
      filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(query.toLowerCase())
      );
    }
    const items = transformTasksToCartaeItems(filteredTasks, { addDefaultTags: true });
    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return items.slice(0, limit);
  }

  async sync(): Promise<SyncResult> {
    if (!this.isConnected()) throw new Error('Plugin non connecté.');
    const syncedAt = new Date();
    const startTime = Date.now();
    const items = await this.getRecent(100);
    const added = items.length;
    if (this.context) {
      this.context.events?.emit('office365-planner:synced', items, added, syncedAt);
    }
    return {
      added,
      updated: 0,
      deleted: 0,
      syncedAt,
      duration: Date.now() - startTime,
    };
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  private startAutoSync(): void {
    if (this.syncInterval !== null) return;
    this.syncInterval = window.setInterval(async () => {
      try {
        await this.sync();
      } catch (error) {
        console.error('[Office365PlannerPlugin] Erreur synchro auto:', error);
      }
    }, 5 * 60 * 1000);
  }
}

