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
export declare class EventBus {
    private listeners;
    private onceListeners;
    private options;
    /**
     * Créer un EventBus
     *
     * @param options - Configuration optionnelle
     */
    constructor(options?: EventBusOptions);
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
    on<K extends keyof CartaeEventMap>(eventType: K, handler: EventHandler<CartaeEventMap[K]>): UnsubscribeFunction;
    on(eventType: string, handler: EventHandler): UnsubscribeFunction;
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
    once<K extends keyof CartaeEventMap>(eventType: K, handler: EventHandler<CartaeEventMap[K]>): UnsubscribeFunction;
    once(eventType: string, handler: EventHandler): UnsubscribeFunction;
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
    off(eventType: string, handler: EventHandler): void;
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
    emit<K extends keyof CartaeEventMap>(eventType: K, event: CartaeEventMap[K]): void;
    emit(eventType: string, event: unknown): void;
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
    clear(eventType?: string): void;
    /**
     * Compter les listeners pour un event type
     *
     * @param eventType - Type d'événement
     * @returns Nombre de listeners
     */
    listenerCount(eventType: string): number;
    /**
     * Obtenir tous les event types avec listeners actifs
     *
     * @returns Array d'event types
     */
    eventTypes(): string[];
    /**
     * Vérifier si un event type a des listeners
     *
     * @param eventType - Type d'événement
     * @returns true si au moins 1 listener
     */
    hasListeners(eventType: string): boolean;
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
export declare const eventBus: EventBus;
//# sourceMappingURL=EventBus.d.ts.map