import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SalesPitchService } from '../services/sales-pitch.service';
import { PitchGenerationJob } from '../services/pitch-queue.service';
export declare class PitchProcessor extends WorkerHost {
    private readonly pitchService;
    private readonly logger;
    constructor(pitchService: SalesPitchService);
    process(job: Job<PitchGenerationJob>): Promise<void>;
}
