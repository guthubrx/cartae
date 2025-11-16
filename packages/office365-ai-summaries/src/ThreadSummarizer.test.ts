/**
 * Tests pour ThreadSummarizer
 */

import { describe, it, expect } from 'vitest';
import { ThreadSummarizer } from './ThreadSummarizer';
import type { CartaeItem } from '@cartae/core';

describe('ThreadSummarizer', () => {
  const summarizer = new ThreadSummarizer();

  const mockThreadItems: CartaeItem[] = [
    {
      id: 'email-1',
      type: 'email',
      source: 'office365',
      title: 'Initial question about project timeline',
      content: 'Hi team, what is the timeline for the Q4 project?',
      createdAt: new Date('2024-01-10T09:00:00Z'),
      updatedAt: new Date('2024-01-10T09:00:00Z'),
      metadata: {
        from: 'alice@example.com',
        to: ['team@example.com'],
      },
    },
    {
      id: 'email-2',
      type: 'email',
      source: 'office365',
      title: 'Re: Initial question about project timeline',
      content: 'The deadline is December 15th. We need to start immediately.',
      createdAt: new Date('2024-01-10T10:30:00Z'),
      updatedAt: new Date('2024-01-10T10:30:00Z'),
      metadata: {
        from: 'bob@example.com',
        to: ['alice@example.com', 'team@example.com'],
        cc: ['manager@example.com'],
        ai: {
          priority: {
            level: 'high',
            score: 0.85,
            reasons: ['Contains deadline'],
          },
        },
      },
    },
    {
      id: 'email-3',
      type: 'email',
      source: 'office365',
      title: 'Re: Initial question about project timeline',
      content: 'Acknowledged. I will prepare the kickoff meeting agenda.',
      createdAt: new Date('2024-01-10T14:00:00Z'),
      updatedAt: new Date('2024-01-10T14:00:00Z'),
      metadata: {
        from: 'alice@example.com',
        to: ['bob@example.com', 'team@example.com'],
        ai: {
          actionItems: ['Prepare kickoff meeting agenda'],
        },
      },
    },
  ];

  describe('generateThreadSummary', () => {
    it('should generate summary for thread', async () => {
      const result = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123');

      expect(result.summary).toBeDefined();
      expect(result.summary.threadId).toBe('thread-123');
      expect(result.summary.type).toBe('thread');
      expect(result.summary.text).toBeTruthy();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should count thread items correctly', async () => {
      const result = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123');

      expect(result.summary.threadItemCount).toBe(3);
    });

    it('should extract all participants', async () => {
      const result = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123', {
        includeParticipants: true,
      });

      const participants = result.summary.participants;
      expect(participants).toBeDefined();
      expect(participants!).toContain('alice@example.com');
      expect(participants!).toContain('bob@example.com');
      expect(participants!).toContain('team@example.com');
      expect(participants!).toContain('manager@example.com');
    });

    it('should set thread start and end dates', async () => {
      const result = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123');

      expect(result.summary.threadStartDate).toEqual(new Date('2024-01-10T09:00:00Z'));
      expect(result.summary.threadEndDate).toEqual(new Date('2024-01-10T14:00:00Z'));
    });

    it('should include timeline when requested', async () => {
      const result = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123', {
        includeTimeline: true,
      });

      expect(result.summary.keyPoints).toBeDefined();
      const timelinePoint = result.summary.keyPoints!.find(kp => kp.includes('Timeline:'));
      expect(timelinePoint).toBeDefined();
      expect(timelinePoint).toContain('Début:');
      expect(timelinePoint).toContain('Fin:');
    });

    it('should handle single-item thread', async () => {
      const singleItem = [mockThreadItems[0]];
      const result = await summarizer.generateThreadSummary(singleItem, 'thread-single');

      expect(result.summary.threadItemCount).toBe(1);
      expect(result.summary.text).toBeTruthy();
    });

    it('should throw error for empty thread', async () => {
      await expect(summarizer.generateThreadSummary([], 'thread-empty')).rejects.toThrow(
        'Thread must contain at least one item'
      );
    });

    it('should sort items chronologically', async () => {
      // Scrambled order
      const scrambledItems = [mockThreadItems[2], mockThreadItems[0], mockThreadItems[1]];

      const result = await summarizer.generateThreadSummary(scrambledItems, 'thread-123');

      // Should use earliest as start, latest as end
      expect(result.summary.threadStartDate).toEqual(new Date('2024-01-10T09:00:00Z'));
      expect(result.summary.threadEndDate).toEqual(new Date('2024-01-10T14:00:00Z'));
    });

    it('should respect summary length option', async () => {
      const resultShort = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123', {
        length: 'short',
      });

      const resultLong = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123', {
        length: 'long',
      });

      expect(resultShort.metadata?.summaryWordCount).toBeLessThan(
        resultLong.metadata?.summaryWordCount || 0
      );
    });

    it('should extract key points from thread', async () => {
      const result = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123', {
        maxKeyPoints: 3,
      });

      expect(result.summary.keyPoints).toBeDefined();
      expect(result.summary.keyPoints!.length).toBeGreaterThan(0);
    });

    it('should detect topics across thread', async () => {
      const result = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123', {
        detectTopics: true,
      });

      expect(result.summary.topics).toBeDefined();
      expect(Array.isArray(result.summary.topics)).toBe(true);
    });

    it('should extract action items from thread', async () => {
      const result = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123', {
        extractActionItems: true,
      });

      expect(result.summary.actionItems).toBeDefined();
    });

    it('should calculate compression ratio for thread', async () => {
      const result = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123');

      expect(result.metadata?.compressionRatio).toBeDefined();
      expect(result.metadata!.compressionRatio).toBeGreaterThan(0);
      expect(result.metadata!.compressionRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('timeline generation', () => {
    it('should highlight important messages in timeline', async () => {
      const result = await summarizer.generateThreadSummary(mockThreadItems, 'thread-123', {
        includeTimeline: true,
      });

      const timelinePoint = result.summary.keyPoints!.find(kp => kp.includes('Timeline:'));
      expect(timelinePoint).toBeDefined();
      expect(timelinePoint).toContain('important'); // Should mark email-2 (high priority)
    });
  });
});
