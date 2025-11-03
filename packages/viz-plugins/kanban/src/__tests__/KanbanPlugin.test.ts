import { describe, it, expect, beforeEach } from 'vitest';
import type { CartaeItem } from '@cartae/core';
import { KanbanPlugin } from '../KanbanPlugin';

describe('KanbanPlugin', () => {
  let plugin: KanbanPlugin;
  let mockItems: CartaeItem[];

  beforeEach(() => {
    plugin = new KanbanPlugin();
    mockItems = [
      {
        id: 'item-1',
        title: 'Task 1',
        content: 'Content 1',
        type: 'task',
        source: { connector: 'test', originalId: 'test-1', lastSync: new Date() },
        tags: ['backlog'],
        metadata: { status: 'new', priority: 'high' },
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
      {
        id: 'item-2',
        title: 'Task 2',
        content: 'Content 2',
        type: 'task',
        source: { connector: 'test', originalId: 'test-2', lastSync: new Date() },
        tags: ['in-progress'],
        metadata: { status: 'in_progress', priority: 'medium' },
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
      },
      {
        id: 'item-3',
        title: 'Task 3',
        content: 'Content 3',
        type: 'task',
        source: { connector: 'test', originalId: 'test-3', lastSync: new Date() },
        tags: ['done'],
        metadata: { status: 'completed', priority: 'low' },
        createdAt: new Date('2025-01-03'),
        updatedAt: new Date('2025-01-03'),
      },
    ];
  });

  describe('transform', () => {
    it('should transform CartaeItems into KanbanBoard', () => {
      const board = plugin.transform(mockItems);

      expect(board.columns).toHaveLength(4);
      expect(board.totalCards).toBe(3);
      expect(board.lastUpdated).toBeInstanceOf(Date);
    });

    it('should organize cards into correct columns', () => {
      const board = plugin.transform(mockItems);

      const backlog = board.columns.find((c) => c.id === 'backlog');
      const inProgress = board.columns.find((c) => c.id === 'in_progress');
      const done = board.columns.find((c) => c.id === 'done');

      expect(backlog?.cards).toHaveLength(1);
      expect(inProgress?.cards).toHaveLength(1);
      expect(done?.cards).toHaveLength(1);
    });

    it('should sort cards by priority then date', () => {
      const items: CartaeItem[] = [
        { ...mockItems[0], metadata: { priority: 'low' }, updatedAt: new Date('2025-01-05') },
        { ...mockItems[0], metadata: { priority: 'urgent' }, updatedAt: new Date('2025-01-03') },
        { ...mockItems[0], metadata: { priority: 'high' }, updatedAt: new Date('2025-01-04') },
      ];

      const board = plugin.transform(items);
      const backlogCards = board.columns.find((c) => c.id === 'backlog')?.cards || [];

      expect(backlogCards[0].priority).toBe('urgent');
      expect(backlogCards[1].priority).toBe('high');
      expect(backlogCards[2].priority).toBe('low');
    });
  });

  describe('filters', () => {
    it('should filter by tags', () => {
      plugin.transform(mockItems);
      plugin.setFilters({ tags: ['in-progress'] });

      const board = plugin.transform(mockItems);
      expect(board.totalCards).toBe(1);
    });

    it('should filter by priority', () => {
      plugin.transform(mockItems);
      plugin.setFilters({ priority: ['high'] });

      const board = plugin.transform(mockItems);
      expect(board.totalCards).toBe(1);
    });

    it('should filter by search query', () => {
      plugin.transform(mockItems);
      plugin.setFilters({ search: 'Task 2' });

      const board = plugin.transform(mockItems);
      expect(board.totalCards).toBe(1);
    });

    it('should clear filters', () => {
      plugin.setFilters({ tags: ['in-progress'] });
      plugin.clearFilters();

      const board = plugin.transform(mockItems);
      expect(board.totalCards).toBe(3);
    });
  });

  describe('moveCard', () => {
    it('should move card to new status', () => {
      plugin.transform(mockItems);
      const movedCard = plugin.moveCard('item-1', 'done');

      expect(movedCard).not.toBeNull();
      expect(movedCard?.status).toBe('done');
      expect(movedCard?.originalItem.metadata?.status).toBe('done');
    });

    it('should return null for non-existent card', () => {
      plugin.transform(mockItems);
      const result = plugin.moveCard('non-existent', 'done');

      expect(result).toBeNull();
    });

    it('should update updatedAt timestamp', () => {
      plugin.transform(mockItems);
      const beforeMove = new Date();
      const movedCard = plugin.moveCard('item-1', 'done');

      expect(movedCard?.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeMove.getTime());
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      plugin.transform(mockItems);
      const stats = plugin.getStats();

      expect(stats.totalCards).toBe(3);
      expect(stats.byStatus.backlog).toBe(1);
      expect(stats.byStatus.in_progress).toBe(1);
      expect(stats.byStatus.done).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.low).toBe(1);
    });
  });

  describe('searchCards', () => {
    it('should search by title', () => {
      plugin.transform(mockItems);
      const results = plugin.searchCards('Task 1');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Task 1');
    });

    it('should search by content', () => {
      plugin.transform(mockItems);
      const results = plugin.searchCards('Content 2');

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Content 2');
    });

    it('should be case insensitive', () => {
      plugin.transform(mockItems);
      const results = plugin.searchCards('TASK 1');

      expect(results).toHaveLength(1);
    });
  });

  describe('getCardsByStatus', () => {
    it('should return cards for specific status', () => {
      plugin.transform(mockItems);
      const backlogCards = plugin.getCardsByStatus('backlog');

      expect(backlogCards).toHaveLength(1);
      expect(backlogCards[0].status).toBe('backlog');
    });

    it('should return empty array for status with no cards', () => {
      plugin.transform(mockItems);
      const reviewCards = plugin.getCardsByStatus('review');

      expect(reviewCards).toEqual([]);
    });
  });
});
