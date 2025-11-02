/**
 * EventBus - Pub/Sub central pour Cartae
 *
 * Implémente le pattern Observer pour communication entre composants.
 * Type-safe grâce aux types définis dans EventTypes.
 *
 * Features:
 * - Subscribe/unsubscribe à des événements
 * - Subscribe once (auto-unsubscribe après 1er trigger)
 * - Emit events de manière type-safe
 * - Wildcard support (* pour tous les events)
 * - Memory leak prevention (auto-cleanup)
 *
 * @module events/EventBus
 */

/* eslint-disable no-console */

import type { CartaeEventMap } from './EventTypes';

/**
 * Event Handler function type
 */
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

/**
 * Unsubscribe function returned by on/once
 */
export type UnsubscribeFunction = () => void;

/**
 * EventBus Options
 */
export interface EventBusOptions {
  /**
   * Maximum nombre de listeners par event (prévient memory leaks)
   * @default 100
   */
  maxListeners?: number;

  /**
   * Log warnings si trop de listeners
   * @default true
   */
  warnOnMaxListeners?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * EventBus - Pub/Sub central
 *
 * @example
 * ```typescript
 * const bus = new EventBus();
 *
 * // Subscribe
 * const unsubscribe = bus.on('cartae:item:created', (event) => {
 *   console.log('New item:', event.item.id);
 * });
 *
 * // Emit
 * bus.emit('cartae:item:created', {
 *   type: 'cartae:item:created',
 *   item: newItem,
 *   timestamp: new Date(),
 *   source: 'plugin'
 * });
 *
 * // Unsubscribe
 * unsubscribe();
 * ```
 */
export class EventBus {
  private listeners: Map<string, Set<EventHandler>>;

  private onceListeners: Map<string, Set<EventHandler>>;

  private options: Required<EventBusOptions>;

  /**
   * Créer un EventBus
   *
   * @param options - Configuration optionnelle
   */
  constructor(options: EventBusOptions = {}) {
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.options = {
      maxListeners: options.maxListeners ?? 100,
      warnOnMaxListeners: options.warnOnMaxListeners ?? true,
      debug: options.debug ?? false,
    };
  }

  /**
   * Subscribe à un événement
   *
   * @param eventType - Type d'événement
   * @param handler - Function appelée quand l'event est émis
   * @returns Function pour unsubscribe
   *
   * @example
   * ```typescript
   * const unsub = bus.on('cartae:item:created', (event) => {
   *   console.log(event.item.title);
   * });
   *
   * // Later
   * unsub();
   * ```
   */
  public on<K extends keyof CartaeEventMap>(
    eventType: K,
    handler: EventHandler<CartaeEventMap[K]>
  ): UnsubscribeFunction;
  public on(eventType: string, handler: EventHandler): UnsubscribeFunction;
  public on(eventType: string, handler: EventHandler): UnsubscribeFunction {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const handlers = this.listeners.get(eventType)!;
    handlers.add(handler);

    // Check max listeners
    if (this.options.warnOnMaxListeners && handlers.size > this.options.maxListeners) {
      const msg =
        `[EventBus] Warning: Event "${eventType}" has ${handlers.size} listeners ` +
        `(max: ${this.options.maxListeners}). Possible memory leak?`;
      console.warn(msg);
    }

    if (this.options.debug) {
      console.log(`[EventBus] Subscribed to "${eventType}" (${handlers.size} listeners)`);
    }

    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }

