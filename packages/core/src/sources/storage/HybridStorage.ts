/**
 * HybridStorage - Stockage hybride IndexedDB + PostgreSQL
 *
 * Architecture:
 * - Layer 1 (Cache): IndexedDB pour accès rapide et offline
 * - Layer 2 (Persistence): PostgreSQL via API backend
 * - Layer 3 (Sync): Queue offline + conflict resolution
 *
 * Stratégie:
 * - READ: Cache-first (IndexedDB → PostgreSQL fallback)
 * - WRITE: Double-write (IndexedDB + PostgreSQL/queue)
 * - OFFLINE: Queue operations dans IndexedDB, sync quand online
 * - CONFLICT: Optimistic locking + last-write-wins
 */

import type { SourceStorage } from '../SourceManager';
import type { SourceConfig, SyncHistoryEntry } from '../types';
import { IndexedDBSourceStorage } from '../IndexedDBSourceStorage';
import { SourcesAPIClient, type SourcesAPIClientConfig, type SyncQueueItem } from './SourcesAPIClient';

/**
 * Configuration du HybridStorage
 */
export interface HybridStorageConfig {
  /** Client API pour backend PostgreSQL */
  apiClient?: SourcesAPIClient;

  /** Config API (si pas de client fourni) */
  apiConfig?: SourcesAPIClientConfig;

  /** Activer mode offline (défaut: auto-détecté) */
  forceOffline?: boolean;

  /** Intervalle de tentative de sync queue offline (ms) */
  queueSyncInterval?: number;

  /** Max items à processer par batch de queue */
  queueBatchSize?: number;
}

/**
 * Metadata d'une source pour optimistic locking
 */
interface SourceMetadata {
  version: number;
  checksum?: string;
}

/**
 * HybridStorage - Implémente SourceStorage avec cache + persistence
 */
export class HybridStorage implements SourceStorage {
  private indexedDB: IndexedDBSourceStorage;
  private apiClient: SourcesAPIClient;
  private isOnline: boolean = navigator.onLine;
  private forceOffline: boolean;
  private queueSyncInterval: number;
  private queueBatchSize: number;
  private queueSyncTimer?: ReturnType<typeof setInterval>;
  private offlineQueue: Map<string, SyncQueueItem> = new Map();

  constructor(config: HybridStorageConfig) {
    this.indexedDB = new IndexedDBSourceStorage();

    if (config.apiClient) {
      this.apiClient = config.apiClient;
    } else if (config.apiConfig) {
      this.apiClient = new SourcesAPIClient(config.apiConfig);
    } else {
      throw new Error('HybridStorage requires either apiClient or apiConfig');
    }

    this.forceOffline = config.forceOffline ?? false;
    this.queueSyncInterval = config.queueSyncInterval ?? 30000; // 30s par défaut
    this.queueBatchSize = config.queueBatchSize ?? 10;

    // Écouter les changements de connectivité
    this.setupConnectivityListeners();

    // Démarrer le timer de sync de queue si online
    if (this.isOnline && !this.forceOffline) {
      this.startQueueSyncTimer();
    }
  }

  // ==================== Connectivity Management ====================

