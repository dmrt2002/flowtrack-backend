import { LeadsService } from './leads.service';
import { GetLeadsQueryDto, UpdateLeadDto, BulkUpdateLeadsDto, GetLeadMetricsQueryDto, UpdateLeadStatusDto } from './dto/leads.dto';
import { EnrichmentQueueService } from '../enrichment/services/enrichment-queue.service';
import { PrismaService } from 'src/prisma/prisma.service';
export declare class LeadsController {
    private readonly leadsService;
    private readonly enrichmentQueue;
    private readonly prisma;
    constructor(leadsService: LeadsService, enrichmentQueue: EnrichmentQueueService, prisma: PrismaService);
    getLeads(workspaceId: string, query: GetLeadsQueryDto): Promise<{
        columns: {
            status: "EMAIL_SENT" | "FOLLOW_UP_PENDING" | "FOLLOW_UP_SENT" | "BOOKED" | "WON" | "LOST";
            leads: ({
                _count: {
                    bookings: number;
                    events: number;
                };
                workflow: {
                    id: string;
                    name: string;
                };
            } & {
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
                lastActivityAt: Date | null;
                lastEmailSentAt: Date | null;
                lastEmailOpenedAt: Date | null;
            })[];
            count: number;
        }[];
        view: string;
    } | {
        leads: ({
            _count: {
                bookings: number;
                events: number;
            };
            workflow: {
                id: string;
                name: string;
            };
        } & {
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
            lastActivityAt: Date | null;
            lastEmailSentAt: Date | null;
            lastEmailOpenedAt: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        view: string;
    }>;
    getLeadMetrics(workspaceId: string, query: GetLeadMetricsQueryDto): Promise<{
        totalLeads: number;
        totalLeadsChange: number;
        newToday: number;
        newTodayChange: number;
        qualified: number;
        qualifiedChange: number;
        averageScore: number;
        averageScoreChange: number;
    }>;
    getLeadById(workspaceId: string, leadId: string): Promise<{
        bookings: {
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
        }[];
        workflow: {
            id: string;
            name: string;
        };
        fieldData: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            value: string;
            leadId: string;
            formFieldId: string;
        }[];
        events: ({
            triggeredBy: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
            } | null;
        } & {
            id: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            description: string | null;
            eventType: string;
            leadId: string;
            eventCategory: import("@prisma/client").$Enums.LeadEventCategory;
            triggeredByWorkflowExecutionId: string | null;
            triggeredByUserId: string | null;
        })[];
    } & {
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
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
    }>;
    updateLead(workspaceId: string, leadId: string, dto: UpdateLeadDto, req: any): Promise<{
        workflow: {
            id: string;
            name: string;
        };
        fieldData: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            value: string;
            leadId: string;
            formFieldId: string;
        }[];
        events: {
            id: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            description: string | null;
            eventType: string;
            leadId: string;
            eventCategory: import("@prisma/client").$Enums.LeadEventCategory;
            triggeredByWorkflowExecutionId: string | null;
            triggeredByUserId: string | null;
        }[];
    } & {
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
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
    }>;
    updateLeadStatus(workspaceId: string, leadId: string, dto: UpdateLeadStatusDto, req: any): Promise<{
        _count: {
            bookings: number;
            events: number;
        };
        workflow: {
            id: string;
            name: string;
        };
    } & {
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
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
    }>;
    bulkUpdateLeads(workspaceId: string, dto: BulkUpdateLeadsDto, req: any): Promise<{
        success: boolean;
        updatedCount: number;
    }>;
    deleteLead(workspaceId: string, leadId: string): Promise<{
        success: boolean;
    }>;
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
}
