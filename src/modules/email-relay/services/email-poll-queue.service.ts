import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailPollQueueService implements OnModuleInit {
  private readonly logger = new Logger(EmailPollQueueService.name);

  constructor(
    @InjectQueue('email-relay-poll') private emailPollQueue: Queue,
    private config: ConfigService,
  ) {}

  /**
   * Initialize repeatable jobs on module startup
   */
  async onModuleInit() {
    await this.schedulePolling();
    this.logger.log('Email polling cron jobs initialized');
  }

  /**
   * Schedule polling jobs
   */
  async schedulePolling() {
    // Remove any existing repeatable jobs first
    const repeatableJobs = await this.emailPollQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await this.emailPollQueue.removeRepeatableByKey(job.key);
    }

    const pollIntervalMinutes = this.config.get<number>(
      'EMAIL_POLL_INTERVAL_MINUTES',
      5,
    );

    // Schedule email polling every N minutes (default 5)
    await this.emailPollQueue.add(
      'poll-inbox',
      {},
      {
        repeat: {
          pattern: `*/${pollIntervalMinutes} * * * *`, // Every N minutes
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 seconds
        },
      },
    );

    this.logger.log(
      `Scheduled email polling (every ${pollIntervalMinutes} minutes)`,
    );
  }

  /**
   * Manually trigger polling (for testing or admin use)
   */
  async triggerManualPolling() {
    await this.emailPollQueue.add(
      'poll-inbox',
      {},
      {
        priority: 1, // High priority
      },
    );

    this.logger.log('Manual email polling job triggered');
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailPollQueue.getWaitingCount(),
      this.emailPollQueue.getActiveCount(),
      this.emailPollQueue.getCompletedCount(),
      this.emailPollQueue.getFailedCount(),
      this.emailPollQueue.getDelayedCount(),
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
   * Clear all jobs from the queue
   */
  async clearQueue() {
    await this.emailPollQueue.drain();
    this.logger.log('Email polling queue cleared');
  }
}
