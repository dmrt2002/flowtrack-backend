import { PrismaService } from '../../../prisma/prisma.service';
interface AttributionResult {
    leadId: string | null;
    attributionMethod: 'UTM' | 'HIDDEN_FIELD' | 'MANUAL' | null;
    utmContent?: string;
    hiddenFieldValue?: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}
export declare class AttributionMatcherService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    matchCalendlyBooking(workspaceId: string, inviteeEmail: string, utmParams: Record<string, string>, eventUri: string): Promise<AttributionResult>;
    private matchByEmail;
    createUnmatchedBooking(workspaceId: string, workflowId: string | null, oauthCredentialId: string, bookingData: {
        providerType: 'CALENDLY';
        providerEventId: string;
        providerEventUri?: string;
        eventName: string;
        eventStartTime: Date;
        eventEndTime: Date;
        eventDurationMinutes?: number;
        eventTimezone?: string;
        inviteeEmail: string;
        inviteeName?: string;
        inviteeTimezone?: string;
        meetingLocation?: string;
        meetingUrl?: string;
        meetingNotes?: string;
        responses?: any;
        receivedVia: 'WEBHOOK' | 'POLLING';
        rawPayload?: any;
    }): Promise<{
        leadId: string;
        bookingId: string;
    }>;
    updateLeadWithBooking(leadId: string, bookingId: string, eventId: string, status: 'scheduled' | 'canceled' | 'rescheduled' | 'completed'): Promise<void>;
    findBookingByProviderEventId(providerEventId: string, providerType: 'CALENDLY'): Promise<({
        lead: {
            id: string;
            workspaceId: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            name: string | null;
            status: import("@prisma/client").$Enums.LeadStatus;
            tags: string[];
            email: string;
            workflowId: string;
            companyName: string | null;
            phone: string | null;
            source: import("@prisma/client").$Enums.LeadSource;
            sourceMetadata: import("@prisma/client/runtime/library").JsonValue | null;
            score: number;
            meetingEventId: string | null;
            meetingStatus: string | null;
            enrichmentData: import("@prisma/client/runtime/library").JsonValue | null;
            enrichmentStatus: import("@prisma/client").$Enums.EnrichmentStatus | null;
            enrichedAt: Date | null;
            salesPitchData: import("@prisma/client/runtime/library").JsonValue | null;
            lastActivityAt: Date | null;
            lastEmailSentAt: Date | null;
            lastEmailOpenedAt: Date | null;
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
    }) | null>;
    updateBookingStatus(bookingId: string, status: 'scheduled' | 'canceled' | 'rescheduled' | 'completed' | 'no_show', cancellationReason?: string, rescheduledFromBookingId?: string): Promise<void>;
    getBookingStats(workspaceId: string): Promise<{
        total: number;
        scheduled: number;
        canceled: number;
        completed: number;
    }>;
}
export {};
