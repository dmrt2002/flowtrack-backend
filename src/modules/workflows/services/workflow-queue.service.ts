import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class WorkflowQueueService {
  private readonly logger = new Logger(WorkflowQueueService.name);

  constructor(
    @InjectQueue('workflow-execution')
    private workflowQueue: Queue,
  ) {}

  /**
   * Enqueue a workflow execution for immediate processing
   */
  async enqueueExecution(executionId: string): Promise<void> {
    this.logger.log(`Enqueueing workflow execution: ${executionId}`);

    await this.workflowQueue.add(
      'execute-workflow',
      { executionId },
      {
        jobId: `execution-${executionId}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Successfully enqueued execution: ${executionId}`);
  }

  /**
   * Enqueue a delayed workflow execution (for resume after delay)
   */
  async enqueueDelayedExecution(
    executionId: string,
    fromStep: number,
    delayMs: number,
  ): Promise<void> {
    this.logger.log(
      `Enqueueing delayed execution: ${executionId} (delay: ${delayMs}ms, from step: ${fromStep})`,
    );

    await this.workflowQueue.add(
      'execute-delayed-step',
      { executionId, fromStep },
      {
        delay: delayMs,
        jobId: `delayed-${executionId}-${fromStep}-${Date.now()}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Successfully enqueued delayed execution: ${executionId}`,
    );
  }

  /**
   * Get queue metrics for monitoring
   */
  async getQueueMetrics() {
    const waiting = await this.workflowQueue.getWaitingCount();
    const active = await this.workflowQueue.getActiveCount();
    const delayed = await this.workflowQueue.getDelayedCount();
    const failed = await this.workflowQueue.getFailedCount();

    return { waiting, active, delayed, failed };
  }
}
