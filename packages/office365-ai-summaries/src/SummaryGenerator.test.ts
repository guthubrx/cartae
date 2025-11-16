/**
 * Tests pour SummaryGenerator
 */

import { describe, it, expect } from 'vitest';
import { SummaryGenerator } from './SummaryGenerator';
import type { CartaeItem } from '@cartae/core';

describe('SummaryGenerator', () => {
  const generator = new SummaryGenerator();

  const mockItem: CartaeItem = {
    id: 'test-item-1',
    type: 'email',
    source: 'office365',
    title: 'Important project update with urgent deadline',
    content: `Hello team,

I wanted to provide an important update on the Q4 project. We have made significant progress, but there are some critical issues that require immediate attention.

The deadline for phase 1 is December 15th. Please review the attached documents and provide your feedback by next Monday.

We must complete the following tasks:
- Review architecture design
- Approve budget allocation
- Schedule the kickoff meeting

Thank you for your cooperation.`,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    metadata: {},
  };

  describe('generateSummary', () => {
    it('should generate extractive summary with default options', async () => {
      const result = await generator.generateSummary(mockItem);

      expect(result.summary).toBeDefined();
      expect(result.summary.id).toBeDefined();
      expect(result.summary.itemId).toBe('test-item-1');
      expect(result.summary.text).toBeTruthy();
      expect(result.summary.length).toBe('medium');
      expect(result.summary.generationMethod).toBe('extractive');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should generate short summary', async () => {
      const result = await generator.generateSummary(mockItem, { length: 'short' });

      expect(result.summary.length).toBe('short');
      expect(result.metadata?.summaryWordCount).toBeLessThan(
        result.metadata?.originalWordCount || 0
      );
    });

    it('should extract key points when requested', async () => {
      const result = await generator.generateSummary(mockItem, {
        maxKeyPoints: 3,
      });

      expect(result.summary.keyPoints).toBeDefined();
      expect(result.summary.keyPoints!.length).toBeGreaterThan(0);
      expect(result.summary.keyPoints!.length).toBeLessThanOrEqual(3);
    });

    it('should detect topics when requested', async () => {
      const result = await generator.generateSummary(mockItem, {
        detectTopics: true,
      });

      expect(result.summary.topics).toBeDefined();
      expect(Array.isArray(result.summary.topics)).toBe(true);
    });

    it('should extract action items from text', async () => {
      const result = await generator.generateSummary(mockItem, {
        extractActionItems: true,
      });

      expect(result.summary.actionItems).toBeDefined();
      expect(result.summary.actionItems!.length).toBeGreaterThan(0);
    });

    it('should calculate compression ratio', async () => {
      const result = await generator.generateSummary(mockItem);

      expect(result.metadata?.compressionRatio).toBeDefined();
      expect(result.metadata!.compressionRatio).toBeGreaterThan(0);
      expect(result.metadata!.compressionRatio).toBeLessThanOrEqual(1);
    });

    it('should handle item with only title', async () => {
      const minimalItem: CartaeItem = {
        ...mockItem,
        content: undefined,
      };

      const result = await generator.generateSummary(minimalItem);

      expect(result.summary).toBeDefined();
      expect(result.summary.text).toBeTruthy();
    });

    it('should set confidence score', async () => {
      const result = await generator.generateSummary(mockItem);

      expect(result.summary.confidence).toBeDefined();
      expect(result.summary.confidence!).toBeGreaterThanOrEqual(0);
      expect(result.summary.confidence!).toBeLessThanOrEqual(1);
    });
  });

  describe('sentence scoring', () => {
    it('should prioritize sentences with important keywords', async () => {
      const urgentItem: CartaeItem = {
        ...mockItem,
        content: 'This is urgent and requires immediate action. Other text here. More content.',
      };

      const result = await generator.generateSummary(urgentItem, { length: 'short' });

      expect(result.summary.text.toLowerCase()).toContain('urgent');
    });

    it('should handle long summary option', async () => {
      const result = await generator.generateSummary(mockItem, { length: 'long' });

      expect(result.summary.length).toBe('long');
      expect(result.metadata?.summaryWordCount).toBeGreaterThan(0);
    });
  });

  describe('topic extraction', () => {
    it('should extract most frequent meaningful words as topics', async () => {
      const topicalItem: CartaeItem = {
        ...mockItem,
        content: `The project budget needs review. The budget allocation is critical for project success.
        We need to discuss project timeline and budget constraints during the project meeting.`,
      };

      const result = await generator.generateSummary(topicalItem, { detectTopics: true });

      expect(result.summary.topics).toBeDefined();
      expect(result.summary.topics!).toContain('project');
      expect(result.summary.topics!).toContain('budget');
    });
  });
});
