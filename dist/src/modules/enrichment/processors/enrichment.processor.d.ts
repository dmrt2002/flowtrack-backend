import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EnrichmentService } from '../services/enrichment.service';
import { EnrichmentJobData } from '../types/enrichment.types';
export declare class EnrichmentProcessor extends WorkerHost {
    private enrichmentService;
    private readonly logger;
    constructor(enrichmentService: EnrichmentService);
    process(job: Job<EnrichmentJobData, any, string>): Promise<any>;
    private enrichLead;
}
