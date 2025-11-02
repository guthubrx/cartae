/**
 * Tests pour CartaeItem types et type guards
 */

import { describe, it, expect } from 'vitest';
import {
  isCartaeItem,
  isCartaeMetadata,
  isCartaeRelationship,
  isAIInsights,
  getInverseRelationType,
  type CartaeItem,
  type CartaeMetadata,
  type CartaeRelationship,
  type AIInsights,
} from '../src/types';

describe('CartaeItem Type Guards', () => {
  describe('isCartaeItem', () => {
    it('should return true for valid CartaeItem', () => {
      const validItem: CartaeItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'email',
        title: 'Test email',
        metadata: {},
        tags: ['test'],
        source: {
          connector: 'office365',
          originalId: 'msg-123',
          lastSync: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isCartaeItem(validItem)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isCartaeItem(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isCartaeItem(undefined)).toBe(false);
    });

    it('should return false for object missing required fields', () => {
      expect(isCartaeItem({ id: '123' })).toBe(false);
      expect(isCartaeItem({ type: 'email' })).toBe(false);
    });

    it('should return false for wrong types', () => {
      expect(isCartaeItem({ id: 123, type: 'email' })).toBe(false);
      expect(isCartaeItem({ id: '123', type: 123 })).toBe(false);
    });
  });

  describe('isCartaeMetadata', () => {
    it('should return true for valid metadata', () => {
      const metadata: CartaeMetadata = {
        author: 'test@example.com',
        priority: 'high',
      };

      expect(isCartaeMetadata(metadata)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isCartaeMetadata({})).toBe(true);
    });

    it('should return false for null', () => {
      expect(isCartaeMetadata(null)).toBe(false);
    });
  });

  describe('isCartaeRelationship', () => {
    it('should return true for valid relationship', () => {
      const rel: CartaeRelationship = {
        type: 'parent',
        targetId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(isCartaeRelationship(rel)).toBe(true);
    });

    it('should return false for missing fields', () => {
      expect(isCartaeRelationship({ type: 'parent' })).toBe(false);
      expect(isCartaeRelationship({ targetId: '123' })).toBe(false);
    });
  });

  describe('isAIInsights', () => {
    it('should return true for valid AI insights', () => {
      const insights: AIInsights = {
        sentiment: 0.5,
        confidence: 0.9,
      };

      expect(isAIInsights(insights)).toBe(true);
    });

    it('should return true if at least one AI field present', () => {
      expect(isAIInsights({ sentiment: 0 })).toBe(true);
      expect(isAIInsights({ priorityScore: 0.5 })).toBe(true);
    });

    it('should return false for empty object', () => {
      expect(isAIInsights({})).toBe(false);
    });

    it('should return false for null', () => {
      expect(isAIInsights(null)).toBe(false);
    });
  });
});

describe('getInverseRelationType', () => {
  it('should return correct inverse types', () => {
    expect(getInverseRelationType('parent')).toBe('child');
    expect(getInverseRelationType('child')).toBe('parent');
    expect(getInverseRelationType('blocks')).toBe('blockedBy');
    expect(getInverseRelationType('blockedBy')).toBe('blocks');
    expect(getInverseRelationType('duplicates')).toBe('duplicatedBy');
    expect(getInverseRelationType('duplicatedBy')).toBe('duplicates');
    expect(getInverseRelationType('replaces')).toBe('replacedBy');
    expect(getInverseRelationType('replacedBy')).toBe('replaces');
    expect(getInverseRelationType('dependsOn')).toBe('requiredBy');
    expect(getInverseRelationType('requiredBy')).toBe('dependsOn');
  });

  it('should return null for types without inverse', () => {
    expect(getInverseRelationType('related')).toBe(null);
    expect(getInverseRelationType('references')).toBe(null);
  });
});
