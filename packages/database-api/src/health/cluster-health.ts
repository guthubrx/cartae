// Health Check System for HA Cluster
// Session 81f - High Availability & Load Balancing
// Cartae Database API

import express, { Request, Response } from 'express';
import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';
import os from 'os';

const router = express.Router();

// ============================================================
// Types & Interfaces
// ============================================================

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  instance: string;
  timestamp: string;
  checks: {
    database: HealthStatus;
    redis: HealthStatus;
    memory: HealthStatus;
    cpu: HealthStatus;
    disk: HealthStatus;
  };
  uptime: number;
  version: string;
}

interface HealthStatus {
  status: 'ok' | 'degraded' | 'failed';
  latency?: number;
  message?: string;
  details?: Record<string, any>;
}

interface ReadinessCheck {
  ready: boolean;
  instance: string;
  timestamp: string;
  reasons?: string[];
}

interface LivenessCheck {
  alive: boolean;
  instance: string;
  timestamp: string;
}

interface DetailedHealth extends HealthCheck {
  system: {
    hostname: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    processId: number;
    cpuCount: number;
    totalMemoryGB: number;
    freeMemoryGB: number;
    loadAverage: number[];
  };
  connections: {
    active: number;
    idle: number;
    waiting: number;
  };
}

// ============================================================
// Configuration
// ============================================================

const INSTANCE_ID = process.env.INSTANCE_ID || 'unknown';
const VERSION = process.env.npm_package_version || '1.0.0';

// Health thresholds
const THRESHOLDS = {
  memory: {
    degraded: 85,
    critical: 95,
  },
  cpu: {
    degraded: 80,
    critical: 95,
  },
  disk: {
    degraded: 85,
    critical: 95,
  },
  latency: {
    database: {
      degraded: 100,  // ms
      critical: 500,
    },
    redis: {
      degraded: 50,
      critical: 200,
    },
  },
};

// ============================================================
// Health Check Endpoints
// ============================================================

/**
 * Health endpoint (for load balancer)
 * Returns 200 if healthy, 503 if unhealthy
 */
router.get('/health', async (req: Request, res: Response) => {
  const start = Date.now();

  try {
    const health: HealthCheck = {
      status: 'healthy',
      instance: INSTANCE_ID,
      timestamp: new Date().toISOString(),
      checks: {
        database: await checkDatabase(),
        redis: await checkRedis(),
        memory: checkMemory(),
        cpu: checkCPU(),
        disk: await checkDisk(),
      },
      uptime: process.uptime(),
      version: VERSION,
    };

    // Determine overall status
    const checks = Object.values(health.checks);
    if (checks.some(c => c.status === 'failed')) {
      health.status = 'unhealthy';
    } else if (checks.some(c => c.status === 'degraded')) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    const duration = Date.now() - start;

    res.status(statusCode).json({
      ...health,
      checkDurationMs: duration,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      instance: INSTANCE_ID,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checkDurationMs: Date.now() - start,
    });
  }
});

/**
 * Detailed health endpoint (for debugging)
 */
router.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const baseHealth = await getBaseHealth();

    const detailedHealth: DetailedHealth = {
      ...baseHealth,
      system: getSystemInfo(),
      connections: await getConnectionStats(),
    };

    const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      instance: INSTANCE_ID,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Readiness probe (can accept traffic?)
 * Used by Kubernetes/orchestrators to determine if instance should receive traffic
 */
router.get('/ready', async (req: Request, res: Response) => {
  const start = Date.now();

  try {
    const reasons: string[] = [];
    let ready = true;

    // Check database connection
    const dbCheck = await checkDatabase();
    if (dbCheck.status === 'failed') {
      ready = false;
      reasons.push(`Database: ${dbCheck.message}`);
    }

    // Check Redis connection
    const redisCheck = await checkRedis();
    if (redisCheck.status === 'failed') {
      ready = false;
      reasons.push(`Redis: ${redisCheck.message}`);
    }

    // Check memory
    const memCheck = checkMemory();
    if (memCheck.status === 'failed') {
      ready = false;
      reasons.push(`Memory: ${memCheck.message}`);
    }

    const response: ReadinessCheck = {
      ready,
      instance: INSTANCE_ID,
      timestamp: new Date().toISOString(),
    };

    if (!ready) {
      response.reasons = reasons;
    }

    const statusCode = ready ? 200 : 503;
    res.status(statusCode).json({
      ...response,
      checkDurationMs: Date.now() - start,
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      instance: INSTANCE_ID,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checkDurationMs: Date.now() - start,
    });
  }
});

/**
 * Liveness probe (is process alive?)
 * Used by Kubernetes/orchestrators to determine if instance should be restarted
 */
