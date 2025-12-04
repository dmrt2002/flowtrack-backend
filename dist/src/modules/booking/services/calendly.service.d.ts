import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokenManagerService } from './token-manager.service';
import { WebhookVerifierService } from './webhook-verifier.service';
import { AttributionMatcherService } from './attribution-matcher.service';
export declare class CalendlyService {
    private prisma;
    private config;
    private tokenManager;
    private webhookVerifier;
    private attributionMatcher;
    private readonly logger;
    private readonly calendlyApiBase;
    private readonly calendlyAuthBase;
    constructor(prisma: PrismaService, config: ConfigService, tokenManager: TokenManagerService, webhookVerifier: WebhookVerifierService, attributionMatcher: AttributionMatcherService);
    getAuthorizationUrl(userId: string): string;
    exchangeCodeForTokens(code: string, workspaceId: string): Promise<{
        accessToken: any;
        refreshToken: any;
        expiresAt: Date;
        organization: any;
        owner: any;
    }>;
    detectPlanType(accessToken: string, organizationUri: string): Promise<string>;
    registerWebhook(credentialId: string, organizationUri: string): Promise<{
        webhookUrl: string;
        signingKey: string;
    } | null>;
    saveCredentials(userId: string, workspaceId: string, accessToken: string, refreshToken: string, expiresAt: Date, organization: any, owner: any, planType: string): Promise<{
        id: string;
        userId: string;
        workspaceId: string | null;
        providerType: import("@prisma/client").$Enums.OAuthProviderType;
        providerPlan: string | null;
        providerUserId: string | null;
        providerEmail: string | null;
        accessToken: string;
        refreshToken: string | null;
        tokenType: string;
        expiresAt: Date | null;
        scope: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        webhookUrl: string | null;
        webhookSigningKey: string | null;
        webhookEnabled: boolean;
        webhookLastVerifiedAt: Date | null;
        webhookFailedAttempts: number;
        pollingEnabled: boolean;
        pollingLastRunAt: Date | null;
        pollingCursor: string | null;
        apiRateLimitRemaining: number | null;
        apiRateLimitResetAt: Date | null;
        isActive: boolean;
        lastUsedAt: Date | null;
        lastSyncedAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    processWebhookEvent(credentialId: string, signature: string, payload: any): Promise<{
        message: string;
    }>;
    private handleInviteeCreated;
    private handleInviteeCanceled;
    pollEvents(credentialId: string): Promise<{
        eventsFetched: number;
        eventsCreated: number;
        eventsUpdated: number;
    }>;
}