  /**
   * Configurer les listeners pour online/offline
   */
  private setupConnectivityListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[HybridStorage] Network online');
        this.isOnline = true;
        if (!this.forceOffline) {
          this.startQueueSyncTimer();
          this.processPendingQueue();
        }
      });

      window.addEventListener('offline', () => {
        console.log('[HybridStorage] Network offline');
        this.isOnline = false;
        this.stopQueueSyncTimer();
      });
    }
  }

  /**
   * Démarrer le timer de sync de queue
   */
  private startQueueSyncTimer(): void {
    if (this.queueSyncTimer) {
      return; // Déjà démarré
    }

    this.queueSyncTimer = setInterval(() => {
      this.processPendingQueue();
    }, this.queueSyncInterval);
  }

  /**
   * Arrêter le timer de sync de queue
   */
  private stopQueueSyncTimer(): void {
    if (this.queueSyncTimer) {
      clearInterval(this.queueSyncTimer);
      this.queueSyncTimer = undefined;
    }
  }

  /**
   * Traiter la queue d'opérations offline
   */
  private async processPendingQueue(): Promise<void> {
    if (!this.isOnline || this.forceOffline) {
      return;
    }

    try {
      // Récupérer les items en attente (batch limité)
      const queueItems = Array.from(this.offlineQueue.values())
        .filter(item => item.status === 'pending' && item.retryCount < item.maxRetries)
        .slice(0, this.queueBatchSize);

      if (queueItems.length === 0) {
        return;
      }

      console.log(`[HybridStorage] Processing ${queueItems.length} queued operations`);

      for (const item of queueItems) {
        try {
          await this.processQueueItem(item);
          this.offlineQueue.delete(item.id);
        } catch (error) {
          console.error(`[HybridStorage] Error processing queue item ${item.id}:`, error);

          // Incrémenter retry count
          item.retryCount++;
          item.lastError = error instanceof Error ? error.message : 'Unknown error';

          if (item.retryCount >= item.maxRetries) {
            item.status = 'error';
            console.error(`[HybridStorage] Queue item ${item.id} failed after ${item.maxRetries} retries`);
          }
        }
      }
    } catch (error) {
      console.error('[HybridStorage] Error processing queue:', error);
    }
  }

  /**
   * Traiter un item de la queue
   */
  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    switch (item.operation) {
      case 'create':
        await this.apiClient.createSource(item.payload);
        break;

      case 'update':
        const expectedVersion = item.payload.metadata?.version;
        const result = await this.apiClient.updateSource(item.payload, expectedVersion);

        // Gérer les conflits
        if (result.conflict?.detected) {
          console.warn(`[HybridStorage] Conflict on update ${item.entityId}:`, result.conflict);

          // Last-write-wins rejeté → màj cache avec données serveur
          if (result.conflict.resolution === 'last_write_wins_rejected' && result.conflict.serverData) {
            await this.indexedDB.saveSource(result.conflict.serverData as SourceConfig);
          }
        }
        break;

      case 'delete':
        if (item.entityId) {
          await this.apiClient.deleteSource(item.entityId);
        }
        break;
    }

    item.status = 'success';
    item.processedAt = new Date();
  }

  /**
   * Ajouter une opération à la queue offline
   */
  private enqueueOperation(
    operation: 'create' | 'update' | 'delete',
    entityId: string | undefined,
    payload: any,
    userId: string
  ): void {
    const queueItem: SyncQueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      operation,
      entityType: 'source',
      entityId,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      userId,
    };

    this.offlineQueue.set(queueItem.id, queueItem);
    console.log(`[HybridStorage] Queued ${operation} operation for ${entityId || 'new entity'}`);
  }

  // ==================== SourceStorage Implementation ====================

  /**
   * Récupérer toutes les sources (cache-first)
   */
  async getAllSources(): Promise<SourceConfig[]> {
    // Toujours lire depuis IndexedDB (cache local)
    const cachedSources = await this.indexedDB.getAllSources();

    // Si online, fetch depuis PostgreSQL et mettre à jour cache
    if (this.isOnline && !this.forceOffline) {
      try {
        const response = await this.apiClient.getAllSources();

        if (response.success && response.data) {
          // Mettre à jour le cache avec les données serveur
          for (const source of response.data) {
            await this.indexedDB.saveSource(source);
          }

          return response.data;
        }
      } catch (error) {
        console.warn('[HybridStorage] Failed to fetch from server, using cache:', error);
      }
    }

    // Fallback sur cache (offline ou erreur serveur)
    return cachedSources;
  }

  /**
   * Récupérer une source par ID (cache-first)
   */
  async getSource(id: string): Promise<SourceConfig | null> {
    // Toujours lire depuis IndexedDB (cache local)
    const cachedSource = await this.indexedDB.getSource(id);

    // Si online, fetch depuis PostgreSQL et mettre à jour cache
    if (this.isOnline && !this.forceOffline) {
      try {
        const response = await this.apiClient.getSource(id);

        if (response.success) {
          if (response.data) {
            // Mettre à jour le cache
            await this.indexedDB.saveSource(response.data);
            return response.data;
          } else {
            // Source supprimée sur serveur → supprimer du cache
            if (cachedSource) {
              await this.indexedDB.deleteSource(id);
            }
            return null;
          }
        }
      } catch (error) {
        console.warn(`[HybridStorage] Failed to fetch source ${id} from server, using cache:`, error);
      }
    }

    // Fallback sur cache (offline ou erreur serveur)
    return cachedSource;
  }

  /**
   * Sauvegarder une source (double-write)
   */
  async saveSource(source: SourceConfig): Promise<void> {
    // 1. Toujours sauvegarder dans IndexedDB (cache local)
    await this.indexedDB.saveSource(source);

    // 2. Si online, sauvegarder dans PostgreSQL
    if (this.isOnline && !this.forceOffline) {
      try {
        // Déterminer si c'est un create ou update
        const existingSource = await this.apiClient.getSource(source.id);
        const isCreate = !existingSource.success || !existingSource.data;

        if (isCreate) {
          const response = await this.apiClient.createSource(source);

          if (!response.success) {
            throw new Error(response.error || 'Failed to create source');
          }
        } else {
          // Update avec optimistic locking
          const metadata = source.metadata as SourceMetadata | undefined;
          const expectedVersion = metadata?.version;

          const response = await this.apiClient.updateSource(source, expectedVersion);

          if (!response.success) {
            // Conflit détecté
            if (response.conflict?.detected) {
              console.warn('[HybridStorage] Conflict on saveSource:', response.conflict);

              // Last-write-wins rejeté → màj cache avec données serveur
              if (response.conflict.resolution === 'last_write_wins_rejected' && response.conflict.serverData) {
                await this.indexedDB.saveSource(response.conflict.serverData as SourceConfig);
                throw new Error('Conflict: server version is newer');
              }
            } else {
              throw new Error(response.error || 'Failed to update source');
            }
          }
        }
      } catch (error) {
        console.warn('[HybridStorage] Failed to save to server, queuing operation:', error);

        // 3. Si erreur, ajouter à la queue offline
        const operation = source.createdAt.getTime() === source.updatedAt.getTime() ? 'create' : 'update';
        this.enqueueOperation(operation, source.id, source, 'current-user-id'); // TODO: get real user ID
      }
    } else {
      // Offline → queue l'opération
      const operation = source.createdAt.getTime() === source.updatedAt.getTime() ? 'create' : 'update';
      this.enqueueOperation(operation, source.id, source, 'current-user-id'); // TODO: get real user ID
    }
  }

  /**
   * Supprimer une source (double-delete)
   */
  async deleteSource(id: string): Promise<void> {
    // 1. Toujours supprimer d'IndexedDB (cache local)
    await this.indexedDB.deleteSource(id);

    // 2. Si online, supprimer de PostgreSQL
    if (this.isOnline && !this.forceOffline) {
      try {
        const response = await this.apiClient.deleteSource(id);

        if (!response.success) {
          throw new Error(response.error || 'Failed to delete source');
        }
      } catch (error) {
        console.warn('[HybridStorage] Failed to delete from server, queuing operation:', error);

        // 3. Si erreur, ajouter à la queue offline
        this.enqueueOperation('delete', id, null, 'current-user-id'); // TODO: get real user ID
      }
    } else {
      // Offline → queue l'opération
      this.enqueueOperation('delete', id, null, 'current-user-id'); // TODO: get real user ID
    }
  }

  // ==================== Sync History ====================

  /**
   * Récupérer l'historique de sync (cache-first)
   */
  async getSyncHistory(sourceId: string, limit: number = 50): Promise<SyncHistoryEntry[]> {
    // Toujours lire depuis IndexedDB (cache local)
    const cachedHistory = await this.indexedDB.getSyncHistory(sourceId, limit);

    // Si online, fetch depuis PostgreSQL et mettre à jour cache
    if (this.isOnline && !this.forceOffline) {
      try {
        const response = await this.apiClient.getSyncHistory(sourceId, limit);

        if (response.success && response.data) {
          // Mettre à jour le cache avec les données serveur
          for (const entry of response.data) {
            await this.indexedDB.saveSyncHistory(entry);
          }

          return response.data;
        }
      } catch (error) {
        console.warn('[HybridStorage] Failed to fetch history from server, using cache:', error);
      }
    }

    // Fallback sur cache (offline ou erreur serveur)
    return cachedHistory;
  }

  /**
   * Sauvegarder une entrée d'historique (double-write)
   */
  async saveSyncHistory(entry: SyncHistoryEntry): Promise<void> {
    // 1. Toujours sauvegarder dans IndexedDB (cache local)
    await this.indexedDB.saveSyncHistory(entry);

    // 2. Si online, sauvegarder dans PostgreSQL
    if (this.isOnline && !this.forceOffline) {
      try {
        const response = await this.apiClient.saveSyncHistory(entry);

        if (!response.success) {
          console.warn('[HybridStorage] Failed to save history to server:', response.error);
          // Note: Pas de queue pour l'historique (non-critique)
        }
      } catch (error) {
        console.warn('[HybridStorage] Failed to save history to server:', error);
        // Note: Pas de queue pour l'historique (non-critique)
      }
    }
  }

  // ==================== Lifecycle ====================

  /**
   * Forcer la synchronisation de la queue
   */
  async forceSyncQueue(): Promise<void> {
    await this.processPendingQueue();
  }

  /**
   * Obtenir le statut de la queue
   */
  getQueueStatus(): {
    pending: number;
    processing: number;
    success: number;
    error: number;
  } {
    const items = Array.from(this.offlineQueue.values());

    return {
      pending: items.filter(i => i.status === 'pending').length,
      processing: items.filter(i => i.status === 'processing').length,
      success: items.filter(i => i.status === 'success').length,
      error: items.filter(i => i.status === 'error').length,
    };
  }

  /**
   * Nettoyer la queue (supprimer items success/error)
   */
  cleanupQueue(): void {
    const toDelete: string[] = [];

    for (const [id, item] of this.offlineQueue.entries()) {
      if (item.status === 'success' || item.status === 'error') {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.offlineQueue.delete(id);
    }

    console.log(`[HybridStorage] Cleaned up ${toDelete.length} queue items`);
  }

  /**
   * Fermer les connexions
   */
  close(): void {
    this.stopQueueSyncTimer();
    this.indexedDB.close();
  }
}
