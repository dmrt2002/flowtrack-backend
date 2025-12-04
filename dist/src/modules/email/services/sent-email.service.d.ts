import { PrismaService } from '../../../prisma/prisma.service';
export interface CreateSentEmailDto {
    workspaceId: string;
    leadId: string;
    workflowExecutionId: string;
    workflowId: string;
    recipientEmail: string;
    recipientName?: string;
    senderEmail: string;
    senderName?: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    emailType: 'welcome' | 'thank_you' | 'follow_up';
    providerType: 'GMAIL' | 'SMTP';
    gmailMessageId?: string;
    gmailThreadId?: string;
    smtpMessageId?: string;
    deliveryStatus?: 'sent' | 'delivered' | 'bounced' | 'failed';
    deliveryError?: string;
}
export interface GetSentEmailsOptions {
    workspaceId: string;
    leadId?: string;
    workflowId?: string;
    emailType?: 'welcome' | 'thank_you' | 'follow_up';
    deliveryStatus?: 'sent' | 'delivered' | 'bounced' | 'failed';
    openStatus?: 'opened' | 'unopened' | 'all';
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'sentAt' | 'openCount';
    sortOrder?: 'asc' | 'desc';
}
export declare class SentEmailService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    recordSentEmail(data: CreateSentEmailDto): Promise<{
        id: string;
        workspaceId: string;
        providerType: string;
        createdAt: Date;
        updatedAt: Date;
        subject: string;
        workflowId: string;
        leadId: string;
        workflowExecutionId: string;
        emailType: string;
        sentAt: Date;
        recipientEmail: string;
        recipientName: string | null;
        senderEmail: string;
        senderName: string | null;
        htmlBody: string;
        textBody: string | null;
        gmailMessageId: string | null;
        gmailThreadId: string | null;
        smtpMessageId: string | null;
        deliveryStatus: string;
        deliveryError: string | null;
        openCount: number;
        firstOpenedAt: Date | null;
        lastOpenedAt: Date | null;
        genuineOpenCount: number;
        botPrefetchCount: number;
        ambiguousOpenCount: number;
        directOpenCount: number;
    }>;
    getSentEmailsByWorkspace(options: GetSentEmailsOptions): Promise<{
        sentEmails: ({
            workflow: {
                id: string;
                name: string;
            };
            lead: {
                id: string;
                name: string | null;
                email: string;
            };
        } & {
            id: string;
            workspaceId: string;
            providerType: string;
            createdAt: Date;
            updatedAt: Date;
            subject: string;
            workflowId: string;
            leadId: string;
            workflowExecutionId: string;
            emailType: string;
            sentAt: Date;
            recipientEmail: string;
            recipientName: string | null;
            senderEmail: string;
            senderName: string | null;
            htmlBody: string;
            textBody: string | null;
            gmailMessageId: string | null;
            gmailThreadId: string | null;
            smtpMessageId: string | null;
            deliveryStatus: string;
            deliveryError: string | null;
            openCount: number;
            firstOpenedAt: Date | null;
            lastOpenedAt: Date | null;
            genuineOpenCount: number;
            botPrefetchCount: number;
            ambiguousOpenCount: number;
            directOpenCount: number;
        })[];
        totalCount: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    }>;
    getSentEmailsByLead(options: GetSentEmailsOptions): Promise<{
        sentEmails: ({
            workflow: {
                id: string;
                name: string;
            };
            workflowExecution: {
                id: string;
                status: import("@prisma/client").$Enums.WorkflowExecutionStatus;
            };
        } & {
            id: string;
            workspaceId: string;
            providerType: string;
            createdAt: Date;
            updatedAt: Date;
            subject: string;
            workflowId: string;
            leadId: string;
            workflowExecutionId: string;
            emailType: string;
            sentAt: Date;
            recipientEmail: string;
            recipientName: string | null;
            senderEmail: string;
            senderName: string | null;
            htmlBody: string;
            textBody: string | null;
            gmailMessageId: string | null;
            gmailThreadId: string | null;
            smtpMessageId: string | null;
            deliveryStatus: string;
            deliveryError: string | null;
            openCount: number;
            firstOpenedAt: Date | null;
            lastOpenedAt: Date | null;
            genuineOpenCount: number;
            botPrefetchCount: number;
            ambiguousOpenCount: number;
            directOpenCount: number;
        })[];
        totalCount: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    }>;
    getSentEmailById(emailId: string, workspaceId: string): Promise<{
        workflow: {
            id: string;
            name: string;
        };
        lead: {
            id: string;
            name: string | null;
            email: string;
        };
        workflowExecution: {
            id: string;
            status: import("@prisma/client").$Enums.WorkflowExecutionStatus;
        };
    } & {
        id: string;
        workspaceId: string;
        providerType: string;
        createdAt: Date;
        updatedAt: Date;
        subject: string;
        workflowId: string;
        leadId: string;
        workflowExecutionId: string;
        emailType: string;
        sentAt: Date;
        recipientEmail: string;
        recipientName: string | null;
        senderEmail: string;
        senderName: string | null;
        htmlBody: string;
        textBody: string | null;
        gmailMessageId: string | null;
        gmailThreadId: string | null;
        smtpMessageId: string | null;
        deliveryStatus: string;
        deliveryError: string | null;
        openCount: number;
        firstOpenedAt: Date | null;
        lastOpenedAt: Date | null;
        genuineOpenCount: number;
        botPrefetchCount: number;
        ambiguousOpenCount: number;
        directOpenCount: number;
    }>;
    updateEmailOpenTracking(emailId: string): Promise<void>;
    updateDeliveryStatus(emailId: string, deliveryStatus: 'sent' | 'delivered' | 'bounced' | 'failed', deliveryError?: string): Promise<void>;
    getEmailStatistics(workspaceId: string): Promise<{
        totalSent: number;
        totalOpened: number;
        totalBounced: number;
        totalFailed: number;
        openRate: number;
    }>;
}
