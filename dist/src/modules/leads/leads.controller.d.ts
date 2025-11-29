import { LeadsService } from './leads.service';
import { GetLeadsQueryDto, UpdateLeadDto, BulkUpdateLeadsDto, GetLeadMetricsQueryDto, UpdateLeadStatusDto } from './dto/leads.dto';
export declare class LeadsController {
    private readonly leadsService;
    constructor(leadsService: LeadsService);
    getLeads(workspaceId: string, query: GetLeadsQueryDto): Promise<{
        columns: {
            status: "EMAIL_SENT" | "FOLLOW_UP_PENDING" | "FOLLOW_UP_SENT" | "BOOKED" | "WON" | "LOST";
            leads: ({
                workflow: {
                    name: string;
                    id: string;
                };
                _count: {
                    bookings: number;
                    events: number;
                };
            } & {
                name: string | null;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                workspaceId: string;
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
                lastActivityAt: Date | null;
                lastEmailSentAt: Date | null;
                lastEmailOpenedAt: Date | null;
            })[];
            count: number;
        }[];
        view: string;
    } | {
        leads: ({
            workflow: {
                name: string;
                id: string;
            };
            _count: {
                bookings: number;
                events: number;
            };
        } & {
            name: string | null;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
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
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            responses: import("@prisma/client/runtime/library").JsonValue | null;
            providerType: import("@prisma/client").$Enums.OAuthProviderType;
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
            name: string;
            id: string;
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
            createdAt: Date;
            description: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            eventType: string;
            leadId: string;
            eventCategory: import("@prisma/client").$Enums.LeadEventCategory;
            triggeredByWorkflowExecutionId: string | null;
            triggeredByUserId: string | null;
        })[];
    } & {
        name: string | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
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
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
    }>;
    updateLead(workspaceId: string, leadId: string, dto: UpdateLeadDto, req: any): Promise<{
        workflow: {
            name: string;
            id: string;
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
            createdAt: Date;
            description: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            eventType: string;
            leadId: string;
            eventCategory: import("@prisma/client").$Enums.LeadEventCategory;
            triggeredByWorkflowExecutionId: string | null;
            triggeredByUserId: string | null;
        }[];
    } & {
        name: string | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
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
        lastActivityAt: Date | null;
        lastEmailSentAt: Date | null;
        lastEmailOpenedAt: Date | null;
    }>;
    updateLeadStatus(workspaceId: string, leadId: string, dto: UpdateLeadStatusDto, req: any): Promise<{
        workflow: {
            name: string;
            id: string;
        };
        _count: {
            bookings: number;
            events: number;
        };
    } & {
        name: string | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
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
}
