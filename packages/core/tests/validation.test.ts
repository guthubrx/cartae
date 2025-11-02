/**
 * Tests pour validation Zod
 */

import { describe, it, expect } from 'vitest';
import {
  validateCartaeItem,
  parseCartaeItem,
  CartaeItemSchema,
  CartaeMetadataSchema,
  CartaeRelationshipSchema,
  AIInsightsSchema,
} from '../src/schemas';

describe('Zod Schema Validation', () => {
  describe('CartaeItemSchema', () => {
    it('should validate valid CartaeItem', () => {
      const validItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'email',
        title: 'Test email',
        metadata: {},
        tags: [],
        source: {
          connector: 'office365',
          originalId: 'msg-123',
          lastSync: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validateCartaeItem(validItem);
      expect(result.success).toBe(true);
    });

    it('should validate CartaeItem with all optional fields', () => {
      const fullItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'task',
        title: 'Complete project',
        content: 'Finish all remaining tasks',
        '@context': 'https://www.w3.org/ns/activitystreams',
        '@type': 'Task',
        metadata: {
          author: 'john@example.com',
          priority: 'high',
          status: 'in_progress',
          dueDate: new Date().toISOString(),
        },
        relationships: [
          {
            type: 'parent',
            targetId: '223e4567-e89b-12d3-a456-426614174000',
          },
        ],
        tags: ['urgent', 'project'],
        categories: ['work/projects'],
        source: {
          connector: 'planner',
          originalId: 'task-456',
          url: 'https://planner.example.com/task-456',
          lastSync: new Date().toISOString(),
          metadata: { customField: 'value' },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
        favorite: true,
      };

      const result = validateCartaeItem(fullItem);
      expect(result.success).toBe(true);
    });

    it('should reject item with missing required fields', () => {
      const invalidItem = {
        type: 'email',
        title: 'Test',
      };

      const result = validateCartaeItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item with invalid UUID', () => {
      const invalidItem = {
        id: 'not-a-uuid',
        type: 'email',
        title: 'Test',
        metadata: {},
        tags: [],
        source: {
          connector: 'office365',
          originalId: 'msg-123',
          lastSync: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validateCartaeItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item with invalid type', () => {
      const invalidItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'invalid_type',
        title: 'Test',
        metadata: {},
        tags: [],
        source: {
          connector: 'office365',
          originalId: 'msg-123',
          lastSync: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validateCartaeItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item with empty title', () => {
      const invalidItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'email',
        title: '',
        metadata: {},
        tags: [],
        source: {
          connector: 'office365',
          originalId: 'msg-123',
          lastSync: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validateCartaeItem(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('parseCartaeItem', () => {
    it('should return parsed item for valid data', () => {
      const validItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'email',
        title: 'Test',
        metadata: {},
        tags: [],
        source: {
          connector: 'office365',
          originalId: 'msg-123',
          lastSync: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() => parseCartaeItem(validItem)).not.toThrow();
      const parsed = parseCartaeItem(validItem);
      expect(parsed.id).toBe(validItem.id);
    });

    it('should throw for invalid data', () => {
      const invalidItem = {
        type: 'email',
      };

      expect(() => parseCartaeItem(invalidItem)).toThrow();
    });
  });

  describe('CartaeMetadataSchema', () => {
    it('should validate valid metadata', () => {
      const metadata = {
        author: 'test@example.com',
        priority: 'high',
        status: 'in_progress',
        dueDate: new Date().toISOString(),
      };

      const result = CartaeMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should allow custom extensible fields', () => {
      const metadata = {
        author: 'test@example.com',
        customField: 'customValue',
        nested: { foo: 'bar' },
      };

      const result = CartaeMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should reject invalid priority', () => {
      const metadata = {
        priority: 'invalid',
      };

      const result = CartaeMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it('should reject progress > 100', () => {
      const metadata = {
        progress: 150,
      };

      const result = CartaeMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });
  });

  describe('CartaeRelationshipSchema', () => {
    it('should validate valid relationship', () => {
      const rel = {
        type: 'parent',
        targetId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CartaeRelationshipSchema.safeParse(rel);
      expect(result.success).toBe(true);
    });

    it('should validate relationship with metadata', () => {
      const rel = {
        type: 'related',
        targetId: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          strength: 0.85,
          createdBy: 'ai',
          confidence: 0.9,
        },
        bidirectional: true,
      };

      const result = CartaeRelationshipSchema.safeParse(rel);
      expect(result.success).toBe(true);
    });

    it('should reject invalid relationship type', () => {
      const rel = {
        type: 'invalid_type',
        targetId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CartaeRelationshipSchema.safeParse(rel);
      expect(result.success).toBe(false);
    });

    it('should reject invalid targetId UUID', () => {
      const rel = {
        type: 'parent',
        targetId: 'not-a-uuid',
      };

      const result = CartaeRelationshipSchema.safeParse(rel);
      expect(result.success).toBe(false);
    });
  });

  describe('AIInsightsSchema', () => {
    it('should validate valid AI insights', () => {
      const insights = {
        sentiment: 0.5,
        priorityScore: 0.8,
        confidence: 0.95,
        suggestedTags: ['urgent', 'important'],
      };

      const result = AIInsightsSchema.safeParse(insights);
      expect(result.success).toBe(true);
    });

    it('should reject sentiment out of range', () => {
      const insights = {
        sentiment: 2.0,
      };

      const result = AIInsightsSchema.safeParse(insights);
      expect(result.success).toBe(false);
    });

    it('should reject confidence > 1', () => {
      const insights = {
        confidence: 1.5,
      };

      const result = AIInsightsSchema.safeParse(insights);
      expect(result.success).toBe(false);
    });

    it('should allow entities with sub-arrays', () => {
      const insights = {
        entities: {
          persons: ['John Doe', 'Jane Smith'],
          organizations: ['Acme Corp'],
        },
      };

      const result = AIInsightsSchema.safeParse(insights);
      expect(result.success).toBe(true);
    });
  });
});
