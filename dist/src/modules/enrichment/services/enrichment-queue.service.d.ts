import { Queue } from 'bullmq';
import { EnrichmentJobData } from '../types/enrichment.types';
export declare class EnrichmentQueueService {
    private enrichmentQueue;
    private readonly logger;
    constructor(enrichmentQueue: Queue);
    enqueueEnrichment(jobData: EnrichmentJobData): Promise<void>;
    bulkEnqueueEnrichment(jobs: EnrichmentJobData[]): Promise<void>;
    getQueueStatus(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    }>;
}
