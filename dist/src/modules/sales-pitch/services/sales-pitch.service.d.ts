import { PrismaService } from '../../../prisma/prisma.service';
import { OllamaPitchService } from './ollama-pitch.service';
import { PitchTemplateService } from './pitch-template.service';
import { PitchConfigService } from './pitch-config.service';
import { SalesPitch } from '../types/pitch.types';
export declare class SalesPitchService {
    private readonly prisma;
    private readonly ollamaPitch;
    private readonly templateService;
    private readonly configService;
    private readonly logger;
    private readonly CACHE_EXPIRY_DAYS;
    constructor(prisma: PrismaService, ollamaPitch: OllamaPitchService, templateService: PitchTemplateService, configService: PitchConfigService);
    generateOrGetCachedPitch(leadId: string, workspaceId: string): Promise<SalesPitch>;
    regeneratePitch(leadId: string, workspaceId: string): Promise<SalesPitch>;
    private buildPitchContext;
    getCachedPitch(leadId: string, workspaceId: string): Promise<SalesPitch | null>;
}
