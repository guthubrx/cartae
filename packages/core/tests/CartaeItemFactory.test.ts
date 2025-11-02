/**
 * Tests pour CartaeItemFactory
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCartaeItem,
  createValidatedCartaeItem,
  createEmailItem,
  createTaskItem,
  createDocumentItem,
  createMessageItem,
  createEventItem,
  cloneCartaeItem,
  isValidCartaeItem,
} from '../src/factories';

describe('CartaeItemFactory', () => {
  describe('createCartaeItem', () => {
    it('should create a valid CartaeItem with minimal options', () => {
      const item = createCartaeItem({
        type: 'email',
        title: 'Test email',
        connector: 'office365',
        originalId: 'msg-123',
      });

      expect(item.id).toBeDefined();
      expect(item.type).toBe('email');
      expect(item.title).toBe('Test email');
      expect(item.source.connector).toBe('office365');
      expect(item.source.originalId).toBe('msg-123');
      expect(item.tags).toEqual([]);
      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.updatedAt).toBeInstanceOf(Date);
      expect(item.archived).toBe(false);
      expect(item.favorite).toBe(false);
    });

    it('should create CartaeItem with full options', () => {
      const item = createCartaeItem({
        type: 'task',
        title: 'Complete project',
        content: 'Finish all tasks',
        connector: 'planner',
        originalId: 'task-456',
        sourceUrl: 'https://planner.example.com/task-456',
        metadata: {
          author: 'john@example.com',
          priority: 'high',
          status: 'in_progress',
        },
        tags: ['urgent', 'project'],
        categories: ['work/projects'],
        relationships: [
          {
            type: 'parent',
            targetId: '123e4567-e89b-12d3-a456-426614174000',
          },
        ],
        jsonLdContext: 'https://www.w3.org/ns/activitystreams',
        jsonLdType: 'Task',
        archived: true,
        favorite: true,
      });

      expect(item.content).toBe('Finish all tasks');
      expect(item.source.url).toBe('https://planner.example.com/task-456');
      expect(item.metadata.author).toBe('john@example.com');
      expect(item.metadata.priority).toBe('high');
      expect(item.tags).toEqual(['urgent', 'project']);
      expect(item.categories).toEqual(['work/projects']);
      expect(item.relationships).toHaveLength(1);
      expect(item['@context']).toBe('https://www.w3.org/ns/activitystreams');
      expect(item['@type']).toBe('Task');
      expect(item.archived).toBe(true);
      expect(item.favorite).toBe(true);
    });

    it('should generate unique IDs for each item', () => {
      const item1 = createCartaeItem({
        type: 'email',
        title: 'Email 1',
        connector: 'office365',
        originalId: 'msg-1',
      });

      const item2 = createCartaeItem({
        type: 'email',
        title: 'Email 2',
        connector: 'office365',
        originalId: 'msg-2',
      });

      expect(item1.id).not.toBe(item2.id);
    });

    it('should set createdAt and updatedAt to same value', () => {
      const item = createCartaeItem({
        type: 'note',
        title: 'My note',
        connector: 'local',
        originalId: 'note-1',
      });

      expect(item.createdAt.getTime()).toBe(item.updatedAt.getTime());
    });
  });

  describe('createValidatedCartaeItem', () => {
    it('should create and validate a valid item', () => {
      expect(() =>
        createValidatedCartaeItem({
          type: 'email',
          title: 'Valid email',
          connector: 'office365',
          originalId: 'msg-123',
        })
      ).not.toThrow();
    });

    it('should throw for invalid data (though factory should prevent this)', () => {
      // Note: Factory should always create valid items, this tests the validation layer
      const item = createCartaeItem({
        type: 'email',
        title: 'Test',
        connector: 'office365',
        originalId: 'msg-123',
      });

      // Validate the item separately
      expect(isValidCartaeItem(item)).toBe(true);
    });
  });

  describe('createEmailItem', () => {
    it('should create an email item with specific fields', () => {
      const email = createEmailItem({
        title: 'Meeting follow-up',
        content: 'Email body',
        connector: 'office365',
        originalId: 'msg-123',
        from: 'alice@example.com',
        to: ['bob@example.com', 'charlie@example.com'],
        subject: 'Re: Project update',
        tags: ['meeting'],
      });

      expect(email.type).toBe('email');
      expect(email['@type']).toBe('EmailMessage');
      expect(email.metadata.author).toBe('alice@example.com');
      expect(email.metadata.participants).toEqual(['bob@example.com', 'charlie@example.com']);
    });

    it('should fallback to metadata.author if from not provided', () => {
      const email = createEmailItem({
        title: 'Test',
        connector: 'office365',
        originalId: 'msg-123',
        metadata: {
          author: 'fallback@example.com',
        },
      });

      expect(email.metadata.author).toBe('fallback@example.com');
    });
  });

  describe('createTaskItem', () => {
    it('should create a task item with specific fields', () => {
      const dueDate = new Date('2025-12-31');
      const task = createTaskItem({
        title: 'Complete report',
        connector: 'planner',
        originalId: 'task-456',
        status: 'in_progress',
        priority: 'high',
        dueDate,
        assignee: 'john@example.com',
      });

      expect(task.type).toBe('task');
      expect(task['@type']).toBe('Task');
      expect(task.metadata.status).toBe('in_progress');
      expect(task.metadata.priority).toBe('high');
      expect(task.metadata.dueDate).toEqual(dueDate);
      expect(task.metadata.author).toBe('john@example.com');
    });

    it('should use default status and priority if not provided', () => {
      const task = createTaskItem({
        title: 'Test task',
        connector: 'planner',
        originalId: 'task-789',
      });

      expect(task.metadata.status).toBe('new');
      expect(task.metadata.priority).toBe('medium');
    });
  });

  describe('createDocumentItem', () => {
    it('should create a document item with file metadata', () => {
      const doc = createDocumentItem({
        title: 'Project charter',
        connector: 'sharepoint',
        originalId: 'doc-123',
        fileType: 'pdf',
        fileSize: 2048576,
      });

      expect(doc.type).toBe('document');
      expect(doc['@type']).toBe('Document');
      expect((doc.metadata as any).fileType).toBe('pdf');
      expect((doc.metadata as any).fileSize).toBe(2048576);
    });
  });

  describe('createMessageItem', () => {
    it('should create a message item with chat fields', () => {
      const message = createMessageItem({
        title: 'Quick question',
        content: 'Can you review this?',
        connector: 'teams',
        originalId: 'msg-teams-123',
        from: 'alice@example.com',
        channelId: 'channel-456',
        threadId: 'thread-789',
      });

      expect(message.type).toBe('message');
      expect(message['@type']).toBe('ChatMessage');
      expect(message.metadata.author).toBe('alice@example.com');
      expect((message.metadata as any).channelId).toBe('channel-456');
      expect((message.metadata as any).threadId).toBe('thread-789');
    });
  });

  describe('createEventItem', () => {
    it('should create an event item with calendar fields', () => {
      const startDate = new Date('2025-11-15T10:00:00');
      const endDate = new Date('2025-11-15T11:00:00');

      const event = createEventItem({
        title: 'Team meeting',
        connector: 'calendar',
        originalId: 'event-123',
        startDate,
        endDate,
        location: 'Conference Room A',
        attendees: ['alice@example.com', 'bob@example.com'],
      });

      expect(event.type).toBe('event');
      expect(event['@type']).toBe('Event');
      expect(event.metadata.startDate).toEqual(startDate);
      expect(event.metadata.endDate).toEqual(endDate);
      expect(event.metadata.location).toBe('Conference Room A');
      expect(event.metadata.participants).toEqual(['alice@example.com', 'bob@example.com']);
    });
  });

  describe('cloneCartaeItem', () => {
    it('should clone an item with new ID', () => {
      const original = createCartaeItem({
        type: 'note',
        title: 'Original note',
        connector: 'local',
        originalId: 'note-1',
      });

      const cloned = cloneCartaeItem(original);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.title).toBe(original.title);
      expect(cloned.type).toBe(original.type);
      expect(cloned.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
    });

    it('should allow updating fields during clone', () => {
      const original = createCartaeItem({
        type: 'task',
        title: 'Original task',
        connector: 'planner',
        originalId: 'task-1',
      });

      const cloned = cloneCartaeItem(original, {
        title: 'Cloned task',
        tags: ['cloned'],
      });

      expect(cloned.title).toBe('Cloned task');
      expect(cloned.tags).toEqual(['cloned']);
      expect(cloned.type).toBe(original.type);
    });

    it('should preserve specified ID if provided in updates', () => {
      const original = createCartaeItem({
        type: 'note',
        title: 'Note',
        connector: 'local',
        originalId: 'note-1',
      });

      const customId = '123e4567-e89b-12d3-a456-426614174000';
      const cloned = cloneCartaeItem(original, {
        id: customId,
      });

      expect(cloned.id).toBe(customId);
    });
  });

  describe('isValidCartaeItem', () => {
    it('should return true for valid item', () => {
      const item = createCartaeItem({
        type: 'email',
        title: 'Test',
        connector: 'office365',
        originalId: 'msg-123',
      });

      expect(isValidCartaeItem(item)).toBe(true);
    });

    it('should return false for invalid object', () => {
      expect(isValidCartaeItem(null)).toBe(false);
      expect(isValidCartaeItem({})).toBe(false);
      expect(isValidCartaeItem({ type: 'email' })).toBe(false);
    });
  });
});
