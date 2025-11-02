/**
 * Tests pour EventBus - système pub/sub
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../src/events/EventBus';
import type { CartaeItemCreatedEvent, StorageInitializedEvent } from '../src/events/EventTypes';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('Basic pub/sub', () => {
    it('should emit and receive events', () => {
      const handler = vi.fn();
      const event: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      bus.on('cartae:item:created', handler);
      bus.emit('cartae:item:created', event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle multiple listeners for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const event: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      bus.on('cartae:item:created', handler1);
      bus.on('cartae:item:created', handler2);
      bus.emit('cartae:item:created', event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should handle different event types independently', () => {
      const itemHandler = vi.fn();
      const storageHandler = vi.fn();

      const itemEvent: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const storageEvent: StorageInitializedEvent = {
        type: 'cartae:storage:initialized',
        timestamp: new Date(),
        source: { component: 'storage' },
        adapter: 'IndexedDBStore',
      };

      bus.on('cartae:item:created', itemHandler);
      bus.on('cartae:storage:initialized', storageHandler);

      bus.emit('cartae:item:created', itemEvent);
      expect(itemHandler).toHaveBeenCalledTimes(1);
      expect(storageHandler).toHaveBeenCalledTimes(0);

      bus.emit('cartae:storage:initialized', storageEvent);
      expect(itemHandler).toHaveBeenCalledTimes(1);
      expect(storageHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unsubscribe', () => {
    it('should unsubscribe using returned function', () => {
      const handler = vi.fn();
      const event: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const unsubscribe = bus.on('cartae:item:created', handler);

      bus.emit('cartae:item:created', event);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      bus.emit('cartae:item:created', event);
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should unsubscribe using off()', () => {
      const handler = vi.fn();
      const event: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      bus.on('cartae:item:created', handler);
      bus.emit('cartae:item:created', event);
      expect(handler).toHaveBeenCalledTimes(1);

      bus.off('cartae:item:created', handler);
      bus.emit('cartae:item:created', event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should only remove specific handler, not all', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const event: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      bus.on('cartae:item:created', handler1);
      bus.on('cartae:item:created', handler2);

      bus.off('cartae:item:created', handler1);
      bus.emit('cartae:item:created', event);

      expect(handler1).toHaveBeenCalledTimes(0);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Once listeners', () => {
    it('should call handler only once', () => {
      const handler = vi.fn();
      const event: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      bus.once('cartae:item:created', handler);

      bus.emit('cartae:item:created', event);
      expect(handler).toHaveBeenCalledTimes(1);

      bus.emit('cartae:item:created', event);
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should allow unsubscribe before first call', () => {
      const handler = vi.fn();
      const event: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const unsubscribe = bus.once('cartae:item:created', handler);
      unsubscribe();

      bus.emit('cartae:item:created', event);
      expect(handler).toHaveBeenCalledTimes(0);
    });
  });

  describe('Wildcard listeners', () => {
    it('should receive all events with wildcard', () => {
      const wildcardHandler = vi.fn();

      bus.on('*', wildcardHandler);

      const itemEvent: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const storageEvent: StorageInitializedEvent = {
        type: 'cartae:storage:initialized',
        timestamp: new Date(),
        source: { component: 'storage' },
        adapter: 'IndexedDBStore',
      };

      bus.emit('cartae:item:created', itemEvent);
      bus.emit('cartae:storage:initialized', storageEvent);

      expect(wildcardHandler).toHaveBeenCalledTimes(2);
      expect(wildcardHandler).toHaveBeenNthCalledWith(1, {
        type: 'cartae:item:created',
        data: itemEvent,
      });
      expect(wildcardHandler).toHaveBeenNthCalledWith(2, {
        type: 'cartae:storage:initialized',
        data: storageEvent,
      });
    });

    it('should allow wildcard unsubscribe', () => {
      const wildcardHandler = vi.fn();
      const unsubscribe = bus.on('*', wildcardHandler);

      const event: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      bus.emit('cartae:item:created', event);
      expect(wildcardHandler).toHaveBeenCalledTimes(1);

      unsubscribe();
      bus.emit('cartae:item:created', event);
      expect(wildcardHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Utility methods', () => {
    it('should count listeners correctly', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      expect(bus.listenerCount('cartae:item:created')).toBe(0);

      bus.on('cartae:item:created', handler1);
      expect(bus.listenerCount('cartae:item:created')).toBe(1);

      bus.on('cartae:item:created', handler2);
      expect(bus.listenerCount('cartae:item:created')).toBe(2);

      bus.off('cartae:item:created', handler1);
      expect(bus.listenerCount('cartae:item:created')).toBe(1);
    });

    it('should list event types', () => {
      const handler = vi.fn();

      expect(bus.eventTypes()).toEqual([]);

      bus.on('cartae:item:created', handler);
      bus.on('cartae:storage:initialized', handler);

      expect(bus.eventTypes()).toContain('cartae:item:created');
      expect(bus.eventTypes()).toContain('cartae:storage:initialized');
      expect(bus.eventTypes().length).toBe(2);
    });

    it('should check if has listeners', () => {
      const handler = vi.fn();

      expect(bus.hasListeners('cartae:item:created')).toBe(false);

      bus.on('cartae:item:created', handler);
      expect(bus.hasListeners('cartae:item:created')).toBe(true);

      bus.off('cartae:item:created', handler);
      expect(bus.hasListeners('cartae:item:created')).toBe(false);
    });

    it('should clear all listeners', () => {
      const handler = vi.fn();

      bus.on('cartae:item:created', handler);
      bus.on('cartae:storage:initialized', handler);

      expect(bus.eventTypes().length).toBe(2);

      bus.clear();

      expect(bus.eventTypes().length).toBe(0);
      expect(bus.hasListeners('cartae:item:created')).toBe(false);
    });
  });

  describe('Memory leak protection', () => {
    it('should warn when maxListeners exceeded', () => {
      const testBus = new EventBus({ maxListeners: 10 });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Add 11 listeners (maxListeners = 10)
      for (let i = 0; i < 11; i++) {
        testBus.on('cartae:item:created', vi.fn());
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Possible memory leak?'));

      consoleWarnSpy.mockRestore();
    });

    it('should allow setting custom maxListeners', () => {
      const customBus = new EventBus({ maxListeners: 5 });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Add 6 listeners (exceeds custom max of 5)
      for (let i = 0; i < 6; i++) {
        customBus.on('cartae:item:created', vi.fn());
      }

      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle emit with no listeners gracefully', () => {
      const event: CartaeItemCreatedEvent = {
        type: 'cartae:item:created',
        timestamp: new Date(),
        source: { component: 'test' },
        item: {
          id: '123',
          type: 'email',
          title: 'Test',
          metadata: {},
          tags: [],
          source: { connector: 'test', originalId: '1', lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(() => bus.emit('cartae:item:created', event)).not.toThrow();
    });

    it('should handle double unsubscribe gracefully', () => {
      const handler = vi.fn();
      const unsubscribe = bus.on('cartae:item:created', handler);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should handle off() for non-existent handler gracefully', () => {
      const handler = vi.fn();
      expect(() => bus.off('cartae:item:created', handler)).not.toThrow();
    });
  });
});
