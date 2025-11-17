/**
 * EventLogger - Debug utility pour EventBus
 *
 * Permet de logger tous les événements qui passent par EventBus,
 * avec filtres, formatage, et export.
 *
 * Utile pour:
 * - Debugging
 * - Monitoring
 * - Audit trail
 * - Tests
 *
 * @module events/EventLogger
 */
import type { EventBus } from './EventBus';
/**
 * Log entry
 */
export interface EventLogEntry {
    /** Event type */
    type: string;
    /** Event data */
    event: unknown;
    /** Timestamp */
    timestamp: Date;
    /** Durée depuis logger start (ms) */
    elapsed: number;
}
/**
 * EventLogger Options
 */
export interface EventLoggerOptions {
    /**
     * Log tous les events ou seulement certains types
     * @default [] (tous)
     */
    filter?: string[];
    /**
     * Exclure certains types d'events
     * @default []
     */
    exclude?: string[];
    /**
     * Maximum d'entries à garder en mémoire
     * @default 1000
     */
    maxEntries?: number;
    /**
     * Enable console logging
     * @default true
     */
    console?: boolean;
    /**
     * Format console output
     * @default 'compact'
     */
    consoleFormat?: 'compact' | 'detailed' | 'json';
}
/**
 * EventLogger - Logger pour EventBus
 *
 * @example
 * ```typescript
 * const logger = new EventLogger(eventBus, {
 *   filter: ['cartae:item:created', 'cartae:item:updated'],
 *   consoleFormat: 'detailed'
 * });
 *
 * logger.start();
 *
 * // Later
 * const logs = logger.getLogs();
 * logger.export('events.json');
 * logger.stop();
 * ```
 */
export declare class EventLogger {
    private eventBus;
    private options;
    private logs;
    private startTime;
    private unsubscribe;
    constructor(eventBus: EventBus, options?: EventLoggerOptions);
    /**
     * Démarrer le logging
     */
    start(): void;
    /**
     * Arrêter le logging
     */
    stop(): void;
    /**
     * Log un événement
     */
    private logEvent;
    /**
     * Console log formaté
     */
    private consoleLog;
    /**
     * Obtenir tous les logs
     */
    getLogs(): EventLogEntry[];
    /**
     * Obtenir logs filtrés par type
     */
    getLogsByType(type: string): EventLogEntry[];
    /**
     * Obtenir logs dans une période
     */
    getLogsByTimeRange(start: Date, end: Date): EventLogEntry[];
    /**
     * Clear tous les logs
     */
    clear(): void;
    /**
     * Compter les events par type
     */
    getStats(): Record<string, number>;
    /**
     * Export logs en JSON
     */
    exportJSON(): string;
    /**
     * Export logs en CSV
     */
    exportCSV(): string;
}
//# sourceMappingURL=EventLogger.d.ts.map