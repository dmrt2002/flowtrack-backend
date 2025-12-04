import { Queue } from 'bullmq';
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
export declare class PitchQueueService {
    private readonly pitchQueue;
    private readonly logger;
    constructor(pitchQueue: Queue<PitchGenerationJob>);
    addBatchGenerationJob(workspaceId: string, leadIds: string[], userId: string): Promise<string>;
    getJobProgress(jobId: string): Promise<PitchGenerationProgress | null>;
    cancelJob(jobId: string): Promise<void>;
    getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    }>;
}
