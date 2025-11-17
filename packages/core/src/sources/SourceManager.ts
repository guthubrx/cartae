/**
 * SourceManager - Service de gestion des sources de données
 *
 * Responsable de :
 * - CRUD des sources (Create, Read, Update, Delete)
 * - Synchronisation des données depuis sources externes
 * - Test de connexion
 * - Gestion de l'historique de sync
 * - Émission d'événements
 */

import { EventBus } from '../events/EventBus';
import type { CartaeItem } from '../types/CartaeItem';
import type {
  SourceConfig,
  SourceStatus,
  SyncResult,
  SyncHistoryEntry,
  SyncOptions,
  TestConnectionResult,
  SourceManagerEvents,
  FieldMapping,
} from './types';

/**
 * Interface pour le stockage des sources
 */
export interface SourceStorage {
  getAllSources(): Promise<SourceConfig[]>;
  getSource(id: string): Promise<SourceConfig | null>;
  saveSource(source: SourceConfig): Promise<void>;
  deleteSource(id: string): Promise<void>;
  getSyncHistory(sourceId: string, limit?: number): Promise<SyncHistoryEntry[]>;
  saveSyncHistory(entry: SyncHistoryEntry): Promise<void>;
}

/**
 * Interface pour les connecteurs de sources
 */
export interface SourceConnector {
  /** Type de connecteur */
  type: string;

  /** Tester la connexion */
  testConnection(config: Record<string, any>): Promise<TestConnectionResult>;

  /** Synchroniser les données */
  sync(
    config: Record<string, any>,
    fieldMappings: FieldMapping[],
    options?: SyncOptions
  ): Promise<{ items: CartaeItem[]; errors?: Array<{ itemId: string; error: string }> }>;

  /** Valider la configuration */
  validateConfig(config: Record<string, any>): { valid: boolean; errors?: string[] };
}

/**
 * Options de configuration du SourceManager
 */
export interface SourceManagerConfig {
  /** Service de stockage des sources */
  storage: SourceStorage;

  /** Event bus pour les événements */
  eventBus?: EventBus<SourceManagerEvents>;

  /** Connecteurs disponibles (key = type, value = connector) */
  connectors?: Map<string, SourceConnector>;

  /** Activer la synchronisation automatique globale */
  enableAutoSync?: boolean;

  /** Intervalle de vérification pour auto-sync (ms) */
  autoSyncCheckInterval?: number;
}

/**
 * SourceManager - Service principal
 */
export class SourceManager {
  private storage: SourceStorage;
  private eventBus: EventBus<SourceManagerEvents>;
  private connectors: Map<string, SourceConnector>;
  private enableAutoSync: boolean;
  private autoSyncCheckInterval: number;
  private autoSyncTimer?: NodeJS.Timeout;
  private activeSyncs: Map<string, boolean> = new Map();

  constructor(config: SourceManagerConfig) {
    this.storage = config.storage;
    this.eventBus = config.eventBus || new EventBus<SourceManagerEvents>();
    this.connectors = config.connectors || new Map();
    this.enableAutoSync = config.enableAutoSync ?? true;
    this.autoSyncCheckInterval = config.autoSyncCheckInterval ?? 60000; // 1 minute par défaut

    if (this.enableAutoSync) {
      this.startAutoSyncTimer();
    }
  }

  // ==================== CRUD Sources ====================

