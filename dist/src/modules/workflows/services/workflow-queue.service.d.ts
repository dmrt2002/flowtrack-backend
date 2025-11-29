import { Queue } from 'bullmq';
export declare class WorkflowQueueService {
    private workflowQueue;
    private readonly logger;
    constructor(workflowQueue: Queue);
    enqueueExecution(executionId: string): Promise<void>;
    enqueueDelayedExecution(executionId: string, fromStep: number, delayMs: number): Promise<void>;
    getQueueMetrics(): Promise<{
        waiting: number;
        active: number;
        delayed: number;
        failed: number;
    }>;
}
