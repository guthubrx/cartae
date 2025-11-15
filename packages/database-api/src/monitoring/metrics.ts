/**
 * Cartae - Prometheus Metrics
 * Session 81d - Monitoring + Observability
 *
 * Prometheus client pour exposer les métriques de l'API
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a registry
export const register = new Registry();

// Collect default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register });

/**
 * HTTP Request Metrics
 */

// Total HTTP requests
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// HTTP request duration
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

/**
 * Database Metrics
 */

// Active database connections
export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// Database query duration
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// Database errors
export const dbErrorsTotal = new Counter({
  name: 'db_errors_total',
  help: 'Total number of database errors',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Cache Metrics (Redis)
 */

// Cache hits
export const cacheHitsTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_name'],
  registers: [register],
});

// Cache misses
export const cacheMissesTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_name'],
  registers: [register],
});

// Cache operation duration
export const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Duration of cache operations in seconds',
  labelNames: ['operation', 'cache_name'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
  registers: [register],
});

/**
 * Queue Metrics (BullMQ)
 */

// Jobs added to queue
export const queueJobsAdded = new Counter({
  name: 'queue_jobs_added_total',
  help: 'Total number of jobs added to queue',
  labelNames: ['queue_name', 'job_type'],
  registers: [register],
});

// Jobs completed
export const queueJobsCompleted = new Counter({
  name: 'queue_jobs_completed_total',
  help: 'Total number of jobs completed',
  labelNames: ['queue_name', 'job_type'],
  registers: [register],
});

// Jobs failed
export const queueJobsFailed = new Counter({
  name: 'queue_jobs_failed_total',
  help: 'Total number of jobs failed',
  labelNames: ['queue_name', 'job_type'],
  registers: [register],
});

// Job processing duration
export const queueJobDuration = new Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['queue_name', 'job_type'],
  buckets: [1, 5, 10, 30, 60, 300, 600],
  registers: [register],
});

// Active jobs
export const queueJobsActive = new Gauge({
  name: 'queue_jobs_active',
  help: 'Number of jobs currently being processed',
  labelNames: ['queue_name'],
  registers: [register],
});

/**
 * Business Metrics
 */

// Total users
export const usersTotal = new Gauge({
  name: 'users_total',
  help: 'Total number of registered users',
  registers: [register],
});

// Active users (logged in last 24h)
export const usersActive = new Gauge({
  name: 'users_active',
  help: 'Number of active users (last 24h)',
  registers: [register],
});

// API requests by endpoint
export const apiEndpointRequests = new Counter({
  name: 'api_endpoint_requests_total',
  help: 'Total requests per API endpoint',
  labelNames: ['endpoint', 'method'],
  registers: [register],
});

/**
 * Metrics Endpoint Handler
 */
export async function metricsHandler(req: any, res: any) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
}