  /**
   * Créer une nouvelle source
   */
  async createSource(
    name: string,
    connectorType: SourceConfig['connectorType'],
    config: Record<string, any>,
    fieldMappings: FieldMapping[],
    options?: {
      autoSync?: boolean;
      syncInterval?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<SourceConfig> {
    // Valider la configuration avec le connecteur
    const connector = this.connectors.get(connectorType);
    if (connector) {
      const validation = connector.validateConfig(config);
      if (!validation.valid) {
        throw new Error(
          `Configuration invalide: ${validation.errors?.join(', ') || 'Erreur inconnue'}`
        );
      }
    }

    const source: SourceConfig = {
      id: `source_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name,
      connectorType,
      config,
      status: 'configuring',
      createdAt: new Date(),
      updatedAt: new Date(),
      autoSync: options?.autoSync ?? false,
      syncInterval: options?.syncInterval,
      fieldMappings,
      metadata: options?.metadata,
    };

    await this.storage.saveSource(source);
    this.eventBus.emit('source:created', source);

    return source;
  }

  /**
   * Récupérer une source par ID
   */
  async getSource(id: string): Promise<SourceConfig | null> {
    return await this.storage.getSource(id);
  }

  /**
   * Récupérer toutes les sources
   */
  async getAllSources(): Promise<SourceConfig[]> {
    return await this.storage.getAllSources();
  }

  /**
   * Mettre à jour une source
   */
  async updateSource(
    id: string,
    updates: Partial<Omit<SourceConfig, 'id' | 'createdAt'>>
  ): Promise<SourceConfig> {
    const source = await this.storage.getSource(id);
    if (!source) {
      throw new Error(`Source non trouvée: ${id}`);
    }

    const updatedSource: SourceConfig = {
      ...source,
      ...updates,
      updatedAt: new Date(),
    };

    await this.storage.saveSource(updatedSource);
    this.eventBus.emit('source:updated', updatedSource);

    return updatedSource;
  }

  /**
   * Supprimer une source
   */
  async deleteSource(id: string): Promise<void> {
    await this.storage.deleteSource(id);
    this.eventBus.emit('source:deleted', id);
  }

  /**
   * Changer le statut d'une source
   */
  async setSourceStatus(id: string, status: SourceStatus): Promise<void> {
    await this.updateSource(id, { status });
    this.eventBus.emit('source:status:changed', { sourceId: id, status });
  }

  // ==================== Test Connexion ====================

  /**
   * Tester la connexion d'une source
   */
  async testConnection(id: string): Promise<TestConnectionResult> {
    const source = await this.storage.getSource(id);
    if (!source) {
      throw new Error(`Source non trouvée: ${id}`);
    }

    const connector = this.connectors.get(source.connectorType);
    if (!connector) {
      return {
        success: false,
        message: `Connecteur non disponible: ${source.connectorType}`,
        errors: [`Connecteur ${source.connectorType} non enregistré`],
      };
    }

    try {
      const result = await connector.testConnection(source.config);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        errors: [error instanceof Error ? error.stack || error.message : 'Erreur inconnue'],
      };
    }
  }

  // ==================== Synchronisation ====================

  /**
   * Synchroniser une source
   */
  async syncSource(id: string, options?: SyncOptions): Promise<SyncResult> {
    // Vérifier si un sync est déjà en cours
    if (this.activeSyncs.get(id)) {
      throw new Error(`Synchronisation déjà en cours pour la source: ${id}`);
    }

    const source = await this.storage.getSource(id);
    if (!source) {
      throw new Error(`Source non trouvée: ${id}`);
    }

    const connector = this.connectors.get(source.connectorType);
    if (!connector) {
      throw new Error(`Connecteur non disponible: ${source.connectorType}`);
    }

    this.activeSyncs.set(id, true);
    const startedAt = new Date();
    this.eventBus.emit('source:sync:started', { sourceId: id });

    try {
      // Exécuter la synchronisation via le connecteur
      const syncData = await connector.sync(source.config, source.fieldMappings, {
        ...options,
        onProgress: (progress) => {
          this.eventBus.emit('source:sync:progress', { sourceId: id, progress });
          if (options?.onProgress) {
            options.onProgress(progress);
          }
        },
      });

      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();

      const result: SyncResult = {
        success: true,
        sourceId: id,
        startedAt,
        finishedAt,
        itemsProcessed: syncData.items.length,
        itemsSuccess: syncData.items.length - (syncData.errors?.length || 0),
        itemsError: syncData.errors?.length || 0,
        duration,
        itemErrors: syncData.errors,
      };

      // Mettre à jour la source avec la date de dernière sync
      await this.updateSource(id, {
        lastSyncAt: finishedAt,
        status: 'active',
      });

      // Sauvegarder dans l'historique
      await this.saveSyncHistory(id, result);

      this.eventBus.emit('source:sync:completed', result);
      return result;
    } catch (error) {
      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      const result: SyncResult = {
        success: false,
        sourceId: id,
        startedAt,
        finishedAt,
        itemsProcessed: 0,
        itemsSuccess: 0,
        itemsError: 0,
        duration,
        error: errorMessage,
      };

      // Mettre à jour la source avec l'erreur
      await this.updateSource(id, {
        lastSyncError: errorMessage,
        status: 'error',
      });

      // Sauvegarder dans l'historique
      await this.saveSyncHistory(id, result);

      this.eventBus.emit('source:sync:failed', { sourceId: id, error: errorMessage });
      return result;
    } finally {
      this.activeSyncs.delete(id);
    }
  }

  /**
   * Sauvegarder un résultat de sync dans l'historique
   */
  private async saveSyncHistory(sourceId: string, result: SyncResult): Promise<void> {
    const entry: SyncHistoryEntry = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      sourceId,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      status: result.success ? 'success' : 'error',
      itemsProcessed: result.itemsProcessed,
      itemsSuccess: result.itemsSuccess,
      itemsError: result.itemsError,
      duration: result.duration,
      error: result.error,
    };

    await this.storage.saveSyncHistory(entry);
  }

  /**
   * Récupérer l'historique de synchronisation
   */
  async getSyncHistory(sourceId: string, limit: number = 50): Promise<SyncHistoryEntry[]> {
    return await this.storage.getSyncHistory(sourceId, limit);
  }

  // ==================== Auto-Sync ====================

  /**
   * Démarrer le timer de synchronisation automatique
   */
  private startAutoSyncTimer(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    this.autoSyncTimer = setInterval(async () => {
      await this.checkAutoSyncSources();
    }, this.autoSyncCheckInterval);
  }

  /**
   * Vérifier quelles sources doivent être synchronisées automatiquement
   */
  private async checkAutoSyncSources(): Promise<void> {
    if (!this.enableAutoSync) return;

    const sources = await this.storage.getAllSources();
    const now = Date.now();

    for (const source of sources) {
      if (!source.autoSync || !source.syncInterval) continue;
      if (source.status !== 'active') continue;

      const intervalMs = source.syncInterval * 60 * 1000; // minutes → ms
      const lastSyncTime = source.lastSyncAt?.getTime() || 0;
      const timeSinceLastSync = now - lastSyncTime;

      if (timeSinceLastSync >= intervalMs) {
        // Synchroniser cette source
        try {
          await this.syncSource(source.id);
        } catch (error) {
          console.error(
            `Erreur auto-sync source ${source.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    }
  }

  /**
   * Arrêter le timer de synchronisation automatique
   */
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = undefined;
    }
  }

  // ==================== Connecteurs ====================

  /**
   * Enregistrer un nouveau connecteur
   */
  registerConnector(connector: SourceConnector): void {
    this.connectors.set(connector.type, connector);
  }

  /**
   * Récupérer un connecteur par type
   */
  getConnector(type: string): SourceConnector | undefined {
    return this.connectors.get(type);
  }

  /**
   * Lister tous les types de connecteurs disponibles
   */
  getAvailableConnectors(): string[] {
    return Array.from(this.connectors.keys());
  }

  // ==================== Événements ====================

  /**
   * S'abonner à un événement
   */
  on<K extends keyof SourceManagerEvents>(
    event: K,
    handler: (data: SourceManagerEvents[K]) => void
  ): void {
    this.eventBus.on(event, handler);
  }

  /**
   * Se désabonner d'un événement
   */
  off<K extends keyof SourceManagerEvents>(
    event: K,
    handler: (data: SourceManagerEvents[K]) => void
  ): void {
    this.eventBus.off(event, handler);
  }

  // ==================== Lifecycle ====================

  /**
   * Nettoyer les ressources
   */
  destroy(): void {
    this.stopAutoSync();
    this.connectors.clear();
    this.activeSyncs.clear();
  }
}
