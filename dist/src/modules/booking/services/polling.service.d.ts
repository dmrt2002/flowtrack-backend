import { PrismaService } from '../../../prisma/prisma.service';
import { CalendlyService } from './calendly.service';
import { TokenManagerService } from './token-manager.service';
export declare class PollingService {
    private prisma;
    private calendlyService;
    private tokenManager;
    private readonly logger;
    constructor(prisma: PrismaService, calendlyService: CalendlyService, tokenManager: TokenManagerService);
    pollAllCalendlyFreeAccounts(): Promise<void>;
    getPollingStats(workspaceId: string): Promise<{
        credentialId: string;
        providerEmail: string | null;
        pollingLastRunAt: Date | null;
        recentJobs: {
            id: string;
            status: import("@prisma/client").$Enums.PollingJobStatus;
            completedAt: Date | null;
            errorMessage: string | null;
            oauthCredentialId: string;
            eventsFetched: number;
            eventsCreated: number;
            eventsUpdated: number;
            startedAt: Date;
            eventsSkipped: number;
            errorDetails: import("@prisma/client/runtime/library").JsonValue | null;
            apiCallsMade: number;
            durationMs: number | null;
        }[];
    }[]>;
    getPollingJob(jobId: string): Promise<({
        oauthCredential: {
            workspaceId: string | null;
            providerType: import("@prisma/client").$Enums.OAuthProviderType;
            providerEmail: string | null;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.PollingJobStatus;
        completedAt: Date | null;
        errorMessage: string | null;
        oauthCredentialId: string;
        eventsFetched: number;
        eventsCreated: number;
        eventsUpdated: number;
        startedAt: Date;
        eventsSkipped: number;
        errorDetails: import("@prisma/client/runtime/library").JsonValue | null;
        apiCallsMade: number;
        durationMs: number | null;
    }) | null>;
    getRecentPollingJobs(credentialId: string, limit?: number): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.PollingJobStatus;
        completedAt: Date | null;
        errorMessage: string | null;
        oauthCredentialId: string;
        eventsFetched: number;
        eventsCreated: number;
        eventsUpdated: number;
        startedAt: Date;
        eventsSkipped: number;
        errorDetails: import("@prisma/client/runtime/library").JsonValue | null;
        apiCallsMade: number;
        durationMs: number | null;
    }[]>;
    cleanupOldPollingJobs(): Promise<number>;
    private delay;
}
