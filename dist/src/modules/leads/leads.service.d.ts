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
                workflow: {
                    id: string;
                    name: string;
                };
                _count: {
                    events: number;
                    bookings: number;
                };
            } & {
                id: string;
                workflowId: string;
                workspaceId: string;
                email: string;
                name: string | null;
                companyName: string | null;
                phone: string | null;
                status: import("@prisma/client").$Enums.LeadStatus;
                source: import("@prisma/client").$Enums.LeadSource;
                sourceMetadata: Prisma.JsonValue | null;
                score: number;
                tags: string[];
                meetingEventId: string | null;
                meetingStatus: string | null;
                lastActivityAt: Date | null;
                lastEmailSentAt: Date | null;
                lastEmailOpenedAt: Date | null;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
            })[];
            count: number;
        }[];
        view: string;
    } | {
        leads: ({
            workflow: {
                id: string;
                name: string;
            };
            _count: {
                events: number;
                bookings: number;
            };
        } & {
            id: string;
            workflowId: string;
            workspaceId: string;
            email: string;
            name: string | null;
            companyName: string | null;
            phone: string | null;
            status: import("@prisma/client").$Enums.LeadStatus;
            source: import("@prisma/client").$Enums.LeadSource;
            sourceMetadata: Prisma.JsonValue | null;
            score: number;
            tags: string[];
            meetingEventId: string | null;
            meetingStatus: string | null;
            lastActivityAt: Date | null;
            lastEmailSentAt: Date | null;
            lastEmailOpenedAt: Date | null;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        view: string;
    }>;
    private getLeadsKanban;
    getLeadById(workspaceId: string, leadId: string): Promise<{
        workflow: {
            id: string;
            name: string;
        };
        fieldData: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            leadId: string;
            value: string;
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
            createdAt: Date;
            leadId: string;
            description: string | null;
            metadata: Prisma.JsonValue | null;
            eventType: string;
            eventCategory: import("@prisma/client").$Enums.LeadEventCategory;
            triggeredByWorkflowExecutionId: string | null;
            triggeredByUserId: string | null;
        })[];
        bookings: {
            id: string;
            workflowId: string | null;
            workspaceId: string;
            createdAt: Date;
            updatedAt: Date;
            leadId: string;
            providerType: import("@prisma/client").$Enums.OAuthProviderType;
            responses: Prisma.JsonValue | null;
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
    } & {
        id: string;
        workflowId: string;
        workspaceId: string;
        email: string;
        name: string | null;
        companyName: string | null;
        phone: string | null;
        status: import("@prisma/client").$Enums.LeadStatus;
        source: import("@prisma/client").$Enums.LeadSource;
        sourceMetadata: Prisma.JsonValue | null;
        score: number;
        tags: string[];
        meetingEventId: string | null;
        meetingStatus: string | null;
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            leadId: string;
            value: string;
            formFieldId: string;
        }[];
        events: {
            id: string;
            createdAt: Date;
            leadId: string;
            description: string | null;
            metadata: Prisma.JsonValue | null;
            eventType: string;
            eventCategory: import("@prisma/client").$Enums.LeadEventCategory;
            triggeredByWorkflowExecutionId: string | null;
            triggeredByUserId: string | null;
        }[];
    } & {
        id: string;
        workflowId: string;
        workspaceId: string;
        email: string;
        name: string | null;
        companyName: string | null;
        phone: string | null;
        status: import("@prisma/client").$Enums.LeadStatus;
        source: import("@prisma/client").$Enums.LeadSource;
        sourceMetadata: Prisma.JsonValue | null;
        score: number;
        tags: string[];
        meetingEventId: string | null;
        meetingStatus: string | null;
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    bulkUpdateLeads(workspaceId: string, dto: BulkUpdateLeadsDto, userId?: string): Promise<{
        success: boolean;
        updatedCount: number;
    }>;
    deleteLead(workspaceId: string, leadId: string): Promise<{
        success: boolean;
    }>;
    updateLeadStatus(workspaceId: string, leadId: string, dto: UpdateLeadStatusDto, userId?: string): Promise<{
        workflow: {
            id: string;
            name: string;
        };
        _count: {
            events: number;
            bookings: number;
        };
    } & {
        id: string;
        workflowId: string;
        workspaceId: string;
        email: string;
        name: string | null;
        companyName: string | null;
        phone: string | null;
        status: import("@prisma/client").$Enums.LeadStatus;
        source: import("@prisma/client").$Enums.LeadSource;
        sourceMetadata: Prisma.JsonValue | null;
        score: number;
        tags: string[];
        meetingEventId: string | null;
        meetingStatus: string | null;
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
