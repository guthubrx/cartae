/**
 * Prometheus Metrics - Monitoring et observabilité
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

/**
 * Collect default metrics (CPU, memory, etc.)
 */
import { collectDefaultMetrics } from 'prom-client';

// Registry global Prometheus
export const register = new Registry();

/**
 * Métriques HTTP
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Métriques Cache Redis
 */
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Duration of cache operations',
  labelNames: ['operation', 'cache_type'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1],
  registers: [register],
});

/**
 * Métriques Queue (BullMQ)
 */
export const queueJobsTotal = new Counter({
  name: 'queue_jobs_total',
  help: 'Total number of queue jobs',
  labelNames: ['queue_name', 'status'],
  registers: [register],
});

export const queueJobDuration = new Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Duration of queue job processing',
  labelNames: ['queue_name'],
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [register],
});

export const activeJobs = new Gauge({
  name: 'queue_active_jobs',
  help: 'Number of active jobs in queue',
  labelNames: ['queue_name'],
  registers: [register],
});

/**
 * Métriques Rate Limiting
 */
export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'client_id'],
  registers: [register],
});
collectDefaultMetrics({ register });
