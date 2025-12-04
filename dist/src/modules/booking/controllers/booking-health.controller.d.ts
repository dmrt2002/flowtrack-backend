import { WebhookVerifierService } from '../services/webhook-verifier.service';
import { PollingService } from '../services/polling.service';
import { PollingQueueService } from '../services/polling-queue.service';
import { AttributionMatcherService } from '../services/attribution-matcher.service';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class BookingHealthController {
    private webhookVerifier;
    private pollingService;
    private pollingQueue;
    private attributionMatcher;
    private prisma;
    constructor(webhookVerifier: WebhookVerifierService, pollingService: PollingService, pollingQueue: PollingQueueService, attributionMatcher: AttributionMatcherService, prisma: PrismaService);
    getHealth(): Promise<{
        status: string;
        deadLetterQueue: {
            pendingCount: number;
            items: {
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
            }[];
        };
        pollingQueue: {
            waiting: number;
            active: number;
            completed: number;
            failed: number;
            delayed: number;
        };
        runningPollingJobs: number;
    }>;
    getDeadLetterQueue(): Promise<{
        success: boolean;
        data: {
            pending: {
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
            }[];
            total: number;
        };
    }>;
    retryDLQItem(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resolveDLQItem(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getPollingStats(workspaceId: string): Promise<{
        success: boolean;
        data: {
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
        }[];
    }>;
    getPollingQueueStats(): Promise<{
        success: boolean;
        data: {
            waiting: number;
            active: number;
            completed: number;
            failed: number;
            delayed: number;
        };
    }>;
    getPollingQueueJobs(): Promise<{
        success: boolean;
        data: {
            id: string | undefined;
            name: string;
            data: any;
            timestamp: number;
            processedOn: number | undefined;
            finishedOn: number | undefined;
            failedReason: string;
            returnvalue: any;
        }[];
    }>;
    triggerManualPolling(): Promise<{
        success: boolean;
        message: string;
    }>;
    getBookingStats(workspaceId: string): Promise<{
        success: boolean;
        data: {
            stats: {
                total: number;
                scheduled: number;
                canceled: number;
                completed: number;
            };
            recentBookings: ({
                lead: {
                    name: string | null;
                    email: string;
                };
            } & {
                id: string;
                workspaceId: string;
                providerType: import("@prisma/client").$Enums.OAuthProviderType;
                createdAt: Date;
                updatedAt: Date;
                responses: import("@prisma/client/runtime/library").JsonValue | null;
                workflowId: string | null;
                leadId: string;
                attributionMethod: import("@prisma/client").$Enums.BookingAttributionMethod | null;
                utmContent: string | null;
                hiddenFieldValue: string | null;
                providerEventId: string;
                providerEventUri: string | null;
                eventName: string;
                eventStartTime: Date;
                eventEndTime: Date;
                eventDurationMinutes: number | null;
                eventTimezone: string | null;
                inviteeEmail: string;
                inviteeName: string | null;
                inviteeTimezone: string | null;
                bookingStatus: import("@prisma/client").$Enums.BookingStatus;
                cancellationReason: string | null;
                meetingLocation: string | null;
                meetingUrl: string | null;
                meetingNotes: string | null;
                receivedVia: import("@prisma/client").$Enums.BookingReceivedVia | null;
                rawPayload: import("@prisma/client/runtime/library").JsonValue | null;
                syncedAt: Date | null;
                oauthCredentialId: string;
                rescheduledFromBookingId: string | null;
            })[];
        };
    }>;
    getWebhookHealth(workspaceId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            providerType: import("@prisma/client").$Enums.OAuthProviderType;
            providerEmail: string | null;
            webhookEnabled: boolean;
            webhookLastVerifiedAt: Date | null;
            webhookFailedAttempts: number;
            pollingEnabled: boolean;
            pollingLastRunAt: Date | null;
            isActive: boolean;
        }[];
    }>;
    cleanupIdempotencyKeys(): Promise<{
        success: boolean;
        message: string;
        count: number;
    }>;
    cleanupPollingJobs(): Promise<{
        success: boolean;
        message: string;
        count: number;
    }>;
    cleanupQueueJobs(): Promise<{
        success: boolean;
        message: string;
    }>;
}
