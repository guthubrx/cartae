/**
 * Cartae - Queue Manager (BullMQ)
 * Session 81c - Redis Cache + Queue
 *
 * Gestion centralisée des queues avec BullMQ:
 * - Email queue (notifications, invites, etc.)
 * - Export queue (CSV, PDF, etc.)
 * - Sync queue (Office365, Gmail, etc.)
 * - Cleanup queue (old tokens, sessions, etc.)
 */

import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

export type QueueName = 'email' | 'export' | 'sync' | 'cleanup';

export interface QueueConfig {
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions?: JobsOptions;
}

/**
 * Queue Manager - Centralized queue management
 */
export class QueueManager {
  private queues: Map<QueueName, Queue> = new Map();
  private connection: Redis;

  constructor(config: QueueConfig = {}) {
    // Shared Redis connection for all queues
    this.connection = new Redis({
      host: config.redis?.host || process.env.REDIS_HOST || 'localhost',
      port: config.redis?.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config.redis?.password || process.env.REDIS_PASSWORD,
      db: config.redis?.db || parseInt(process.env.REDIS_QUEUE_DB || '1'),
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false, // Required for BullMQ
    });

    // Initialize queues
    this.initializeQueues(config.defaultJobOptions);
  }

  private initializeQueues(defaultJobOptions?: JobsOptions): void {
    const queueNames: QueueName[] = ['email', 'export', 'sync', 'cleanup'];

    queueNames.forEach((name) => {
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 1000, // Keep last 1000 failed jobs
          ...defaultJobOptions,
        },
      });

      this.queues.set(name, queue);
      console.log(`[QueueManager] Queue '${name}' initialized`);
    });
  }

  /**
   * Get queue by name
   */
  getQueue(name: QueueName): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue '${name}' not found`);
    }
    return queue;
  }

  /**
   * Add job to queue
   */
  async addJob(
    queueName: QueueName,
    jobName: string,
    data: any,
    options?: JobsOptions
  ) {
    const queue = this.getQueue(queueName);
    return await queue.add(jobName, data, options);
  }

  /**
   * Close all queues
   */
  async close(): Promise<void> {
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close())
    );
    await this.connection.quit();
  }
}

// Singleton instance
let queueManagerInstance: QueueManager | null = null;

export function getQueueManager(config?: QueueConfig): QueueManager {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager(config);
  }
  return queueManagerInstance;
}

export async function closeQueueManager(): Promise<void> {
  if (queueManagerInstance) {
    await queueManagerInstance.close();
    queueManagerInstance = null;
  }
}
