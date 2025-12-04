import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EnrichmentJobData } from '../types/enrichment.types';

@Injectable()
export class EnrichmentQueueService {
  private readonly logger = new Logger(EnrichmentQueueService.name);

  constructor(
    @InjectQueue('lead-enrichment')
    private enrichmentQueue: Queue,
  ) {}

  /**
   * Enqueue a lead for enrichment
   */
  async enqueueEnrichment(jobData: EnrichmentJobData): Promise<void> {
    this.logger.log(`Enqueueing enrichment for lead: ${jobData.leadId}`);

    await this.enrichmentQueue.add(
      'enrich-lead',
      jobData,
      {
        jobId: `enrich-${jobData.leadId}`,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 seconds
        },
      },
    );

    this.logger.log(`Successfully enqueued enrichment for lead: ${jobData.leadId}`);
  }

  /**
   * Bulk enqueue multiple leads for enrichment
   */
  async bulkEnqueueEnrichment(jobs: EnrichmentJobData[]): Promise<void> {
    this.logger.log(`Bulk enqueueing ${jobs.length} leads for enrichment`);

    const bulkJobs = jobs.map((jobData) => ({
      name: 'enrich-lead',
      data: jobData,
      opts: {
        jobId: `enrich-${jobData.leadId}`,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }));

    await this.enrichmentQueue.addBulk(bulkJobs);

    this.logger.log(`Successfully enqueued ${jobs.length} leads for enrichment`);
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.enrichmentQueue.getWaitingCount(),
      this.enrichmentQueue.getActiveCount(),
      this.enrichmentQueue.getCompletedCount(),
      this.enrichmentQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
