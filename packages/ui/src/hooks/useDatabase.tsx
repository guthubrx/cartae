/**
 * useDatabase - Hook React pour gérer HybridStore
 *
 * Fournit accès au storage hybride (IndexedDB + PostgreSQL)
 * avec sync automatique et état de connexion
 *
 * @module hooks/useDatabase
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { HybridStore, DatabaseClient, IndexedDBStore } from '@cartae/core';
import type { SyncStats } from '@cartae/core';

/**
 * Configuration DB (stockée dans localStorage)
 */
export interface DatabaseConfig {
  /** URL API database (ex: http://localhost:3001) */
  baseUrl: string;

  /** Auto-sync activé ? */
  autoSync: boolean;

  /** Interval sync (ms) */
  syncInterval: number;
}

/**
 * Database Context State
 */
interface DatabaseContextState {
  /** HybridStore instance */
  store: HybridStore | null;

  /** Config DB actuelle */
  config: DatabaseConfig;

  /** Connexion PostgreSQL active ? */
  isConnected: boolean;

  /** Sync en cours ? */
  isSyncing: boolean;

  /** Stats de sync */
  syncStats: SyncStats | null;

  /** Set nouvelle config */
  setConfig: (config: Partial<DatabaseConfig>) => void;

  /** Force sync manuel */
  forceSync: () => Promise<void>;

  /** Test connexion */
  testConnection: () => Promise<boolean>;
}

const DatabaseContext = createContext<DatabaseContextState | undefined>(undefined);

/**
 * Default config
 */
const DEFAULT_CONFIG: DatabaseConfig = {
  baseUrl: 'http://localhost:3001',
  autoSync: true,
  syncInterval: 60000, // 60s
};

/**
 * DatabaseProvider - Context provider pour database
 *
 * À wrapper autour de l'app React
 *
 * @example
 * <DatabaseProvider>
 *   <App />
 * </DatabaseProvider>
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<DatabaseConfig>(() => {
    // Load config depuis localStorage
    const stored = localStorage.getItem('cartae:database:config');
    return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
  });

  const [store, setStore] = useState<HybridStore | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);

  /**
   * Set config et persist dans localStorage
   */
  const setConfig = (newConfig: Partial<DatabaseConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfigState(updated);
    localStorage.setItem('cartae:database:config', JSON.stringify(updated));
  };

  /**
   * Init HybridStore
   */
  useEffect(() => {
    let mounted = true;

    const initStore = async () => {
      try {
        // Create DatabaseClient
        const client = new DatabaseClient({
          baseUrl: config.baseUrl,
          timeout: 5000,
          retries: 2,
        });

        // Create IndexedDB store
        const indexedDB = new IndexedDBStore();

        // Create HybridStore
        const hybridStore = new HybridStore({
          databaseClient: client,
          indexedDBStore: indexedDB,
          autoSync: config.autoSync,
          syncInterval: config.syncInterval,
          syncOnInit: true,
        });

        // Init
        await hybridStore.init();

        if (!mounted) return;

        setStore(hybridStore);

        // Test connexion PostgreSQL
        const connected = await client.testConnection();
        setIsConnected(connected);

        // Update sync stats périodiquement
        const statsInterval = setInterval(() => {
          if (hybridStore) {
            setSyncStats(hybridStore.getSyncStats());
          }
        }, 5000);

        return () => {
          clearInterval(statsInterval);
          hybridStore.close();
        };
      } catch (error) {
        console.error('Failed to init HybridStore:', error);
        setIsConnected(false);
      }
    };

    initStore();

    return () => {
      mounted = false;
    };
  }, [config.baseUrl, config.autoSync, config.syncInterval]);

  /**
   * Update sync state depuis store
   */
  useEffect(() => {
    if (!store) return;

    const interval = setInterval(() => {
      const stats = store.getSyncStats();
      setSyncStats(stats);
      setIsSyncing(stats.isSyncing);
    }, 1000);

    return () => clearInterval(interval);
  }, [store]);

  /**
   * Force sync manuel
   */
  const forceSync = async () => {
    if (!store) {
      throw new Error('Store not initialized');
    }

    setIsSyncing(true);
    try {
      await store.forceSync();
    } finally {
      setIsSyncing(false);
      setSyncStats(store.getSyncStats());
    }
  };

  /**
   * Test connexion PostgreSQL
   */
  const testConnection = async (): Promise<boolean> => {
    if (!store) return false;

    const client = new DatabaseClient({ baseUrl: config.baseUrl });
    const connected = await client.testConnection();
    setIsConnected(connected);
    return connected;
  };

  return (
    <DatabaseContext.Provider
      value={{
        store,
        config,
        isConnected,
        isSyncing,
        syncStats,
        setConfig,
        forceSync,
        testConnection,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

/**
 * Hook useDatabase
 *
 * Donne accès au context database
 *
 * @example
 * const { store, isConnected, forceSync } = useDatabase();
 *
 * // Use store
 * await store.create(item);
 *
 * // Force sync
 * await forceSync();
 */
export function useDatabase() {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }

  return context;
}
