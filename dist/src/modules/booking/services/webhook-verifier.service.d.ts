import { PrismaService } from '../../../prisma/prisma.service';
export declare class WebhookVerifierService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    verifyCalendlyWebhook(payload: string, signature: string, credentialId: string): Promise<boolean>;
    isEventProcessed(eventId: string, provider: string): Promise<boolean>;
    markEventProcessed(eventId: string, provider: string, metadata?: any): Promise<void>;
    addToDeadLetterQueue(provider: 'CALENDLY', eventId: string, eventType: string, errorMessage: string, errorStack: string | null, payload: any): Promise<void>;
    getPendingDLQItems(limit?: number): Promise<{
        id: string;
        status: string;
        provider: import("@prisma/client").$Enums.OAuthProviderType;
        eventId: string;
        eventType: string;
        errorMessage: string;
        errorStack: string | null;
        retryCount: number;
        payload: import("@prisma/client/runtime/library").JsonValue | null;
        resolvedAt: Date | null;
        failedAt: Date;
    }[]>;
    updateDLQItem(id: string, status: 'RESOLVED' | 'FAILED', retryCount: number): Promise<void>;
    updateWebhookHealth(credentialId: string, success: boolean): Promise<void>;
    cleanupOldIdempotencyKeys(): Promise<number>;
}
