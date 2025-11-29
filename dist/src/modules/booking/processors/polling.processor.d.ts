import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PollingService } from '../services/polling.service';
export declare class PollingProcessor extends WorkerHost {
    private pollingService;
    private readonly logger;
    constructor(pollingService: PollingService);
    process(job: Job<any, any, string>): Promise<any>;
}
