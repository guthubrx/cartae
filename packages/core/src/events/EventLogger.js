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
    eventBus;
    options;
    logs;
    startTime;
    unsubscribe;
    constructor(eventBus, options = {}) {
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
    start() {
        if (this.unsubscribe) {
            console.warn('[EventLogger] Already started');
            return;
        }
        this.startTime = new Date();
        this.logs = [];
        // Subscribe à wildcard (tous les events)
        this.unsubscribe = this.eventBus.on('*', (data) => {
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
    stop() {
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
    logEvent(type, event) {
        // Apply filters
        if (this.options.filter.length > 0 && !this.options.filter.includes(type)) {
            return;
        }
        if (this.options.exclude.includes(type)) {
            return;
        }
        // Create log entry
        const entry = {
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
    consoleLog(entry) {
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
    getLogs() {
        return [...this.logs];
    }
    /**
     * Obtenir logs filtrés par type
     */
    getLogsByType(type) {
        return this.logs.filter(log => log.type === type);
    }
    /**
     * Obtenir logs dans une période
     */
    getLogsByTimeRange(start, end) {
        return this.logs.filter(log => log.timestamp >= start && log.timestamp <= end);
    }
    /**
     * Clear tous les logs
     */
    clear() {
        this.logs = [];
        this.startTime = new Date();
    }
    /**
     * Compter les events par type
     */
    getStats() {
        const stats = {};
        this.logs.forEach(log => {
            stats[log.type] = (stats[log.type] || 0) + 1;
        });
        return stats;
    }
    /**
     * Export logs en JSON
     */
    exportJSON() {
        return JSON.stringify({
            startTime: this.startTime,
            totalEvents: this.logs.length,
            stats: this.getStats(),
            logs: this.logs,
        }, null, 2);
    }
    /**
     * Export logs en CSV
     */
    exportCSV() {
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
//# sourceMappingURL=EventLogger.js.map