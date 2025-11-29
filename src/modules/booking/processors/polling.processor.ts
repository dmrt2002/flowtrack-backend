import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PollingService } from '../services/polling.service';

@Processor('booking-polling', {
  concurrency: 1, // Process one at a time to avoid rate limits
})
export class PollingProcessor extends WorkerHost {
  private readonly logger = new Logger(PollingProcessor.name);

  constructor(private pollingService: PollingService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing polling job: ${job.name}`);

    try {
      switch (job.name) {
        case 'poll-calendly-free-accounts':
          await this.pollingService.pollAllCalendlyFreeAccounts();
          return { success: true };

        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
          return { success: false, error: 'Unknown job name' };
      }
    } catch (error: any) {
      this.logger.error(`Polling job failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
