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
        workflowId: string;
        workspaceId: string;
        createdAt: Date;
        updatedAt: Date;
        leadId: string;
        subject: string;
        htmlBody: string;
        textBody: string | null;
        sentAt: Date;
        providerType: string;
        workflowExecutionId: string;
        emailType: string;
        openCount: number;
        recipientEmail: string;
        recipientName: string | null;
        senderEmail: string;
        senderName: string | null;
        gmailMessageId: string | null;
        gmailThreadId: string | null;
        smtpMessageId: string | null;
        deliveryStatus: string;
        deliveryError: string | null;
        firstOpenedAt: Date | null;
        lastOpenedAt: Date | null;
    }>;
    getSentEmailsByWorkspace(options: GetSentEmailsOptions): Promise<{
        sentEmails: ({
            lead: {
                id: string;
                email: string;
                name: string | null;
            };
            workflow: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            workflowId: string;
            workspaceId: string;
            createdAt: Date;
            updatedAt: Date;
            leadId: string;
            subject: string;
            htmlBody: string;
            textBody: string | null;
            sentAt: Date;
            providerType: string;
            workflowExecutionId: string;
            emailType: string;
            openCount: number;
            recipientEmail: string;
            recipientName: string | null;
            senderEmail: string;
            senderName: string | null;
            gmailMessageId: string | null;
            gmailThreadId: string | null;
            smtpMessageId: string | null;
            deliveryStatus: string;
            deliveryError: string | null;
            firstOpenedAt: Date | null;
            lastOpenedAt: Date | null;
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
            workflowId: string;
            workspaceId: string;
            createdAt: Date;
            updatedAt: Date;
            leadId: string;
            subject: string;
            htmlBody: string;
            textBody: string | null;
            sentAt: Date;
            providerType: string;
            workflowExecutionId: string;
            emailType: string;
            openCount: number;
            recipientEmail: string;
            recipientName: string | null;
            senderEmail: string;
            senderName: string | null;
            gmailMessageId: string | null;
            gmailThreadId: string | null;
            smtpMessageId: string | null;
            deliveryStatus: string;
            deliveryError: string | null;
            firstOpenedAt: Date | null;
            lastOpenedAt: Date | null;
        })[];
        totalCount: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    }>;
    getSentEmailById(emailId: string, workspaceId: string): Promise<{
        lead: {
            id: string;
            email: string;
            name: string | null;
        };
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
        workflowId: string;
        workspaceId: string;
        createdAt: Date;
        updatedAt: Date;
        leadId: string;
        subject: string;
        htmlBody: string;
        textBody: string | null;
        sentAt: Date;
        providerType: string;
        workflowExecutionId: string;
        emailType: string;
        openCount: number;
        recipientEmail: string;
        recipientName: string | null;
        senderEmail: string;
        senderName: string | null;
        gmailMessageId: string | null;
        gmailThreadId: string | null;
        smtpMessageId: string | null;
        deliveryStatus: string;
        deliveryError: string | null;
        firstOpenedAt: Date | null;
        lastOpenedAt: Date | null;
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
