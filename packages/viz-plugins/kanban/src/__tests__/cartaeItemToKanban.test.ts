import { describe, it, expect } from 'vitest';
import type { CartaeItem } from '@cartae/core';
import { cartaeItemToKanban, cartaeItemsToKanban } from '../converters/cartaeItemToKanban';

describe('cartaeItemToKanban', () => {
  const baseItem: CartaeItem = {
    id: 'test-1',
    title: 'Test Task',
    content: 'Test content',
    type: 'task',
    source: {
      connector: 'test',
      originalId: 'test-1',
      lastSync: new Date(),
    },
    tags: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  describe('Status Inference', () => {
    it('should infer status from metadata.status', () => {
      const item = {
        ...baseItem,
        metadata: { status: 'completed' },
      };
      const card = cartaeItemToKanban(item);
      expect(card.status).toBe('done');
    });

    it('should infer "in_progress" from metadata.status', () => {
      const item = {
        ...baseItem,
        metadata: { status: 'in_progress' },
      };
      const card = cartaeItemToKanban(item);
      expect(card.status).toBe('in_progress');
    });

    it('should infer status from tags', () => {
      const item = {
        ...baseItem,
        tags: ['urgent', 'done'],
      };
      const card = cartaeItemToKanban(item);
      expect(card.status).toBe('done');
    });

    it('should infer "review" from tags', () => {
      const item = {
        ...baseItem,
        tags: ['pending', 'review'],
      };
      const card = cartaeItemToKanban(item);
      expect(card.status).toBe('review');
    });

    it('should infer status from content checkboxes', () => {
      const item = {
        ...baseItem,
        content: '[x] Task completed ✓',
      };
      const card = cartaeItemToKanban(item);
      expect(card.status).toBe('done');
    });

    it('should default to "backlog" for recent items', () => {
      const item = {
        ...baseItem,
        updatedAt: new Date(), // Now
      };
      const card = cartaeItemToKanban(item);
      expect(card.status).toBe('backlog');
    });

    it('should infer "done" for old items (>30 days)', () => {
      const item = {
        ...baseItem,
        updatedAt: new Date('2024-11-01'), // > 30 days ago
      };
      const card = cartaeItemToKanban(item);
      expect(card.status).toBe('done');
    });
  });

  describe('Priority Inference', () => {
    it('should infer priority from metadata.priority', () => {
      const item = {
        ...baseItem,
        metadata: { priority: 'high' },
      };
      const card = cartaeItemToKanban(item);
      expect(card.priority).toBe('high');
    });

    it('should infer urgent from tags', () => {
      const item = {
        ...baseItem,
        tags: ['urgent', 'critical'],
      };
      const card = cartaeItemToKanban(item);
      expect(card.priority).toBe('urgent');
    });

    it('should infer high from tags', () => {
      const item = {
        ...baseItem,
        tags: ['important', 'p1'],
      };
      const card = cartaeItemToKanban(item);
      expect(card.priority).toBe('high');
    });

    it('should infer priority from content', () => {
      const item = {
        ...baseItem,
        content: 'URGENT: Fix this ASAP!',
      };
      const card = cartaeItemToKanban(item);
      expect(card.priority).toBe('urgent');
    });

    it('should return undefined if no priority indicators', () => {
      const card = cartaeItemToKanban(baseItem);
      expect(card.priority).toBeUndefined();
    });
  });

  describe('Assignee Extraction', () => {
    it('should extract assignee from metadata.assignee', () => {
      const item = {
        ...baseItem,
        metadata: { assignee: 'John Doe' },
      };
      const card = cartaeItemToKanban(item);
      expect(card.assignee).toBe('John Doe');
    });

    it('should fallback to metadata.author', () => {
      const item = {
        ...baseItem,
        metadata: { author: 'Jane Smith' },
      };
      const card = cartaeItemToKanban(item);
      expect(card.assignee).toBe('Jane Smith');
    });

    it('should return undefined if no assignee', () => {
      const card = cartaeItemToKanban(baseItem);
      expect(card.assignee).toBeUndefined();
    });
  });

  describe('Due Date Extraction', () => {
    it('should extract dueDate from metadata.dueDate', () => {
      const dueDate = new Date('2025-12-31');
      const item = {
        ...baseItem,
        metadata: { dueDate: dueDate.toISOString() },
      };
      const card = cartaeItemToKanban(item);
      expect(card.dueDate).toEqual(dueDate);
    });

    it('should extract dueDate from metadata.deadline', () => {
      const deadline = new Date('2025-06-15');
      const item = {
        ...baseItem,
        metadata: { deadline: deadline.toISOString() },
      };
      const card = cartaeItemToKanban(item);
      expect(card.dueDate).toEqual(deadline);
    });

    it('should return undefined for invalid date', () => {
      const item = {
        ...baseItem,
        metadata: { dueDate: 'invalid-date' },
      };
      const card = cartaeItemToKanban(item);
      expect(card.dueDate).toBeUndefined();
    });
  });

  describe('cartaeItemsToKanban', () => {
    it('should convert multiple items', () => {
      const items: CartaeItem[] = [
        { ...baseItem, id: 'item-1' },
        { ...baseItem, id: 'item-2', metadata: { status: 'done' } },
        { ...baseItem, id: 'item-3', tags: ['in-progress'] },
      ];

      const cards = cartaeItemsToKanban(items);

      expect(cards).toHaveLength(3);
      expect(cards[0].id).toBe('item-1');
      expect(cards[1].status).toBe('done');
      expect(cards[2].status).toBe('in_progress');
    });

    it('should handle empty array', () => {
      const cards = cartaeItemsToKanban([]);
      expect(cards).toEqual([]);
    });
  });
});
