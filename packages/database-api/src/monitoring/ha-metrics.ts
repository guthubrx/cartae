// High Availability Metrics
// Session 81f - High Availability & Load Balancing
// Cartae Database API - Prometheus Metrics

import { Counter, Gauge, Histogram, Summary, register } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// ============================================================
// Configuration
// ============================================================

const INSTANCE_ID = process.env.INSTANCE_ID || 'unknown';
const DEFAULT_BUCKETS = [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10];

// ============================================================
// Load Balancer Metrics
// ============================================================

/**
 * Total requests through load balancer
 */
export const lbRequestsTotal = new Counter({
  name: 'lb_requests_total',
  help: 'Total requests through load balancer',
  labelNames: ['instance', 'method', 'status', 'path'],
  registers: [register],
});

/**
 * Request distribution across instances
 */
export const requestDistribution = new Counter({
  name: 'request_distribution_total',
  help: 'Request distribution across instances',
  labelNames: ['instance'],
  registers: [register],
});

/**
 * Active connections per instance
 */
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Active connections per instance',
  labelNames: ['instance'],
  registers: [register],
});

/**
 * Request duration histogram
 */
export const requestDuration = new Histogram({
  name: 'request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['instance', 'method', 'path', 'status'],
  buckets: DEFAULT_BUCKETS,
  registers: [register],
});

/**
 * Request size histogram
 */
export const requestSize = new Histogram({
  name: 'request_size_bytes',
  help: 'Request size in bytes',
  labelNames: ['instance', 'method', 'path'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

/**
 * Response size histogram
 */
export const responseSize = new Histogram({
  name: 'response_size_bytes',
  help: 'Response size in bytes',
  labelNames: ['instance', 'method', 'path', 'status'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// ============================================================
// Health Check Metrics
// ============================================================

/**
 * Instance health status (1=healthy, 0=unhealthy)
 */
export const instanceHealth = new Gauge({
  name: 'instance_health',
  help: 'Instance health status (1=healthy, 0.5=degraded, 0=unhealthy)',
  labelNames: ['instance'],
  registers: [register],
});

/**
 * Health check duration
 */
export const healthCheckDuration = new Histogram({
  name: 'health_check_duration_seconds',
  help: 'Health check duration in seconds',
  labelNames: ['check_type', 'instance'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Health check failures
 */
export const healthCheckFailures = new Counter({
  name: 'health_check_failures_total',
  help: 'Total health check failures',
  labelNames: ['check_type', 'instance'],
  registers: [register],
});

/**
 * Database latency
 */
export const databaseLatency = new Histogram({
  name: 'database_latency_seconds',
  help: 'Database query latency in seconds',
  labelNames: ['instance', 'query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Redis latency
 */
export const redisLatency = new Histogram({
  name: 'redis_latency_seconds',
  help: 'Redis operation latency in seconds',
  labelNames: ['instance', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// ============================================================
// System Metrics
// ============================================================

/**
 * Memory usage
 */
export const memoryUsage = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['instance', 'type'],
  registers: [register],
});

/**
 * CPU usage
 */
export const cpuUsage = new Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage',
  labelNames: ['instance'],
  registers: [register],
});

/**
 * Process uptime
 */
export const processUptime = new Gauge({
  name: 'process_uptime_seconds',
  help: 'Process uptime in seconds',
  labelNames: ['instance'],
  registers: [register],
});

// ============================================================
// Database Pool Metrics
// ============================================================

/**
 * Database pool size
 */
export const dbPoolSize = new Gauge({
  name: 'db_pool_size',
  help: 'Database connection pool size',
  labelNames: ['instance', 'state'],
  registers: [register],
});

/**
 * Database queries total
 */
export const dbQueriesTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total database queries',
  labelNames: ['instance', 'query_type', 'status'],
  registers: [register],
});

/**
 * Database query errors
 */
export const dbQueryErrors = new Counter({
  name: 'db_query_errors_total',
  help: 'Total database query errors',
  labelNames: ['instance', 'error_type'],
  registers: [register],
});

// ============================================================
// Cache Metrics
// ============================================================

/**
 * Cache hits
 */
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['instance', 'cache_type'],
  registers: [register],
});

/**
 * Cache misses
 */
export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['instance', 'cache_type'],
  registers: [register],
});

/**
 * Cache hit rate
 */
export const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate (0-1)',
  labelNames: ['instance', 'cache_type'],
  registers: [register],
});

// ============================================================
// Error Metrics
// ============================================================

/**
 * Errors total
 */
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total errors',
  labelNames: ['instance', 'error_type', 'severity'],
  registers: [register],
});

/**
 * HTTP errors
 */
export const httpErrors = new Counter({
  name: 'http_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['instance', 'status_code', 'path'],
  registers: [register],
});

// ============================================================
// Middleware Functions
// ============================================================

/**
 * HA metrics middleware
 * Tracks requests, responses, and timing
 */
export function haMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Increment connection counter
  activeConnections.inc({ instance: INSTANCE_ID });

  // Track request
  requestDistribution.inc({ instance: INSTANCE_ID });

  // Track request size
  const requestSizeBytes = parseInt(req.get('content-length') || '0', 10);
  if (requestSizeBytes > 0) {
    requestSize.observe(
      {
        instance: INSTANCE_ID,
        method: req.method,
        path: normalizePath(req.path),
      },
      requestSizeBytes
    );
  }

  // Hook into response finish
  res.on('finish', () => {
    // Decrement connection counter
    activeConnections.dec({ instance: INSTANCE_ID });

    // Calculate duration
    const duration = (Date.now() - start) / 1000;

    const labels = {
      instance: INSTANCE_ID,
      method: req.method,
      path: normalizePath(req.path),
      status: res.statusCode.toString(),
    };

    // Track request
    lbRequestsTotal.inc(labels);

    // Track duration
    requestDuration.observe(labels, duration);

    // Track response size
    const responseSizeBytes = parseInt(res.get('content-length') || '0', 10);
    if (responseSizeBytes > 0) {
      responseSize.observe(labels, responseSizeBytes);
    }

    // Track errors
    if (res.statusCode >= 400) {
      httpErrors.inc({
        instance: INSTANCE_ID,
        status_code: res.statusCode.toString(),
        path: normalizePath(req.path),
      });
    }
  });

  next();
}

