/**
 * Sales Pitch Queue Service
 *
 * BullMQ queue for batch pitch generation
 * Handles job creation, progress tracking, and completion
 */

import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

export interface PitchGenerationJob {
  workspaceId: string;
  leadIds: string[];
  userId: string;
}

export interface PitchGenerationProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

@Injectable()
export class PitchQueueService {
  private readonly logger = new Logger(PitchQueueService.name);

  constructor(
    @InjectQueue('pitch-generation')
    private readonly pitchQueue: Queue<PitchGenerationJob>,
  ) {}

  /**
   * Add batch pitch generation job to queue
   */
  async addBatchGenerationJob(
    workspaceId: string,
    leadIds: string[],
    userId: string,
  ): Promise<string> {
    this.logger.log(
      `Adding batch pitch generation job for ${leadIds.length} leads`,
    );

    const job = await this.pitchQueue.add(
      'generate-batch',
      {
        workspaceId,
        leadIds,
        userId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 100,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    );

    this.logger.log(`Batch generation job created with ID: ${job.id}`);
    return job.id as string;
  }

  /**
   * Get job progress
   */
  async getJobProgress(jobId: string): Promise<PitchGenerationProgress | null> {
    const job = await this.pitchQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = (job.progress as any) || { completed: 0, failed: 0 };
    const data = job.data;

    return {
      total: data.leadIds.length,
      completed: progress.completed || 0,
      failed: progress.failed || 0,
      inProgress: state === 'active' || state === 'waiting',
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.pitchQueue.getJob(jobId);

    if (job) {
      await job.remove();
      this.logger.log(`Job ${jobId} cancelled`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.pitchQueue.getWaitingCount(),
      this.pitchQueue.getActiveCount(),
      this.pitchQueue.getCompletedCount(),
      this.pitchQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }
}
