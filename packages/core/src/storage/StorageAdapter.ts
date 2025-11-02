/**
 * StorageAdapter - Interface pour storage Cartae
 *
 * Définit le contrat que tous les storage backends doivent respecter.
 * Permet de swapper facilement entre IndexedDB, LocalStorage, cloud, etc.
 *
 * @module storage/StorageAdapter
 */

import type { CartaeItem } from '../types';

/**
 * Query options pour filtrer/trier
 */
export interface QueryOptions {
  /** Filtre (predicate function) */
  where?: (item: CartaeItem) => boolean;

  /** Tri (comparator function) */
  orderBy?: (a: CartaeItem, b: CartaeItem) => number;

  /** Limit résultats */
  limit?: number;

  /** Offset (pagination) */
  offset?: number;
}

/**
 * Storage Statistics
 */
export interface StorageStats {
  /** Total items */
  totalItems: number;

  /** Storage size (bytes) */
  sizeBytes: number;

  /** Database version */
  version: number;

  /** Last sync timestamp */
  lastSync?: Date;
}

/**
 * StorageAdapter - Interface storage
 *
 * Toutes les méthodes sont async (compatibilité IndexedDB).
 */
export interface StorageAdapter {
  // ===== Lifecycle =====

  /**
   * Initialize storage
   * Appelé au démarrage de l'app
   */
  init(): Promise<void>;

  /**
   * Close storage connection
   * Appelé à la fermeture de l'app
   */
  close(): Promise<void>;

  // ===== CRUD Operations =====

  /**
   * Create un item
   * @throws Si item.id existe déjà
   */
  create(item: CartaeItem): Promise<CartaeItem>;

  /**
   * Create plusieurs items en bulk
   */
  createMany(items: CartaeItem[]): Promise<CartaeItem[]>;

  /**
   * Get un item par ID
   * @returns Item ou null si pas trouvé
   */
  get(id: string): Promise<CartaeItem | null>;

  /**
   * Get plusieurs items par IDs
   */
  getMany(ids: string[]): Promise<CartaeItem[]>;

  /**
   * Get tous les items
   */
  getAll(): Promise<CartaeItem[]>;

  /**
   * Query items avec options
   */
  query(options: QueryOptions): Promise<CartaeItem[]>;

  /**
   * Update un item
   * @throws Si item pas trouvé
   */
  update(id: string, updates: Partial<CartaeItem>): Promise<CartaeItem>;

  /**
   * Update plusieurs items en bulk
   */
  updateMany(updates: Array<{ id: string; updates: Partial<CartaeItem> }>): Promise<CartaeItem[]>;

  /**
   * Delete un item
   * @throws Si item pas trouvé
   */
  delete(id: string): Promise<void>;

  /**
   * Delete plusieurs items en bulk
   */
  deleteMany(ids: string[]): Promise<void>;

  /**
   * Clear ALL items (⚠️ dangereux)
   */
  clear(): Promise<void>;

  // ===== Indexes & Search =====

  /**
   * Get items par tag
   */
  getByTag(tag: string): Promise<CartaeItem[]>;

  /**
   * Get items par connector
   */
  getByConnector(connector: string): Promise<CartaeItem[]>;

  /**
   * Get items par type
   */
  getByType(type: string): Promise<CartaeItem[]>;

  /**
   * Get items par date range
   */
  getByDateRange(start: Date, end: Date): Promise<CartaeItem[]>;

  // ===== Stats & Utilities =====

  /**
   * Compter les items
   */
  count(): Promise<number>;

  /**
   * Get storage statistics
   */
  getStats(): Promise<StorageStats>;

  /**
   * Check si un item existe
   */
  exists(id: string): Promise<boolean>;

  // ===== Migrations =====

  /**
   * Get current schema version
   */
  getVersion(): Promise<number>;

  /**
   * Run migrations (si nécessaire)
   */
  migrate(targetVersion: number): Promise<void>;
}
