/**
 * Sales Pitch Processor
 *
 * BullMQ processor for batch pitch generation
 * Processes leads one by one with progress tracking
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SalesPitchService } from '../services/sales-pitch.service';
import { PitchGenerationJob } from '../services/pitch-queue.service';

@Processor('pitch-generation', {
  concurrency: 3, // Process 3 leads simultaneously
})
export class PitchProcessor extends WorkerHost {
  private readonly logger = new Logger(PitchProcessor.name);

  constructor(private readonly pitchService: SalesPitchService) {
    super();
  }

  async process(job: Job<PitchGenerationJob>): Promise<void> {
    const { workspaceId, leadIds } = job.data;

    this.logger.log(
      `Starting batch pitch generation for ${leadIds.length} leads`,
    );

    let completed = 0;
    let failed = 0;

    for (const leadId of leadIds) {
      try {
        // Generate pitch for this lead
        await this.pitchService.generateOrGetCachedPitch(leadId, workspaceId);

        completed++;
        this.logger.log(
          `Generated pitch for lead ${leadId} (${completed}/${leadIds.length})`,
        );

        // Update job progress
        await job.updateProgress({
          completed,
          failed,
          currentLeadId: leadId,
        });
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to generate pitch for lead ${leadId}: ${error.message}`,
        );

        // Continue with next lead instead of failing entire job
        await job.updateProgress({
          completed,
          failed,
          currentLeadId: leadId,
          lastError: error.message,
        });
      }
    }

    this.logger.log(
      `Batch generation complete: ${completed} succeeded, ${failed} failed`,
    );

    // Return summary
    return {
      completed,
      failed,
      total: leadIds.length,
    } as any;
  }
}