router.get('/live', (req: Request, res: Response) => {
  const response: LivenessCheck = {
    alive: true,
    instance: INSTANCE_ID,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
});

/**
 * Startup probe (has application started?)
 * Used during initial startup to avoid premature health checks
 */
router.get('/startup', async (req: Request, res: Response) => {
  try {
    // Check if critical dependencies are initialized
    const dbCheck = await checkDatabase();
    const started = dbCheck.status !== 'failed';

    const statusCode = started ? 200 : 503;
    res.status(statusCode).json({
      started,
      instance: INSTANCE_ID,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      started: false,
      instance: INSTANCE_ID,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================
// Health Check Functions
// ============================================================

/**
 * Check PostgreSQL database connection
 */
async function checkDatabase(): Promise<HealthStatus> {
  const start = Date.now();

  try {
    // Create a temporary pool for health check
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'cartae',
      user: process.env.POSTGRES_USER || 'cartae_user',
      password: process.env.POSTGRES_PASSWORD,
      max: 1,
      connectionTimeoutMillis: 3000,
    });

    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();

    const latency = Date.now() - start;

    if (latency > THRESHOLDS.latency.database.critical) {
      return {
        status: 'failed',
        latency,
        message: `Database latency too high: ${latency}ms`,
      };
    } else if (latency > THRESHOLDS.latency.database.degraded) {
      return {
        status: 'degraded',
        latency,
        message: `Database latency degraded: ${latency}ms`,
      };
    }

    return {
      status: 'ok',
      latency,
    };
  } catch (error) {
    return {
      status: 'failed',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check Redis connection
 */
async function checkRedis(): Promise<HealthStatus> {
  const start = Date.now();

  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 3000,
      lazyConnect: true,
    });

    await redis.connect();
    await redis.ping();
    await redis.disconnect();

    const latency = Date.now() - start;

    if (latency > THRESHOLDS.latency.redis.critical) {
      return {
        status: 'failed',
        latency,
        message: `Redis latency too high: ${latency}ms`,
      };
    } else if (latency > THRESHOLDS.latency.redis.degraded) {
      return {
        status: 'degraded',
        latency,
        message: `Redis latency degraded: ${latency}ms`,
      };
    }

    return {
      status: 'ok',
      latency,
    };
  } catch (error) {
    return {
      status: 'failed',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthStatus {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;

  const details = {
    heapUsedMB: Math.round(heapUsedMB),
    heapTotalMB: Math.round(heapTotalMB),
    usagePercent: Math.round(usagePercent),
    rssMB: Math.round(usage.rss / 1024 / 1024),
    externalMB: Math.round(usage.external / 1024 / 1024),
  };

  if (usagePercent > THRESHOLDS.memory.critical) {
    return {
      status: 'failed',
      message: `Critical memory usage: ${usagePercent.toFixed(1)}%`,
      details,
    };
  } else if (usagePercent > THRESHOLDS.memory.degraded) {
    return {
      status: 'degraded',
      message: `High memory usage: ${usagePercent.toFixed(1)}%`,
      details,
    };
  }

  return {
    status: 'ok',
    details,
  };
}

/**
 * Check CPU usage
 */
function checkCPU(): HealthStatus {
  const cpuUsage = process.cpuUsage();
  const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
  const uptime = process.uptime();
  const cpuPercent = (totalUsage / uptime) * 100;

  const loadAverage = os.loadavg();
  const cpuCount = os.cpus().length;
  const normalizedLoad = (loadAverage[0] / cpuCount) * 100;

  const details = {
    cpuPercent: Math.round(cpuPercent),
    loadAverage: loadAverage.map(l => Math.round(l * 100) / 100),
    cpuCount,
    normalizedLoad: Math.round(normalizedLoad),
  };

  if (normalizedLoad > THRESHOLDS.cpu.critical) {
    return {
      status: 'failed',
      message: `Critical CPU load: ${normalizedLoad.toFixed(1)}%`,
      details,
    };
  } else if (normalizedLoad > THRESHOLDS.cpu.degraded) {
    return {
      status: 'degraded',
      message: `High CPU load: ${normalizedLoad.toFixed(1)}%`,
      details,
    };
  }

  return {
    status: 'ok',
    details,
  };
}

/**
 * Check disk usage
 */
async function checkDisk(): Promise<HealthStatus> {
  // Simplified disk check (would need OS-specific implementation for real usage)
  // This is a placeholder that always returns OK
  return {
    status: 'ok',
    details: {
      note: 'Disk check not implemented',
    },
  };
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get base health check
 */
async function getBaseHealth(): Promise<HealthCheck> {
  return {
    status: 'healthy',
    instance: INSTANCE_ID,
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memory: checkMemory(),
      cpu: checkCPU(),
      disk: await checkDisk(),
    },
    uptime: process.uptime(),
    version: VERSION,
  };
}

/**
 * Get system information
 */
function getSystemInfo() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    processId: process.pid,
    cpuCount: os.cpus().length,
    totalMemoryGB: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 100) / 100,
    freeMemoryGB: Math.round((os.freemem() / 1024 / 1024 / 1024) * 100) / 100,
    loadAverage: os.loadavg(),
  };
}

/**
 * Get connection statistics
 */
async function getConnectionStats() {
  // Placeholder - would need actual connection tracking
  return {
    active: 0,
    idle: 0,
    waiting: 0,
  };
}

// ============================================================
// Export
// ============================================================

export default router;