  /**
   * Subscribe à un événement (trigger une seule fois)
   *
   * @param eventType - Type d'événement
   * @param handler - Function appelée une seule fois
   * @returns Function pour unsubscribe (au cas où)
   *
   * @example
   * ```typescript
   * bus.once('cartae:storage:initialized', (event) => {
   *   console.log('Storage ready!');
   * });
   * ```
   */
  public once<K extends keyof CartaeEventMap>(
    eventType: K,
    handler: EventHandler<CartaeEventMap[K]>
  ): UnsubscribeFunction;
  public once(eventType: string, handler: EventHandler): UnsubscribeFunction;
  public once(eventType: string, handler: EventHandler): UnsubscribeFunction {
    if (!this.onceListeners.has(eventType)) {
      this.onceListeners.set(eventType, new Set());
    }

    const handlers = this.onceListeners.get(eventType)!;
    handlers.add(handler);

    if (this.options.debug) {
      console.log(`[EventBus] Subscribed once to "${eventType}"`);
    }

    // Return unsubscribe function (au cas où event pas encore émis)
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.onceListeners.delete(eventType);
      }
    };
  }

  /**
   * Unsubscribe d'un événement
   *
   * @param eventType - Type d'événement
   * @param handler - Handler à retirer
   *
   * @example
   * ```typescript
   * const handler = (event) => { ... };
   * bus.on('cartae:item:created', handler);
   * bus.off('cartae:item:created', handler);
   * ```
   */
  public off(eventType: string, handler: EventHandler): void {
    // Remove from regular listeners
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }

    // Remove from once listeners
    const onceHandlers = this.onceListeners.get(eventType);
    if (onceHandlers) {
      onceHandlers.delete(handler);
      if (onceHandlers.size === 0) {
        this.onceListeners.delete(eventType);
      }
    }

    if (this.options.debug) {
      console.log(`[EventBus] Unsubscribed from "${eventType}"`);
    }
  }

  /**
   * Emit un événement
   *
   * @param eventType - Type d'événement
   * @param event - Event data
   *
   * @example
   * ```typescript
   * bus.emit('cartae:item:created', {
   *   type: 'cartae:item:created',
   *   item: newItem,
   *   timestamp: new Date(),
   *   source: 'plugin'
   * });
   * ```
   */
  public emit<K extends keyof CartaeEventMap>(eventType: K, event: CartaeEventMap[K]): void;
  public emit(eventType: string, event: unknown): void;
  public emit(eventType: string, event: unknown): void {
    if (this.options.debug) {
      console.log(`[EventBus] Emitting "${eventType}"`, event);
    }

    // Call regular listeners
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Error in handler for "${eventType}":`, error);
        }
      });
    }

    // Call once listeners (puis les retirer)
    const onceHandlers = this.onceListeners.get(eventType);
    if (onceHandlers) {
      // Clone set car on va modifier pendant iteration
      const handlersToCall = Array.from(onceHandlers);
      onceHandlers.clear();
      this.onceListeners.delete(eventType);

      handlersToCall.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Error in once handler for "${eventType}":`, error);
        }
      });
    }

    // Call wildcard listeners (si implémenté)
    const wildcardHandlers = this.listeners.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler({ type: eventType, data: event });
        } catch (error) {
          console.error('[EventBus] Error in wildcard handler:', error);
        }
      });
    }
  }

  /**
   * Retirer tous les listeners pour un event type
   *
   * @param eventType - Type d'événement (optionnel, si omis clear all)
   *
   * @example
   * ```typescript
   * bus.clear('cartae:item:created'); // Clear specific event
   * bus.clear(); // Clear all events
   * ```
   */
  public clear(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      this.onceListeners.delete(eventType);
      if (this.options.debug) {
        console.log(`[EventBus] Cleared listeners for "${eventType}"`);
      }
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
      if (this.options.debug) {
        console.log('[EventBus] Cleared all listeners');
      }
    }
  }

  /**
   * Compter les listeners pour un event type
   *
   * @param eventType - Type d'événement
   * @returns Nombre de listeners
   */
  public listenerCount(eventType: string): number {
    const regularCount = this.listeners.get(eventType)?.size ?? 0;
    const onceCount = this.onceListeners.get(eventType)?.size ?? 0;
    return regularCount + onceCount;
  }

  /**
   * Obtenir tous les event types avec listeners actifs
   *
   * @returns Array d'event types
   */
  public eventTypes(): string[] {
    const types = new Set<string>();
    this.listeners.forEach((_, type) => types.add(type));
    this.onceListeners.forEach((_, type) => types.add(type));
    return Array.from(types);
  }

  /**
   * Vérifier si un event type a des listeners
   *
   * @param eventType - Type d'événement
   * @returns true si au moins 1 listener
   */
  public hasListeners(eventType: string): boolean {
    return this.listenerCount(eventType) > 0;
  }
}

/**
 * Instance singleton EventBus (optionnel, recommandé pour usage global)
 *
 * @example
 * ```typescript
 * import { eventBus } from '@cartae/core';
 *
 * eventBus.on('cartae:item:created', handler);
 * eventBus.emit('cartae:item:created', event);
 * ```
 */
export const eventBus = new EventBus();
