import { SentEmailService } from '../services/sent-email.service';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class SentEmailController {
    private sentEmailService;
    private prisma;
    constructor(sentEmailService: SentEmailService, prisma: PrismaService);
    getWorkspaceEmails(user: any, workspaceId: string, workflowId?: string, emailType?: 'welcome' | 'thank_you' | 'follow_up', deliveryStatus?: 'sent' | 'delivered' | 'bounced' | 'failed', openStatus?: 'opened' | 'unopened' | 'all', search?: string, limit?: string, offset?: string, sortBy?: 'sentAt' | 'openCount', sortOrder?: 'asc' | 'desc'): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
    getLeadEmails(user: any, workspaceId: string, leadId: string, emailType?: 'welcome' | 'thank_you' | 'follow_up', openStatus?: 'opened' | 'unopened' | 'all', limit?: string, offset?: string): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
    getSentEmailById(user: any, emailId: string, workspaceId: string): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
    getEmailStatistics(user: any, workspaceId: string): Promise<{
        success: boolean;
        data: {
            totalSent: number;
            totalOpened: number;
            totalBounced: number;
            totalFailed: number;
            openRate: number;
        };
    }>;
    private verifyWorkspaceAccess;
}
