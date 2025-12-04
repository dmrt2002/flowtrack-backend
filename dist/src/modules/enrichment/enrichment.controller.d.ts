import { EnrichmentService } from './services/enrichment.service';
import { EnrichmentQueueService } from './services/enrichment-queue.service';
import { PrismaService } from 'src/prisma/prisma.service';
export declare class EnrichmentController {
    private enrichmentService;
    private enrichmentQueue;
    private prisma;
    constructor(enrichmentService: EnrichmentService, enrichmentQueue: EnrichmentQueueService, prisma: PrismaService);
    enrichLead(workspaceId: string, leadId: string): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
        leadId?: undefined;
    } | {
        success: boolean;
        message: string;
        leadId: string;
        error?: undefined;
    }>;
    getEnrichment(workspaceId: string, leadId: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
        status?: undefined;
        enrichedAt?: undefined;
    } | {
        success: boolean;
        data: import("@prisma/client/runtime/library").JsonValue;
        status: import("@prisma/client").$Enums.EnrichmentStatus | null;
        enrichedAt: Date | null;
        error?: undefined;
    }>;
    getQueueStatus(): Promise<{
        success: boolean;
        queue: {
            waiting: number;
            active: number;
            completed: number;
            failed: number;
        };
    }>;
    bulkEnrich(workspaceId: string): Promise<{
        success: boolean;
        message: string;
        count: number;
    }>;
}
