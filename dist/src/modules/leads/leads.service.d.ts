import { PrismaService } from '../../prisma/prisma.service';
import { GetLeadsQueryDto, UpdateLeadDto, BulkUpdateLeadsDto, GetLeadMetricsQueryDto, UpdateLeadStatusDto } from './dto/leads.dto';
import { Prisma } from '@prisma/client';
export declare class LeadsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
                sourceMetadata: Prisma.JsonValue | null;
                score: number;
                meetingEventId: string | null;
                meetingStatus: string | null;
                enrichmentData: Prisma.JsonValue | null;
                enrichmentStatus: import("@prisma/client").$Enums.EnrichmentStatus | null;
                enrichedAt: Date | null;
                salesPitchData: Prisma.JsonValue | null;
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
            sourceMetadata: Prisma.JsonValue | null;
            score: number;
            meetingEventId: string | null;
            meetingStatus: string | null;
            enrichmentData: Prisma.JsonValue | null;
            enrichmentStatus: import("@prisma/client").$Enums.EnrichmentStatus | null;
            enrichedAt: Date | null;
            salesPitchData: Prisma.JsonValue | null;
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
    private getLeadsKanban;
    getLeadById(workspaceId: string, leadId: string): Promise<{
        bookings: {
            id: string;
            workspaceId: string;
            providerType: import("@prisma/client").$Enums.OAuthProviderType;
            createdAt: Date;
            updatedAt: Date;
            responses: Prisma.JsonValue | null;
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
            rawPayload: Prisma.JsonValue | null;
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
            metadata: Prisma.JsonValue | null;
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
        sourceMetadata: Prisma.JsonValue | null;
        score: number;
        meetingEventId: string | null;
        meetingStatus: string | null;
        enrichmentData: Prisma.JsonValue | null;
        enrichmentStatus: import("@prisma/client").$Enums.EnrichmentStatus | null;
        enrichedAt: Date | null;
        salesPitchData: Prisma.JsonValue | null;
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
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
    updateLead(workspaceId: string, leadId: string, dto: UpdateLeadDto, userId?: string): Promise<{
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
            metadata: Prisma.JsonValue | null;
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
        sourceMetadata: Prisma.JsonValue | null;
        score: number;
        meetingEventId: string | null;
        meetingStatus: string | null;
        enrichmentData: Prisma.JsonValue | null;
        enrichmentStatus: import("@prisma/client").$Enums.EnrichmentStatus | null;
        enrichedAt: Date | null;
        salesPitchData: Prisma.JsonValue | null;
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
    }>;
    bulkUpdateLeads(workspaceId: string, dto: BulkUpdateLeadsDto, userId?: string): Promise<{
        success: boolean;
        updatedCount: number;
    }>;
    deleteLead(workspaceId: string, leadId: string): Promise<{
        success: boolean;
    }>;
    updateLeadStatus(workspaceId: string, leadId: string, dto: UpdateLeadStatusDto, userId?: string): Promise<{
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
        sourceMetadata: Prisma.JsonValue | null;
        score: number;
        meetingEventId: string | null;
        meetingStatus: string | null;
        enrichmentData: Prisma.JsonValue | null;
        enrichmentStatus: import("@prisma/client").$Enums.EnrichmentStatus | null;
        enrichedAt: Date | null;
        salesPitchData: Prisma.JsonValue | null;
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
    }>;
}
