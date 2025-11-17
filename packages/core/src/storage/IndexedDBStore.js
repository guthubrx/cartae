/**
 * IndexedDBStore - Implémentation IndexedDB pour storage Cartae
 *
 * Stocke les CartaeItems localement dans le browser avec IndexedDB.
 * Support CRUD, indexes, et migrations.
 *
 * @module storage/IndexedDBStore
 */
/**
 * IndexedDBStore - Storage IndexedDB pour CartaeItems
 */
export class IndexedDBStore {
    config;
    db = null;
    constructor(config = {}) {
        this.config = {
            dbName: config.dbName ?? 'cartae-db',
            version: config.version ?? 1,
            storeName: config.storeName ?? 'items',
        };
    }
    // ===== Lifecycle =====
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.dbName, this.config.version);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = event => {
                const db = event.target.result;
                // Create object store si n'existe pas
                if (!db.objectStoreNames.contains(this.config.storeName)) {
                    const store = db.createObjectStore(this.config.storeName, { keyPath: 'id' });
                    // Indexes
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                    store.createIndex('updatedAt', 'updatedAt', { unique: false });
                    store.createIndex('connector', 'source.connector', { unique: false });
                }
            };
        });
    }
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
    // ===== CRUD Operations =====
    async create(item) {
        this.assertDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readwrite');
            const store = tx.objectStore(this.config.storeName);
            const request = store.add(item);
            request.onsuccess = () => resolve(item);
            request.onerror = () => reject(request.error);
        });
    }
    async createMany(items) {
        this.assertDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readwrite');
            const store = tx.objectStore(this.config.storeName);
            const promises = items.map(item => new Promise((res, rej) => {
                const req = store.add(item);
                req.onsuccess = () => res();
                req.onerror = () => rej(req.error);
            }));
            Promise.all(promises)
                .then(() => resolve(items))
                .catch(reject);
        });
    }
    async get(id) {
        this.assertDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readonly');
            const store = tx.objectStore(this.config.storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
    async getMany(ids) {
        const results = await Promise.all(ids.map(id => this.get(id)));
        return results.filter((item) => item !== null);
    }
    async getAll() {
        this.assertDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readonly');
            const store = tx.objectStore(this.config.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async query(options) {
        let items = await this.getAll();
        // Apply filter
        if (options.where) {
            items = items.filter(options.where);
        }
        // Apply sort
        if (options.orderBy) {
            items.sort(options.orderBy);
        }
        // Apply pagination
        const start = options.offset ?? 0;
        const end = options.limit ? start + options.limit : items.length;
        return items.slice(start, end);
    }
    async update(id, updates) {
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`Item ${id} not found`);
        }
        const updated = {
            ...existing,
            ...updates,
            id, // Preserve ID
            updatedAt: new Date(),
        };
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readwrite');
            const store = tx.objectStore(this.config.storeName);
            const request = store.put(updated);
            request.onsuccess = () => resolve(updated);
            request.onerror = () => reject(request.error);
        });
    }
    async updateMany(updates) {
        return Promise.all(updates.map(u => this.update(u.id, u.updates)));
    }
    async delete(id) {
        this.assertDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readwrite');
            const store = tx.objectStore(this.config.storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async deleteMany(ids) {
        await Promise.all(ids.map(id => this.delete(id)));
    }
    async clear() {
        this.assertDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readwrite');
            const store = tx.objectStore(this.config.storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    // ===== Indexes & Search =====
    async getByTag(tag) {
        this.assertDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readonly');
            const store = tx.objectStore(this.config.storeName);
            const index = store.index('tags');
            const request = index.getAll(tag);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getByConnector(connector) {
        this.assertDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readonly');
            const store = tx.objectStore(this.config.storeName);
            const index = store.index('connector');
            const request = index.getAll(connector);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getByType(type) {
        this.assertDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readonly');
            const store = tx.objectStore(this.config.storeName);
            const index = store.index('type');
            const request = index.getAll(type);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getByDateRange(start, end) {
        const all = await this.getAll();
        return all.filter(item => item.createdAt >= start && item.createdAt <= end);
    }
    // ===== Stats & Utilities =====
    async count() {
        this.assertDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.config.storeName], 'readonly');
            const store = tx.objectStore(this.config.storeName);
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getStats() {
        const totalItems = await this.count();
        // Estimate size (approximation)
        const items = await this.getAll();
        const sizeBytes = new Blob([JSON.stringify(items)]).size;
        return {
            totalItems,
            sizeBytes,
            version: this.config.version,
            lastSync: new Date(),
        };
    }
    async exists(id) {
        const item = await this.get(id);
        return item !== null;
    }
    // ===== Migrations =====
    async getVersion() {
        return this.config.version;
    }
    async migrate(targetVersion) {
        // Close current connection
        await this.close();
        // Reopen with new version (will trigger onupgradeneeded)
        this.config.version = targetVersion;
        await this.init();
    }
    // ===== Private Helpers =====
    assertDB() {
        if (!this.db) {
            throw new Error('IndexedDBStore not initialized. Call init() first.');
        }
    }
}
//# sourceMappingURL=IndexedDBStore.js.map