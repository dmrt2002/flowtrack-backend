import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PollingQueueService implements OnModuleInit {
  private readonly logger = new Logger(PollingQueueService.name);

  constructor(
    @InjectQueue('booking-polling') private pollingQueue: Queue,
    private config: ConfigService,
  ) {}

  /**
   * Initialize repeatable jobs on module startup
   */
  async onModuleInit() {
    // Set up cron job for polling Calendly FREE accounts
    // Poll every 6 hours to stay within rate limits
    await this.schedulePolling();
    this.logger.log('Polling cron jobs initialized');
  }

  /**
   * Schedule polling jobs
   */
  async schedulePolling() {
    // Remove any existing repeatable jobs first
    const repeatableJobs = await this.pollingQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await this.pollingQueue.removeRepeatableByKey(job.key);
    }

    // Schedule Calendly FREE account polling every 6 hours
    await this.pollingQueue.add(
      'poll-calendly-free-accounts',
      {},
      {
        repeat: {
          pattern: '0 */6 * * *', // Every 6 hours
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute
        },
      },
    );

    this.logger.log('Scheduled Calendly FREE account polling (every 6 hours)');
  }

  /**
   * Manually trigger polling (for testing or admin use)
   */
  async triggerManualPolling() {
    await this.pollingQueue.add('poll-calendly-free-accounts', {}, {
      priority: 1, // High priority
    });

    this.logger.log('Manual polling job triggered');
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.pollingQueue.getWaitingCount(),
      this.pollingQueue.getActiveCount(),
      this.pollingQueue.getCompletedCount(),
      this.pollingQueue.getFailedCount(),
      this.pollingQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Get recent jobs from queue
   */
  async getRecentJobs(limit: number = 10) {
    const jobs = await this.pollingQueue.getJobs(
      ['completed', 'failed', 'active', 'waiting'],
      0,
      limit,
    );

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
    }));
  }

  /**
   * Pause queue
   */
  async pauseQueue() {
    await this.pollingQueue.pause();
    this.logger.log('Polling queue paused');
  }

  /**
   * Resume queue
   */
  async resumeQueue() {
    await this.pollingQueue.resume();
    this.logger.log('Polling queue resumed');
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs() {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS = 7 * ONE_DAY;

    await this.pollingQueue.clean(ONE_DAY, 10, 'completed');
    await this.pollingQueue.clean(SEVEN_DAYS, 10, 'failed');

    this.logger.log('Cleaned up old queue jobs');
  }
}
