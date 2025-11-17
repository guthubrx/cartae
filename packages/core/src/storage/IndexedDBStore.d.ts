/**
 * IndexedDBStore - Implémentation IndexedDB pour storage Cartae
 *
 * Stocke les CartaeItems localement dans le browser avec IndexedDB.
 * Support CRUD, indexes, et migrations.
 *
 * @module storage/IndexedDBStore
 */
import type { CartaeItem } from '../types';
import type { StorageAdapter, QueryOptions, StorageStats } from './StorageAdapter';
/**
 * IndexedDB Configuration
 */
export interface IndexedDBStoreConfig {
    /** Database name */
    dbName?: string;
    /** Current schema version */
    version?: number;
    /** Store name */
    storeName?: string;
}
/**
 * IndexedDBStore - Storage IndexedDB pour CartaeItems
 */
export declare class IndexedDBStore implements StorageAdapter {
    private config;
    private db;
    constructor(config?: IndexedDBStoreConfig);
    init(): Promise<void>;
    close(): Promise<void>;
    create(item: CartaeItem): Promise<CartaeItem>;
    createMany(items: CartaeItem[]): Promise<CartaeItem[]>;
    get(id: string): Promise<CartaeItem | null>;
    getMany(ids: string[]): Promise<CartaeItem[]>;
    getAll(): Promise<CartaeItem[]>;
    query(options: QueryOptions): Promise<CartaeItem[]>;
    update(id: string, updates: Partial<CartaeItem>): Promise<CartaeItem>;
    updateMany(updates: Array<{
        id: string;
        updates: Partial<CartaeItem>;
    }>): Promise<CartaeItem[]>;
    delete(id: string): Promise<void>;
    deleteMany(ids: string[]): Promise<void>;
    clear(): Promise<void>;
    getByTag(tag: string): Promise<CartaeItem[]>;
    getByConnector(connector: string): Promise<CartaeItem[]>;
    getByType(type: string): Promise<CartaeItem[]>;
    getByDateRange(start: Date, end: Date): Promise<CartaeItem[]>;
    count(): Promise<number>;
    getStats(): Promise<StorageStats>;
    exists(id: string): Promise<boolean>;
    getVersion(): Promise<number>;
    migrate(targetVersion: number): Promise<void>;
    private assertDB;
}
//# sourceMappingURL=IndexedDBStore.d.ts.map