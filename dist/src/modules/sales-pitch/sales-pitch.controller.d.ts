import { UserPayload } from '../../auth/decorators/user.decorator';
import { SalesPitchService } from './services/sales-pitch.service';
import { PitchQueueService } from './services/pitch-queue.service';
import { SalesPitchResponseDto, BatchGeneratePitchesDto, BatchGenerationJobResponseDto, BatchGenerationProgressDto } from './dto/pitch.dto';
export declare class SalesPitchController {
    private readonly pitchService;
    private readonly queueService;
    private readonly logger;
    constructor(pitchService: SalesPitchService, queueService: PitchQueueService);
    getSalesPitch(leadId: string, user: UserPayload & {
        workspaces: any[];
    }): Promise<SalesPitchResponseDto>;
    regeneratePitch(leadId: string, user: UserPayload & {
        workspaces: any[];
    }): Promise<SalesPitchResponseDto>;
    getPitchStatus(leadId: string, user: UserPayload & {
        workspaces: any[];
    }): Promise<{
        exists: boolean;
        generatedAt?: string;
    }>;
    batchGeneratePitches(dto: BatchGeneratePitchesDto, user: UserPayload & {
        workspaces: any[];
    }): Promise<BatchGenerationJobResponseDto>;
    getBatchProgress(jobId: string): Promise<BatchGenerationProgressDto>;
}
