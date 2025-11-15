/**
 * Tests - Cache Policies (CacheManager + SmartCache)
 *
 * @module storage/__tests__/cache-policies.test.ts
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CacheManager } from '../CacheManager';
import { SmartCache } from '../SmartCache';
import type { CartaeItem } from '../../types';
import { DEFAULT_CACHE_CONFIG, MINIMAL_CACHE_CONFIG } from '../CacheConfig';

// ==========================================================================
// Test Helpers
// ==========================================================================

function createMockItem(overrides: Partial<CartaeItem> = {}): CartaeItem {
  return {
    id: `item-${Math.random()}`,
    title: 'Test Item',
    content: 'Test content',
    type: 'email',
    connector: 'test',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: {},
    ...overrides,
  };
}

// ==========================================================================
// CacheManager Tests
// ==========================================================================

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager(MINIMAL_CACHE_CONFIG); // Petite config pour tests rapides
  });

  // ========================================================================
  // Quotas & Limits
  // ========================================================================

  test('canAdd() retourne true si quotas respectés', () => {
    const item = createMockItem({ type: 'email' });
    expect(cacheManager.canAdd(item)).toBe(true);
  });

  test('canAdd() retourne false si limite globale items atteinte', () => {
    // Config: maxItems = 100
    // Ajouter 100 items
    for (let i = 0; i < 100; i++) {
      const item = createMockItem({ id: `item-${i}` });
      cacheManager.add(item);
    }

    // 101ème item devrait être refusé
    const newItem = createMockItem({ id: 'item-101' });
    expect(cacheManager.canAdd(newItem)).toBe(false);
  });

  test('canAdd() retourne false si quota type atteint', () => {
    // Config: emails maxItems = 60
    // Ajouter 60 emails
    for (let i = 0; i < 60; i++) {
      const item = createMockItem({ id: `email-${i}`, type: 'email' });
      cacheManager.add(item);
    }

    // 61ème email devrait être refusé
    const newEmail = createMockItem({ id: 'email-61', type: 'email' });
    expect(cacheManager.canAdd(newEmail)).toBe(false);

    // Mais task devrait passer (quota indépendant)
    const task = createMockItem({ id: 'task-1', type: 'task' });
    expect(cacheManager.canAdd(task)).toBe(true);
  });

  // ========================================================================
  // LRU Eviction
  // ========================================================================

  test('getItemsToEvict() retourne items LRU (Least Recently Used)', () => {
    // Ajouter 5 items
    const items = [
      createMockItem({ id: 'item-1' }),
      createMockItem({ id: 'item-2' }),
      createMockItem({ id: 'item-3' }),
      createMockItem({ id: 'item-4' }),
      createMockItem({ id: 'item-5' }),
    ];

    items.forEach((item) => cacheManager.add(item));

    // Accéder à item-3 et item-5 (les rendre "récents")
    cacheManager.touch('item-3');
    cacheManager.touch('item-5');

    // Attendre 10ms pour que lastAccessedAt change
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    return wait(10).then(() => {
      // Accéder encore à item-3
      cacheManager.touch('item-3');

      // Évincer 2 items
      const toEvict = cacheManager.getItemsToEvict(2);

      // Les 2 items les moins récents devraient être item-1 et item-2
      expect(toEvict).toHaveLength(2);
      expect(toEvict).toContain('item-1');
      expect(toEvict).toContain('item-2');
      expect(toEvict).not.toContain('item-3'); // Accédé récemment
      expect(toEvict).not.toContain('item-5'); // Accédé récemment
    });
  });

  // ========================================================================
  // Pruning
  // ========================================================================

  test('prune() supprime items trop vieux (> maxAgeDays)', async () => {
    // Config: maxAgeDays = 7 jours
    const sevenDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 jours

    // Ajouter item ancien
    const oldItem = createMockItem({ id: 'old-item', createdAt: sevenDaysAgo });
    cacheManager.add(oldItem);

    // Simuler dernier accès il y a 8 jours
    const metadata = cacheManager.getMetadata('old-item');
    if (metadata) {
      metadata.lastAccessedAt = sevenDaysAgo;
    }

    // Ajouter item récent
    const recentItem = createMockItem({ id: 'recent-item' });
    cacheManager.add(recentItem);

    // Pruning devrait supprimer seulement old-item
    const evicted = await cacheManager.prune();
    expect(evicted).toContain('old-item');
    expect(evicted).not.toContain('recent-item');
  });

  test('prune() évince 10% si utilization > threshold', async () => {
    // Config: pruneThreshold = 0.85, maxItems = 100
    // Ajouter 90 items (90% utilisation > 85%)
    for (let i = 0; i < 90; i++) {
      const item = createMockItem({ id: `item-${i}` });
      cacheManager.add(item);
    }

    const stats = cacheManager.getStats();
    expect(stats.utilization).toBeGreaterThan(0.85);

    // Pruning devrait évincer ~9 items (10% de 90)
    const evicted = await cacheManager.prune();
    expect(evicted.length).toBeGreaterThanOrEqual(9);
  });

  // ========================================================================
  // Stats
  // ========================================================================

  test('getStats() retourne statistiques correctes', () => {
    // Ajouter items de différents types
    cacheManager.add(createMockItem({ id: 'email-1', type: 'email' }));
    cacheManager.add(createMockItem({ id: 'email-2', type: 'email' }));
    cacheManager.add(createMockItem({ id: 'task-1', type: 'task' }));

    const stats = cacheManager.getStats();

    expect(stats.totalItems).toBe(3);
    expect(stats.byType.email.count).toBe(2);
    expect(stats.byType.task.count).toBe(1);
    expect(stats.utilization).toBe(3 / 100); // maxItems = 100
  });

  test('touch() met à jour hit/miss stats', () => {
    const item = createMockItem({ id: 'test-item' });
    cacheManager.add(item);

    // Touch item existant → hit
    cacheManager.touch('test-item');
    expect(cacheManager.getStats().hits).toBe(1);
    expect(cacheManager.getStats().misses).toBe(0);

    // Touch item inexistant → miss
    cacheManager.touch('unknown-item');
    expect(cacheManager.getStats().hits).toBe(1);
    expect(cacheManager.getStats().misses).toBe(1);

    // Hit rate devrait être 0.5 (1 hit / 2 total)
    expect(cacheManager.getStats().hitRate).toBe(0.5);
  });
});

// ==========================================================================
// SmartCache Tests
// ==========================================================================

describe('SmartCache', () => {
  let cacheManager: CacheManager;
  let smartCache: SmartCache;

  beforeEach(() => {
    cacheManager = new CacheManager(DEFAULT_CACHE_CONFIG);
    smartCache = new SmartCache(cacheManager);
  });

  // ========================================================================
  // Priority Scoring
  // ========================================================================

  test('calculatePriority() donne score élevé pour items unread', () => {
    const unreadItem = createMockItem({
      id: 'unread',
      metadata: { unread: true },
    });

    const normalItem = createMockItem({
      id: 'normal',
      metadata: { unread: false },
    });

    const unreadScore = smartCache.calculatePriority(unreadItem);
    const normalScore = smartCache.calculatePriority(normalItem);

    expect(unreadScore.total).toBeGreaterThan(normalScore.total);
    expect(unreadScore.breakdown.status).toBeGreaterThanOrEqual(50); // +50 pour unread
  });

  test('calculatePriority() donne score élevé pour items starred', () => {
    const starredItem = createMockItem({
      id: 'starred',
      metadata: { starred: true },
    });

    const normalItem = createMockItem({
      id: 'normal',
      metadata: { starred: false },
    });

    const starredScore = smartCache.calculatePriority(starredItem);
    const normalScore = smartCache.calculatePriority(normalItem);

    expect(starredScore.total).toBeGreaterThan(normalScore.total);
    expect(starredScore.breakdown.status).toBeGreaterThanOrEqual(40); // +40 pour starred
  });

  test('calculatePriority() pénalise items archivés', () => {
    const archivedItem = createMockItem({
      id: 'archived',
      metadata: { archived: true },
    });

    const normalItem = createMockItem({
      id: 'normal',
      metadata: { archived: false },
    });

    const archivedScore = smartCache.calculatePriority(archivedItem);
    const normalScore = smartCache.calculatePriority(normalItem);

    expect(archivedScore.total).toBeLessThan(normalScore.total);
    expect(archivedScore.breakdown.status).toBeLessThanOrEqual(-60); // -60 pour archived
  });

  test('calculatePriority() pénalise items vieux', () => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const oldItem = createMockItem({
      id: 'old',
      createdAt: thirtyDaysAgo,
    });

    const recentItem = createMockItem({
      id: 'recent',
      createdAt: now,
    });

    const oldScore = smartCache.calculatePriority(oldItem);
    const recentScore = smartCache.calculatePriority(recentItem);

    expect(oldScore.total).toBeLessThan(recentScore.total);
    expect(oldScore.breakdown.age).toBeLessThan(0); // Pénalité age négative
  });

  // ========================================================================
  // Sorting by Priority
  // ========================================================================

  test('sortByPriority() trie items par score décroissant', () => {
    const items = [
      createMockItem({ id: 'normal', metadata: {} }),
      createMockItem({ id: 'starred', metadata: { starred: true } }),
      createMockItem({ id: 'archived', metadata: { archived: true } }),
      createMockItem({ id: 'unread', metadata: { unread: true } }),
    ];

    const sorted = smartCache.sortByPriority(items);

    // Ordre attendu : unread > starred > normal > archived
    expect(sorted[0].id).toBe('unread');
    expect(sorted[1].id).toBe('starred');
    expect(sorted[2].id).toBe('normal');
    expect(sorted[3].id).toBe('archived');
  });

  // ========================================================================
  // Hot/Cold Data
  // ========================================================================

  test('identifyHotData() trouve items chauds (score > 50)', () => {
    const items = [
      createMockItem({ id: 'hot', metadata: { unread: true } }), // Score > 50
      createMockItem({ id: 'cold', metadata: { archived: true } }), // Score < 20
    ];

    const hotItems = smartCache.identifyHotData(items);

    expect(hotItems).toHaveLength(1);
    expect(hotItems[0].id).toBe('hot');
  });

  test('identifyColdData() trouve items froids (score < 20, vieux)', () => {
    const now = Date.now();
    const oldDate = now - 40 * 24 * 60 * 60 * 1000; // 40 jours

    const items = [
      createMockItem({
        id: 'cold',
        createdAt: oldDate,
        metadata: { archived: true, lastAccessedAt: oldDate },
      }),
      createMockItem({ id: 'hot', metadata: { unread: true } }),
    ];

    const coldItems = smartCache.identifyColdData(items);

    expect(coldItems).toHaveLength(1);
    expect(coldItems[0].id).toBe('cold');
  });
});
