import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkflowExecutorService } from '../services/workflow-executor.service';

@Processor('workflow-execution', {
  concurrency: 5, // Process up to 5 workflows concurrently
})
export class WorkflowExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowExecutionProcessor.name);

  constructor(private workflowExecutor: WorkflowExecutorService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job: ${job.name} (ID: ${job.id})`);

    try {
      switch (job.name) {
        case 'execute-workflow':
          await this.executeWorkflow(job);
          break;

        case 'execute-delayed-step':
          await this.executeDelayedStep(job);
          break;

        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Job failed: ${job.name}`, error);
      throw error; // BullMQ will retry based on job config
    }
  }

  /**
   * Handle immediate workflow execution
   */
  private async executeWorkflow(job: Job) {
    const { executionId } = job.data;
    this.logger.log(`Executing workflow: ${executionId}`);

    await this.workflowExecutor.execute(executionId);

    this.logger.log(`Workflow execution completed: ${executionId}`);
  }

  /**
   * Handle delayed step execution (resume after delay)
   */
  private async executeDelayedStep(job: Job) {
    const { executionId, fromStep } = job.data;
    this.logger.log(
      `Resuming workflow ${executionId} from step ${fromStep}`,
    );

    await this.workflowExecutor.execute(executionId, fromStep);

    this.logger.log(`Delayed workflow execution completed: ${executionId}`);
  }
}
