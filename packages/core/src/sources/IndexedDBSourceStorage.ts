/**
 * IndexedDBSourceStorage - Stockage des sources dans IndexedDB
 *
 * Implémente l'interface SourceStorage avec IndexedDB pour persister :
 * - Les configurations de sources
 * - L'historique de synchronisation
 */

import type { SourceStorage } from './SourceManager';
import type { SourceConfig, SyncHistoryEntry } from './types';

/**
 * Nom de la base de données IndexedDB
 */
const DB_NAME = 'CartaeSourcesDB';
const DB_VERSION = 1;

/**
 * Noms des object stores
 */
const SOURCES_STORE = 'sources';
const SYNC_HISTORY_STORE = 'syncHistory';

/**
 * Implémentation IndexedDB du SourceStorage
 */
export class IndexedDBSourceStorage implements SourceStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initialize();
  }

  /**
   * Initialiser la base de données IndexedDB
   */
  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Erreur ouverture IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Object store pour les sources
        if (!db.objectStoreNames.contains(SOURCES_STORE)) {
          const sourcesStore = db.createObjectStore(SOURCES_STORE, { keyPath: 'id' });
          sourcesStore.createIndex('connectorType', 'connectorType', { unique: false });
          sourcesStore.createIndex('status', 'status', { unique: false });
          sourcesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Object store pour l'historique de sync
        if (!db.objectStoreNames.contains(SYNC_HISTORY_STORE)) {
          const historyStore = db.createObjectStore(SYNC_HISTORY_STORE, { keyPath: 'id' });
          historyStore.createIndex('sourceId', 'sourceId', { unique: false });
          historyStore.createIndex('startedAt', 'startedAt', { unique: false });
          historyStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  /**
   * S'assurer que la DB est initialisée
   */
  private async ensureInitialized(): Promise<IDBDatabase> {
    await this.initPromise;
    if (!this.db) {
      throw new Error('IndexedDB non initialisée');
    }
    return this.db;
  }

  // ==================== CRUD Sources ====================

  /**
   * Récupérer toutes les sources
   */
  async getAllSources(): Promise<SourceConfig[]> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SOURCES_STORE, 'readonly');
      const store = transaction.objectStore(SOURCES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const sources = request.result.map((source: any) => ({
          ...source,
          createdAt: new Date(source.createdAt),
          updatedAt: new Date(source.updatedAt),
          lastSyncAt: source.lastSyncAt ? new Date(source.lastSyncAt) : undefined,
        }));
        resolve(sources);
      };

      request.onerror = () => {
        reject(new Error(`Erreur getAllSources: ${request.error?.message}`));
      };
    });
  }

  /**
   * Récupérer une source par ID
   */
  async getSource(id: string): Promise<SourceConfig | null> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SOURCES_STORE, 'readonly');
      const store = transaction.objectStore(SOURCES_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        if (!request.result) {
          resolve(null);
          return;
        }

        const source = {
          ...request.result,
          createdAt: new Date(request.result.createdAt),
          updatedAt: new Date(request.result.updatedAt),
          lastSyncAt: request.result.lastSyncAt
            ? new Date(request.result.lastSyncAt)
            : undefined,
        };
        resolve(source);
      };

      request.onerror = () => {
        reject(new Error(`Erreur getSource: ${request.error?.message}`));
      };
    });
  }

  /**
   * Sauvegarder une source (create ou update)
   */
  async saveSource(source: SourceConfig): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SOURCES_STORE, 'readwrite');
      const store = transaction.objectStore(SOURCES_STORE);

      // Convertir les dates en ISO strings pour IndexedDB
      const sourceToSave = {
        ...source,
        createdAt: source.createdAt.toISOString(),
        updatedAt: source.updatedAt.toISOString(),
        lastSyncAt: source.lastSyncAt?.toISOString(),
      };

      const request = store.put(sourceToSave);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Erreur saveSource: ${request.error?.message}`));
      };
    });
  }

  /**
   * Supprimer une source
   */
  async deleteSource(id: string): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [SOURCES_STORE, SYNC_HISTORY_STORE],
        'readwrite'
      );

      // Supprimer la source
      const sourcesStore = transaction.objectStore(SOURCES_STORE);
      const deleteSourceRequest = sourcesStore.delete(id);

      deleteSourceRequest.onerror = () => {
        reject(new Error(`Erreur deleteSource: ${deleteSourceRequest.error?.message}`));
      };

      // Supprimer l'historique associé
      const historyStore = transaction.objectStore(SYNC_HISTORY_STORE);
      const index = historyStore.index('sourceId');
      const historyRequest = index.openCursor(IDBKeyRange.only(id));

      historyRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error(`Erreur transaction deleteSource: ${transaction.error?.message}`));
      };
    });
  }

  // ==================== Sync History ====================

  /**
   * Récupérer l'historique de synchronisation d'une source
   */
  async getSyncHistory(sourceId: string, limit: number = 50): Promise<SyncHistoryEntry[]> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SYNC_HISTORY_STORE, 'readonly');
      const store = transaction.objectStore(SYNC_HISTORY_STORE);
      const index = store.index('sourceId');

      const request = index.openCursor(IDBKeyRange.only(sourceId), 'prev'); // Ordre inverse (plus récent en premier)
      const results: SyncHistoryEntry[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && results.length < limit) {
          const entry = {
            ...cursor.value,
            startedAt: new Date(cursor.value.startedAt),
            finishedAt: new Date(cursor.value.finishedAt),
          };
          results.push(entry);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new Error(`Erreur getSyncHistory: ${request.error?.message}`));
      };
    });
  }

  /**
   * Sauvegarder une entrée d'historique de sync
   */
  async saveSyncHistory(entry: SyncHistoryEntry): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SYNC_HISTORY_STORE, 'readwrite');
      const store = transaction.objectStore(SYNC_HISTORY_STORE);

      // Convertir les dates en ISO strings
      const entryToSave = {
        ...entry,
        startedAt: entry.startedAt.toISOString(),
        finishedAt: entry.finishedAt.toISOString(),
      };

      const request = store.add(entryToSave);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Erreur saveSyncHistory: ${request.error?.message}`));
      };
    });
  }

  // ==================== Cleanup ====================

  /**
   * Nettoyer l'ancien historique de sync (garder seulement les N dernières entrées)
   */
  async cleanupOldHistory(sourceId: string, keepLast: number = 100): Promise<void> {
    const db = await this.ensureInitialized();
    const allHistory = await this.getSyncHistory(sourceId, 9999);

    if (allHistory.length <= keepLast) {
      return Promise.resolve(); // Pas besoin de nettoyer
    }

    const toDelete = allHistory.slice(keepLast); // Garder les keepLast premiers (plus récents)

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(SYNC_HISTORY_STORE, 'readwrite');
      const store = transaction.objectStore(SYNC_HISTORY_STORE);

      for (const entry of toDelete) {
        store.delete(entry.id);
      }

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error(`Erreur cleanupOldHistory: ${transaction.error?.message}`));
      };
    });
  }

  /**
   * Fermer la connexion IndexedDB
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
