/**
 * Tests pour IndexedDBStore - storage IndexedDB
 *
 * Note: Nécessite 'fake-indexeddb' ou environnement jsdom
 * pour simuler IndexedDB en tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDBStore } from '../src/storage/IndexedDBStore';
import type { CartaeItem } from '../src/types';

// Mock IndexedDB si nécessaire
// @vitest-environment jsdom

describe('IndexedDBStore', () => {
  let store: IndexedDBStore;

  const createTestItem = (overrides: Partial<CartaeItem> = {}): CartaeItem => ({
    id: `item-${Date.now()}-${Math.random()}`,
    type: 'email',
    title: 'Test email',
    metadata: {},
    tags: ['test'],
    source: {
      connector: 'office365',
      originalId: `msg-${Date.now()}`,
      lastSync: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    store = new IndexedDBStore({
      dbName: `test-db-${Date.now()}`, // Unique DB pour chaque test
      version: 1,
      storeName: 'items',
    });
    await store.init();
  });

  afterEach(async () => {
    // Cleanup : ne pas échouer si le store est déjà fermé
    try {
      await store.clear();
    } catch {
      // Store peut être déjà fermé par le test
    }
    await store.close();
  });

  describe('Lifecycle', () => {
    it('should initialize correctly', async () => {
      const newStore = new IndexedDBStore();
      await expect(newStore.init()).resolves.not.toThrow();
      await newStore.close();
    });

    it('should close correctly', async () => {
      await expect(store.close()).resolves.not.toThrow();
    });

    it('should throw error if used before init', async () => {
      const uninitStore = new IndexedDBStore();
      await expect(uninitStore.create(createTestItem())).rejects.toThrow(
        'IndexedDBStore not initialized'
      );
    });
  });

  describe('CRUD - Create', () => {
    it('should create an item', async () => {
      const item = createTestItem();
      const created = await store.create(item);

      expect(created).toEqual(item);
    });

    it('should create multiple items', async () => {
      const items = [createTestItem(), createTestItem(), createTestItem()];
      const created = await store.createMany(items);

      expect(created).toHaveLength(3);
      expect(created).toEqual(items);
    });

    it('should fail to create duplicate ID', async () => {
      const item = createTestItem({ id: 'duplicate-123' });

      await store.create(item);
      await expect(store.create(item)).rejects.toThrow();
    });
  });

  describe('CRUD - Read', () => {
    it('should get an item by id', async () => {
      const item = createTestItem({ id: 'get-test-123' });
      await store.create(item);

      const retrieved = await store.get('get-test-123');
      expect(retrieved).toEqual(item);
    });

    it('should return null for non-existent item', async () => {
      const retrieved = await store.get('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should get multiple items by ids', async () => {
      const item1 = createTestItem({ id: 'multi-1' });
      const item2 = createTestItem({ id: 'multi-2' });
      const item3 = createTestItem({ id: 'multi-3' });

      await store.createMany([item1, item2, item3]);

      const retrieved = await store.getMany(['multi-1', 'multi-3']);
      expect(retrieved).toHaveLength(2);
      expect(retrieved.map(i => i.id)).toEqual(['multi-1', 'multi-3']);
    });

    it('should get all items', async () => {
      const items = [createTestItem(), createTestItem(), createTestItem()];
      await store.createMany(items);

      const all = await store.getAll();
      expect(all.length).toBeGreaterThanOrEqual(3);
    });

    it('should check if item exists', async () => {
      const item = createTestItem({ id: 'exists-test' });
      await store.create(item);

      expect(await store.exists('exists-test')).toBe(true);
      expect(await store.exists('non-existent')).toBe(false);
    });
  });

  describe('CRUD - Update', () => {
    it('should update an item', async () => {
      const item = createTestItem({ id: 'update-test', title: 'Original title' });
      await store.create(item);

      const updated = await store.update('update-test', { title: 'Updated title' });

      expect(updated.id).toBe('update-test');
      expect(updated.title).toBe('Updated title');
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });

    it('should preserve non-updated fields', async () => {
      const item = createTestItem({ id: 'preserve-test', title: 'Original', tags: ['tag1'] });
      await store.create(item);

      const updated = await store.update('preserve-test', { title: 'New title' });

      expect(updated.tags).toEqual(['tag1']);
    });

    it('should fail to update non-existent item', async () => {
      await expect(store.update('non-existent', { title: 'Test' })).rejects.toThrow('not found');
    });

    it('should update multiple items', async () => {
      const item1 = createTestItem({ id: 'batch-1', title: 'Item 1' });
      const item2 = createTestItem({ id: 'batch-2', title: 'Item 2' });
      await store.createMany([item1, item2]);

      const updated = await store.updateMany([
        { id: 'batch-1', updates: { title: 'Updated 1' } },
        { id: 'batch-2', updates: { title: 'Updated 2' } },
      ]);

      expect(updated).toHaveLength(2);
      expect(updated[0].title).toBe('Updated 1');
      expect(updated[1].title).toBe('Updated 2');
    });
  });

  describe('CRUD - Delete', () => {
    it('should delete an item', async () => {
      const item = createTestItem({ id: 'delete-test' });
      await store.create(item);

      await store.delete('delete-test');

      const retrieved = await store.get('delete-test');
      expect(retrieved).toBeNull();
    });

    it('should delete multiple items', async () => {
      const items = [
        createTestItem({ id: 'delete-1' }),
        createTestItem({ id: 'delete-2' }),
        createTestItem({ id: 'delete-3' }),
      ];
      await store.createMany(items);

      await store.deleteMany(['delete-1', 'delete-3']);

      expect(await store.exists('delete-1')).toBe(false);
      expect(await store.exists('delete-2')).toBe(true);
      expect(await store.exists('delete-3')).toBe(false);
    });

    it('should clear all items', async () => {
      const items = [createTestItem(), createTestItem(), createTestItem()];
      await store.createMany(items);

      await store.clear();

      const all = await store.getAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('Queries', () => {
    beforeEach(async () => {
      const items = [
        createTestItem({ id: 'query-1', type: 'email', tags: ['urgent', 'work'] }),
        createTestItem({ id: 'query-2', type: 'note', tags: ['personal'] }),
        createTestItem({ id: 'query-3', type: 'email', tags: ['work'] }),
        createTestItem({ id: 'query-4', type: 'task', tags: ['urgent'] }),
      ];
      await store.createMany(items);
    });

    it('should query with where filter', async () => {
      const results = await store.query({
        where: item => item.type === 'email',
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(i => i.type === 'email')).toBe(true);
    });

    it('should query with orderBy', async () => {
      const results = await store.query({
        orderBy: (a, b) => a.id.localeCompare(b.id),
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i].id.localeCompare(results[i - 1].id)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should query with limit', async () => {
      const results = await store.query({
        limit: 2,
      });

      expect(results).toHaveLength(2);
    });

    it('should query with offset and limit (pagination)', async () => {
      const page1 = await store.query({ limit: 2, offset: 0 });
      const page2 = await store.query({ limit: 2, offset: 2 });

      expect(page1).toHaveLength(2);
      expect(page2.length).toBeGreaterThan(0);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should combine where, orderBy, and limit', async () => {
      const results = await store.query({
        where: item => item.type === 'email',
        orderBy: (a, b) => a.id.localeCompare(b.id),
        limit: 1,
      });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('email');
    });
  });

  describe('Indexes', () => {
    beforeEach(async () => {
      const items = [
        createTestItem({
          id: 'idx-1',
          type: 'email',
          tags: ['urgent', 'work'],
          source: { connector: 'office365', originalId: '1', lastSync: new Date() },
        }),
        createTestItem({
          id: 'idx-2',
          type: 'note',
          tags: ['personal'],
          source: { connector: 'google', originalId: '2', lastSync: new Date() },
        }),
        createTestItem({
          id: 'idx-3',
          type: 'email',
          tags: ['work'],
          source: { connector: 'office365', originalId: '3', lastSync: new Date() },
        }),
      ];
      await store.createMany(items);
    });

    it('should get items by tag', async () => {
      const workItems = await store.getByTag('work');
      expect(workItems.length).toBeGreaterThanOrEqual(2);
      expect(workItems.every(i => i.tags.includes('work'))).toBe(true);
    });

    it('should get items by type', async () => {
      const emailItems = await store.getByType('email');
      expect(emailItems.length).toBeGreaterThanOrEqual(2);
      expect(emailItems.every(i => i.type === 'email')).toBe(true);
    });

    it('should get items by connector', async () => {
      const o365Items = await store.getByConnector('office365');
      expect(o365Items.length).toBeGreaterThanOrEqual(2);
      expect(o365Items.every(i => i.source.connector === 'office365')).toBe(true);
    });

    it('should get items by date range', async () => {
      const start = new Date(Date.now() - 1000 * 60); // 1 minute ago
      const end = new Date(Date.now() + 1000 * 60); // 1 minute from now

      const items = await store.getByDateRange(start, end);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should count items', async () => {
      const items = [createTestItem(), createTestItem(), createTestItem()];
      await store.createMany(items);

      const count = await store.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should get storage stats', async () => {
      const items = [createTestItem(), createTestItem()];
      await store.createMany(items);

      const stats = await store.getStats();

      expect(stats.totalItems).toBeGreaterThanOrEqual(2);
      expect(stats.sizeBytes).toBeGreaterThan(0);
      expect(stats.version).toBe(1);
      expect(stats.lastSync).toBeInstanceOf(Date);
    });
  });

  describe('Migrations', () => {
    it('should get current version', async () => {
      const version = await store.getVersion();
      expect(version).toBe(1);
    });

    it('should migrate to new version', async () => {
      const item = createTestItem();
      await store.create(item);

      await store.migrate(2);

      const version = await store.getVersion();
      expect(version).toBe(2);

      // Item should still exist after migration
      const retrieved = await store.get(item.id);
      expect(retrieved).toEqual(item);
    });
  });
});
