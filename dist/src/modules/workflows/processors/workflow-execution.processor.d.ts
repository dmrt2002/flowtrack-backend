import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WorkflowExecutorService } from '../services/workflow-executor.service';
export declare class WorkflowExecutionProcessor extends WorkerHost {
    private workflowExecutor;
    private readonly logger;
    constructor(workflowExecutor: WorkflowExecutorService);
    process(job: Job<any, any, string>): Promise<any>;
    private executeWorkflow;
    private executeDelayedStep;
}