/**
 * Update system metrics
 * Should be called periodically (e.g., every 10 seconds)
 */
export function updateSystemMetrics() {
  const memUsage = process.memoryUsage();

  // Memory metrics
  memoryUsage.set({ instance: INSTANCE_ID, type: 'heapUsed' }, memUsage.heapUsed);
  memoryUsage.set({ instance: INSTANCE_ID, type: 'heapTotal' }, memUsage.heapTotal);
  memoryUsage.set({ instance: INSTANCE_ID, type: 'rss' }, memUsage.rss);
  memoryUsage.set({ instance: INSTANCE_ID, type: 'external' }, memUsage.external);

  // CPU metrics
  const cpuUsageValue = process.cpuUsage();
  const totalUsage = (cpuUsageValue.user + cpuUsageValue.system) / 1000000; // Convert to seconds
  const uptime = process.uptime();
  const cpuPercent = (totalUsage / uptime) * 100;
  cpuUsage.set({ instance: INSTANCE_ID }, cpuPercent);

  // Uptime
  processUptime.set({ instance: INSTANCE_ID }, uptime);
}

/**
 * Update health metrics
 */
export function updateHealthMetrics(status: 'healthy' | 'degraded' | 'unhealthy') {
  let value = 0;
  if (status === 'healthy') value = 1;
  else if (status === 'degraded') value = 0.5;

  instanceHealth.set({ instance: INSTANCE_ID }, value);
}

/**
 * Track health check
 */
export function trackHealthCheck(
  checkType: string,
  durationMs: number,
  success: boolean
) {
  const durationSeconds = durationMs / 1000;

  healthCheckDuration.observe(
    { check_type: checkType, instance: INSTANCE_ID },
    durationSeconds
  );

  if (!success) {
    healthCheckFailures.inc({ check_type: checkType, instance: INSTANCE_ID });
  }
}

/**
 * Track database query
 */
export function trackDatabaseQuery(
  queryType: string,
  durationMs: number,
  success: boolean,
  errorType?: string
) {
  const durationSeconds = durationMs / 1000;

  databaseLatency.observe(
    { instance: INSTANCE_ID, query_type: queryType },
    durationSeconds
  );

  dbQueriesTotal.inc({
    instance: INSTANCE_ID,
    query_type: queryType,
    status: success ? 'success' : 'error',
  });

  if (!success && errorType) {
    dbQueryErrors.inc({ instance: INSTANCE_ID, error_type: errorType });
  }
}

/**
 * Track Redis operation
 */
export function trackRedisOperation(
  operation: string,
  durationMs: number
) {
  const durationSeconds = durationMs / 1000;

  redisLatency.observe(
    { instance: INSTANCE_ID, operation },
    durationSeconds
  );
}

/**
 * Track cache operation
 */
export function trackCacheOperation(
  cacheType: string,
  hit: boolean
) {
  if (hit) {
    cacheHits.inc({ instance: INSTANCE_ID, cache_type: cacheType });
  } else {
    cacheMisses.inc({ instance: INSTANCE_ID, cache_type: cacheType });
  }

  // Update hit rate
  updateCacheHitRate(cacheType);
}

/**
 * Update cache hit rate
 */
function updateCacheHitRate(cacheType: string) {
  // This is a simplified calculation
  // In production, you'd want a sliding window
  const hits = cacheHits.hashMap[`instance:${INSTANCE_ID},cache_type:${cacheType}`]?.value || 0;
  const misses = cacheMisses.hashMap[`instance:${INSTANCE_ID},cache_type:${cacheType}`]?.value || 0;
  const total = hits + misses;

  if (total > 0) {
    const hitRate = hits / total;
    cacheHitRate.set({ instance: INSTANCE_ID, cache_type: cacheType }, hitRate);
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Normalize path for metrics (remove IDs)
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid');
}

/**
 * Start metrics collection
 * Call this on application startup
 */
export function startMetricsCollection(intervalMs: number = 10000) {
  // Update system metrics periodically
  setInterval(updateSystemMetrics, intervalMs);

  // Initial update
  updateSystemMetrics();
}

/**
 * Get all metrics
 */
export function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Clear all metrics (for testing)
 */
export function clearMetrics() {
  register.clear();
}

// ============================================================
// Export
// ============================================================

export default {
  middleware: haMetricsMiddleware,
  updateSystemMetrics,
  updateHealthMetrics,
  trackHealthCheck,
  trackDatabaseQuery,
  trackRedisOperation,
  trackCacheOperation,
  startMetricsCollection,
  getMetrics,
  clearMetrics,
};
