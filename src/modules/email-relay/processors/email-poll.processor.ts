import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ImapPollerService } from '../services/imap-poller.service';

@Processor('email-relay-poll', { concurrency: 1 })
export class EmailPollProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailPollProcessor.name);

  constructor(private imapPollerService: ImapPollerService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing email polling job: ${job.id}`);

    const startTime = Date.now();

    try {
      await this.imapPollerService.pollInbox();

      const duration = Date.now() - startTime;
      this.logger.log(`Email polling completed in ${duration}ms`);

      return {
        success: true,
        timestamp: new Date(),
        duration,
      };
    } catch (error) {
      this.logger.error('Email polling job failed', error);

      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
