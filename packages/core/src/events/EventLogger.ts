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

/* eslint-disable no-console */

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
export class EventLogger {
  private eventBus: EventBus;

  private options: Required<EventLoggerOptions>;

  private logs: EventLogEntry[];

  private startTime: Date | null;

  private unsubscribe: (() => void) | null;

  constructor(eventBus: EventBus, options: EventLoggerOptions = {}) {
    this.eventBus = eventBus;
    this.options = {
      filter: options.filter ?? [],
      exclude: options.exclude ?? [],
      maxEntries: options.maxEntries ?? 1000,
      console: options.console ?? true,
      consoleFormat: options.consoleFormat ?? 'compact',
    };
    this.logs = [];
    this.startTime = null;
    this.unsubscribe = null;
  }

  /**
   * Démarrer le logging
   */
  public start(): void {
    if (this.unsubscribe) {
      console.warn('[EventLogger] Already started');
      return;
    }

    this.startTime = new Date();
    this.logs = [];

    // Subscribe à wildcard (tous les events)
    this.unsubscribe = this.eventBus.on('*', (data: any) => {
      const { type, data: event } = data;
      this.logEvent(type, event);
    });

    if (this.options.console) {
      console.log('[EventLogger] Started logging events');
    }
  }

  /**
   * Arrêter le logging
   */
  public stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.options.console) {
      console.log(`[EventLogger] Stopped logging (${this.logs.length} events logged)`);
    }
  }

  /**
   * Log un événement
   */
  private logEvent(type: string, event: unknown): void {
    // Apply filters
    if (this.options.filter.length > 0 && !this.options.filter.includes(type)) {
      return;
    }

    if (this.options.exclude.includes(type)) {
      return;
    }

    // Create log entry
    const entry: EventLogEntry = {
      type,
      event,
      timestamp: new Date(),
      elapsed: this.startTime ? Date.now() - this.startTime.getTime() : 0,
    };

    // Add to logs
    this.logs.push(entry);

    // Trim if too many
    if (this.logs.length > this.options.maxEntries) {
      this.logs.shift();
    }

    // Console log
    if (this.options.console) {
      this.consoleLog(entry);
    }
  }

  /**
   * Console log formaté
   */
  private consoleLog(entry: EventLogEntry): void {
    const elapsed = `+${entry.elapsed}ms`;

    switch (this.options.consoleFormat) {
      case 'compact':
        console.log(`[${elapsed}] ${entry.type}`);
        break;

      case 'detailed':
        console.log(`[${elapsed}] ${entry.type}`, entry.event);
        break;

      case 'json':
        console.log(JSON.stringify(entry, null, 2));
        break;

      default:
        // Tous les cas sont couverts par le type
        break;
    }
  }

  /**
   * Obtenir tous les logs
   */
  public getLogs(): EventLogEntry[] {
    return [...this.logs];
  }

  /**
   * Obtenir logs filtrés par type
   */
  public getLogsByType(type: string): EventLogEntry[] {
    return this.logs.filter(log => log.type === type);
  }

  /**
   * Obtenir logs dans une période
   */
  public getLogsByTimeRange(start: Date, end: Date): EventLogEntry[] {
    return this.logs.filter(log => log.timestamp >= start && log.timestamp <= end);
  }

  /**
   * Clear tous les logs
   */
  public clear(): void {
    this.logs = [];
    this.startTime = new Date();
  }

  /**
   * Compter les events par type
   */
  public getStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    this.logs.forEach(log => {
      stats[log.type] = (stats[log.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export logs en JSON
   */
  public exportJSON(): string {
    return JSON.stringify(
      {
        startTime: this.startTime,
        totalEvents: this.logs.length,
        stats: this.getStats(),
        logs: this.logs,
      },
      null,
      2
    );
  }

  /**
   * Export logs en CSV
   */
  public exportCSV(): string {
    const header = 'Type,Timestamp,Elapsed,Data\n';
    const rows = this.logs
      .map(log => {
        const data = JSON.stringify(log.event).replace(/"/g, '""');
        return `"${log.type}","${log.timestamp.toISOString()}",${log.elapsed},"${data}"`;
      })
      .join('\n');

    return header + rows;
  }
}
