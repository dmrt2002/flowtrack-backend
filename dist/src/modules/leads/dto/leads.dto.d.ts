import { z } from 'zod';
import { LeadStatus, LeadSource } from '@prisma/client';
export declare const LeadStatusSchema: z.ZodEnum<{
    NEW: "NEW";
    EMAIL_SENT: "EMAIL_SENT";
    EMAIL_OPENED: "EMAIL_OPENED";
    FOLLOW_UP_PENDING: "FOLLOW_UP_PENDING";
    FOLLOW_UP_SENT: "FOLLOW_UP_SENT";
    RESPONDED: "RESPONDED";
    BOOKED: "BOOKED";
    WON: "WON";
    LOST: "LOST";
    DISQUALIFIED: "DISQUALIFIED";
}>;
export declare const LeadSourceSchema: z.ZodEnum<{
    FORM: "FORM";
    EMAIL_FORWARD: "EMAIL_FORWARD";
    API: "API";
    MANUAL: "MANUAL";
    IMPORT: "IMPORT";
}>;
export declare const GetLeadsQuerySchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    workflowId: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodEnum<{
        FORM: "FORM";
        EMAIL_FORWARD: "EMAIL_FORWARD";
        API: "API";
        MANUAL: "MANUAL";
        IMPORT: "IMPORT";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        NEW: "NEW";
        EMAIL_SENT: "EMAIL_SENT";
        EMAIL_OPENED: "EMAIL_OPENED";
        FOLLOW_UP_PENDING: "FOLLOW_UP_PENDING";
        FOLLOW_UP_SENT: "FOLLOW_UP_SENT";
        RESPONDED: "RESPONDED";
        BOOKED: "BOOKED";
        WON: "WON";
        LOST: "LOST";
        DISQUALIFIED: "DISQUALIFIED";
    }>>;
    statuses: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        NEW: "NEW";
        EMAIL_SENT: "EMAIL_SENT";
        EMAIL_OPENED: "EMAIL_OPENED";
        FOLLOW_UP_PENDING: "FOLLOW_UP_PENDING";
        FOLLOW_UP_SENT: "FOLLOW_UP_SENT";
        RESPONDED: "RESPONDED";
        BOOKED: "BOOKED";
        WON: "WON";
        LOST: "LOST";
        DISQUALIFIED: "DISQUALIFIED";
    }>>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        email: "email";
        name: "name";
        score: "score";
        lastActivityAt: "lastActivityAt";
        createdAt: "createdAt";
        updatedAt: "updatedAt";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    view: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        table: "table";
        kanban: "kanban";
    }>>>;
}, z.core.$strip>;
export declare class GetLeadsQueryDto {
    search?: string;
    workflowId?: string;
    source?: LeadSource;
    status?: LeadStatus;
    statuses?: LeadStatus[];
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'createdAt' | 'name' | 'email' | 'score' | 'lastActivityAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    view?: 'table' | 'kanban';
}
export declare const UpdateLeadSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    companyName: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        NEW: "NEW";
        EMAIL_SENT: "EMAIL_SENT";
        EMAIL_OPENED: "EMAIL_OPENED";
        FOLLOW_UP_PENDING: "FOLLOW_UP_PENDING";
        FOLLOW_UP_SENT: "FOLLOW_UP_SENT";
        RESPONDED: "RESPONDED";
        BOOKED: "BOOKED";
        WON: "WON";
        LOST: "LOST";
        DISQUALIFIED: "DISQUALIFIED";
    }>>;
    score: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    sourceMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
declare const UpdateLeadDto_base: import("nestjs-zod").ZodDto<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    companyName: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        NEW: "NEW";
        EMAIL_SENT: "EMAIL_SENT";
        EMAIL_OPENED: "EMAIL_OPENED";
        FOLLOW_UP_PENDING: "FOLLOW_UP_PENDING";
        FOLLOW_UP_SENT: "FOLLOW_UP_SENT";
        RESPONDED: "RESPONDED";
        BOOKED: "BOOKED";
        WON: "WON";
        LOST: "LOST";
        DISQUALIFIED: "DISQUALIFIED";
    }>>;
    score: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    sourceMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>> & {
    io: "input";
};
export declare class UpdateLeadDto extends UpdateLeadDto_base {
}
export declare const UpdateLeadStatusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        NEW: "NEW";
        EMAIL_SENT: "EMAIL_SENT";
        EMAIL_OPENED: "EMAIL_OPENED";
        FOLLOW_UP_PENDING: "FOLLOW_UP_PENDING";
        FOLLOW_UP_SENT: "FOLLOW_UP_SENT";
        RESPONDED: "RESPONDED";
        BOOKED: "BOOKED";
        WON: "WON";
        LOST: "LOST";
        DISQUALIFIED: "DISQUALIFIED";
    }>;
}, z.core.$strip>;
export declare class UpdateLeadStatusDto {
    status: LeadStatus;
}
export declare const BulkUpdateLeadsSchema: z.ZodObject<{
    leadIds: z.ZodArray<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        NEW: "NEW";
        EMAIL_SENT: "EMAIL_SENT";
        EMAIL_OPENED: "EMAIL_OPENED";
        FOLLOW_UP_PENDING: "FOLLOW_UP_PENDING";
        FOLLOW_UP_SENT: "FOLLOW_UP_SENT";
        RESPONDED: "RESPONDED";
        BOOKED: "BOOKED";
        WON: "WON";
        LOST: "LOST";
        DISQUALIFIED: "DISQUALIFIED";
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    addTags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    removeTags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
declare const BulkUpdateLeadsDto_base: import("nestjs-zod").ZodDto<z.ZodObject<{
    leadIds: z.ZodArray<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        NEW: "NEW";
        EMAIL_SENT: "EMAIL_SENT";
        EMAIL_OPENED: "EMAIL_OPENED";
        FOLLOW_UP_PENDING: "FOLLOW_UP_PENDING";
        FOLLOW_UP_SENT: "FOLLOW_UP_SENT";
        RESPONDED: "RESPONDED";
        BOOKED: "BOOKED";
        WON: "WON";
        LOST: "LOST";
        DISQUALIFIED: "DISQUALIFIED";
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    addTags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    removeTags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>> & {
    io: "input";
};
export declare class BulkUpdateLeadsDto extends BulkUpdateLeadsDto_base {
}
export declare const GetLeadMetricsQuerySchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        "7d": "7d";
        "30d": "30d";
        "90d": "90d";
    }>>>;
}, z.core.$strip>;
export declare class GetLeadMetricsQueryDto {
    period?: '7d' | '30d' | '90d';
}
export type GetLeadsQuery = z.infer<typeof GetLeadsQuerySchema>;
export type UpdateLead = z.infer<typeof UpdateLeadSchema>;
export type UpdateLeadStatus = z.infer<typeof UpdateLeadStatusSchema>;
export type BulkUpdateLeads = z.infer<typeof BulkUpdateLeadsSchema>;
export type GetLeadMetricsQuery = z.infer<typeof GetLeadMetricsQuerySchema>;
export {};
