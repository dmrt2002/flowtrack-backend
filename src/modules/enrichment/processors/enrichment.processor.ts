import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EnrichmentService } from '../services/enrichment.service';
import { EnrichmentJobData } from '../types/enrichment.types';

@Processor('lead-enrichment', {
  concurrency: 3, // Process up to 3 enrichments concurrently
})
export class EnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(EnrichmentProcessor.name);

  constructor(private enrichmentService: EnrichmentService) {
    super();
  }

  async process(job: Job<EnrichmentJobData, any, string>): Promise<any> {
    this.logger.log(`Processing enrichment job: ${job.name} (ID: ${job.id})`);

    try {
      switch (job.name) {
        case 'enrich-lead':
          return await this.enrichLead(job);

        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
          return { success: false, error: 'Unknown job type' };
      }
    } catch (error) {
      this.logger.error(
        `Enrichment job failed: ${job.name} (Lead: ${job.data.leadId})`,
        error.stack,
      );
      throw error; // BullMQ will retry based on job config
    }
  }

  /**
   * Handle lead enrichment
   */
  private async enrichLead(job: Job<EnrichmentJobData>) {
    const { leadId, email, name, companyName, retryCount = 0 } = job.data;

    this.logger.log(
      `Enriching lead ${leadId} (${email}) - Attempt ${retryCount + 1}`,
    );

    const result = await this.enrichmentService.enrichLead(
      leadId,
      email,
      name,
      companyName,
    );

    if (result.success) {
      this.logger.log(`Successfully enriched lead ${leadId}`);
    } else if (result.skipped) {
      this.logger.warn(
        `Skipped enrichment for lead ${leadId}: ${result.skipReason}`,
      );
    } else {
      this.logger.error(
        `Failed to enrich lead ${leadId}: ${result.error}`,
      );
    }

    return result;
  }
}
