/**
 * SourcesAPIClient - Client HTTP pour l'API backend PostgreSQL
 *
 * Communique avec le backend @cartae/database-api pour:
 * - CRUD sources (via table PostgreSQL avec RLS)
 * - Sync history
 * - Processing queue offline
 */

import type { SourceConfig, SyncHistoryEntry } from '../types';

/**
 * Configuration du client API
 */
export interface SourcesAPIClientConfig {
  /** URL de base de l'API backend (ex: http://localhost:3001) */
  baseUrl: string;

  /** Token JWT pour authentification */
  getAuthToken: () => Promise<string | null>;

  /** Timeout requêtes HTTP (ms) */
  timeout?: number;
}

/**
 * Résultat d'une opération API avec gestion de conflit
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  conflict?: {
    detected: boolean;
    resolution: 'last_write_wins_accepted' | 'last_write_wins_rejected' | 'manual_required';
    currentVersion?: number;
    serverData?: T;
  };
}

/**
 * Queue item pour opérations offline
 */
export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: 'source';
  entityId?: string;
  payload: any;
  status: 'pending' | 'processing' | 'success' | 'error';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  processedAt?: Date;
  lastError?: string;
  userId: string;
}

/**
 * Client API pour les sources (backend PostgreSQL)
 */
export class SourcesAPIClient {
  private config: SourcesAPIClientConfig;
  private timeout: number;

  constructor(config: SourcesAPIClientConfig) {
    this.config = config;
    this.timeout = config.timeout || 10000; // 10s par défaut
  }

  // ==================== Sources CRUD ====================

  /**
   * Récupérer toutes les sources de l'utilisateur
   */
  async getAllSources(): Promise<APIResponse<SourceConfig[]>> {
    try {
      const response = await this.fetch('/api/sources', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Convertir les dates ISO en objets Date
      const sources = data.sources.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        lastSyncAt: s.lastSyncAt ? new Date(s.lastSyncAt) : undefined,
      }));

      return { success: true, data: sources };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Récupérer une source par ID
   */
  async getSource(id: string): Promise<APIResponse<SourceConfig | null>> {
    try {
      const response = await this.fetch(`/api/sources/${id}`, {
        method: 'GET',
      });

      if (response.status === 404) {
        return { success: true, data: null };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const source = {
        ...data.source,
        createdAt: new Date(data.source.createdAt),
        updatedAt: new Date(data.source.updatedAt),
        lastSyncAt: data.source.lastSyncAt ? new Date(data.source.lastSyncAt) : undefined,
      };

      return { success: true, data: source };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Créer une nouvelle source
   */
  async createSource(source: SourceConfig): Promise<APIResponse<SourceConfig>> {
    try {
      const response = await this.fetch('/api/sources', {
        method: 'POST',
        body: JSON.stringify({
          source: {
            ...source,
            createdAt: source.createdAt.toISOString(),
            updatedAt: source.updatedAt.toISOString(),
            lastSyncAt: source.lastSyncAt?.toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const createdSource = {
        ...data.source,
        createdAt: new Date(data.source.createdAt),
        updatedAt: new Date(data.source.updatedAt),
        lastSyncAt: data.source.lastSyncAt ? new Date(data.source.lastSyncAt) : undefined,
      };

      return { success: true, data: createdSource };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Mettre à jour une source existante (avec optimistic locking)
   */
  async updateSource(source: SourceConfig, expectedVersion?: number): Promise<APIResponse<SourceConfig>> {
    try {
      const response = await this.fetch(`/api/sources/${source.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          source: {
            ...source,
            createdAt: source.createdAt.toISOString(),
            updatedAt: source.updatedAt.toISOString(),
            lastSyncAt: source.lastSyncAt?.toISOString(),
          },
          expectedVersion,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Conflit détecté (version mismatch)
        if (response.status === 409) {
          return {
            success: false,
            error: 'Conflict detected',
            conflict: {
              detected: true,
              resolution: errorData.conflict?.resolution || 'manual_required',
              currentVersion: errorData.conflict?.currentVersion,
              serverData: errorData.conflict?.serverData ? {
                ...errorData.conflict.serverData,
                createdAt: new Date(errorData.conflict.serverData.createdAt),
                updatedAt: new Date(errorData.conflict.serverData.updatedAt),
                lastSyncAt: errorData.conflict.serverData.lastSyncAt
                  ? new Date(errorData.conflict.serverData.lastSyncAt)
                  : undefined,
              } : undefined,
            },
          };
        }

        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const updatedSource = {
        ...data.source,
        createdAt: new Date(data.source.createdAt),
        updatedAt: new Date(data.source.updatedAt),
        lastSyncAt: data.source.lastSyncAt ? new Date(data.source.lastSyncAt) : undefined,
      };

      return { success: true, data: updatedSource };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Supprimer une source
   */
  async deleteSource(id: string): Promise<APIResponse<void>> {
    try {
      const response = await this.fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== Sync History ====================

  /**
   * Récupérer l'historique de sync d'une source
   */
  async getSyncHistory(sourceId: string, limit: number = 50): Promise<APIResponse<SyncHistoryEntry[]>> {
    try {
      const response = await this.fetch(`/api/sources/${sourceId}/history?limit=${limit}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const history = data.history.map((h: any) => ({
        ...h,
        startedAt: new Date(h.startedAt),
        finishedAt: new Date(h.finishedAt),
      }));

      return { success: true, data: history };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sauvegarder une entrée d'historique de sync
   */
  async saveSyncHistory(entry: SyncHistoryEntry): Promise<APIResponse<void>> {
    try {
      const response = await this.fetch(`/api/sources/${entry.sourceId}/history`, {
        method: 'POST',
        body: JSON.stringify({
          entry: {
            ...entry,
            startedAt: entry.startedAt.toISOString(),
            finishedAt: entry.finishedAt.toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== Offline Queue ====================

  /**
   * Ajouter une opération à la queue offline (backend)
   */
  async enqueueOperation(queueItem: Omit<SyncQueueItem, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<APIResponse<SyncQueueItem>> {
    try {
      const response = await this.fetch('/api/sync-queue', {
        method: 'POST',
        body: JSON.stringify({ queueItem }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const createdItem = {
        ...data.queueItem,
        createdAt: new Date(data.queueItem.createdAt),
        processedAt: data.queueItem.processedAt ? new Date(data.queueItem.processedAt) : undefined,
      };

      return { success: true, data: createdItem };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Traiter un item de la queue (appel backend process_sync_queue_item)
   */
  async processSyncQueueItem(queueId: string): Promise<APIResponse<any>> {
    try {
      const response = await this.fetch(`/api/sync-queue/${queueId}/process`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data: data.result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Récupérer les items de queue en attente
   */
  async getPendingQueueItems(): Promise<APIResponse<SyncQueueItem[]>> {
    try {
      const response = await this.fetch('/api/sync-queue?status=pending', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const items = data.items.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        processedAt: item.processedAt ? new Date(item.processedAt) : undefined,
      }));

      return { success: true, data: items };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== HTTP Helper ====================

  /**
   * Wrapper fetch avec timeout et auth
   */
  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.config.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      throw error;
    }
  }
}
