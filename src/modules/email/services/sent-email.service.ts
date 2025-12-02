import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class SentEmailService {
  private readonly logger = new Logger(SentEmailService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record a sent email in the database
   */
  async recordSentEmail(data: CreateSentEmailDto) {
    try {
      const sentEmail = await this.prisma.sentEmail.create({
        data: {
          workspaceId: data.workspaceId,
          leadId: data.leadId,
          workflowExecutionId: data.workflowExecutionId,
          workflowId: data.workflowId,
          recipientEmail: data.recipientEmail,
          recipientName: data.recipientName,
          senderEmail: data.senderEmail,
          senderName: data.senderName,
          subject: data.subject,
          htmlBody: data.htmlBody,
          textBody: data.textBody,
          emailType: data.emailType,
          providerType: data.providerType,
          gmailMessageId: data.gmailMessageId,
          gmailThreadId: data.gmailThreadId,
          smtpMessageId: data.smtpMessageId,
          deliveryStatus: data.deliveryStatus || 'sent',
          deliveryError: data.deliveryError,
        },
      });

      this.logger.log(
        `✅ Recorded sent email: ${sentEmail.id} (${data.emailType} to ${data.recipientEmail})`,
      );

      return sentEmail;
    } catch (error) {
      this.logger.error(`Failed to record sent email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get sent emails for a workspace (global inbox)
   */
  async getSentEmailsByWorkspace(options: GetSentEmailsOptions) {
    const {
      workspaceId,
      workflowId,
      emailType,
      deliveryStatus,
      openStatus,
      search,
      limit = 50,
      offset = 0,
      sortBy = 'sentAt',
      sortOrder = 'desc',
    } = options;

    const where: any = {
      workspaceId,
    };

    if (workflowId) {
      where.workflowId = workflowId;
    }

    if (emailType) {
      where.emailType = emailType;
    }

    if (deliveryStatus) {
      where.deliveryStatus = deliveryStatus;
    }

    if (openStatus === 'opened') {
      where.openCount = { gt: 0 };
    } else if (openStatus === 'unopened') {
      where.openCount = 0;
    }

    if (search) {
      where.OR = [
        { recipientEmail: { contains: search, mode: 'insensitive' } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [sentEmails, totalCount] = await Promise.all([
      this.prisma.sentEmail.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.sentEmail.count({ where }),
    ]);

    return {
      sentEmails,
      totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount,
    };
  }

  /**
   * Get sent emails for a specific lead
   */
  async getSentEmailsByLead(options: GetSentEmailsOptions) {
    const {
      workspaceId,
      leadId,
      emailType,
      openStatus,
      limit = 50,
      offset = 0,
    } = options;

    if (!leadId) {
      throw new Error('leadId is required for getSentEmailsByLead');
    }

    const where: any = {
      workspaceId,
      leadId,
    };

    if (emailType) {
      where.emailType = emailType;
    }

    if (openStatus === 'opened') {
      where.openCount = { gt: 0 };
    } else if (openStatus === 'unopened') {
      where.openCount = 0;
    }

    const [sentEmails, totalCount] = await Promise.all([
      this.prisma.sentEmail.findMany({
        where,
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
          workflowExecution: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: {
          sentAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.sentEmail.count({ where }),
    ]);

    return {
      sentEmails,
      totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount,
    };
  }

  /**
   * Get a single sent email by ID
   */
  async getSentEmailById(emailId: string, workspaceId: string) {
    const sentEmail = await this.prisma.sentEmail.findFirst({
      where: {
        id: emailId,
        workspaceId,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        workflowExecution: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!sentEmail) {
      throw new Error(`Sent email not found: ${emailId}`);
    }

    return sentEmail;
  }

  /**
   * Update email open tracking when tracking pixel is loaded
   */
  async updateEmailOpenTracking(emailId: string) {
    try {
      const sentEmail = await this.prisma.sentEmail.findUnique({
        where: { id: emailId },
      });

      if (!sentEmail) {
        this.logger.warn(`Sent email not found for open tracking: ${emailId}`);
        return;
      }

      const now = new Date();

      await this.prisma.sentEmail.update({
        where: { id: emailId },
        data: {
          openCount: {
            increment: 1,
          },
          firstOpenedAt: sentEmail.firstOpenedAt || now,
          lastOpenedAt: now,
        },
      });

      this.logger.log(
        `📧 Email open tracked: ${emailId} (open count: ${sentEmail.openCount + 1})`,
      );
    } catch (error) {
      this.logger.error(`Failed to update email open tracking: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update delivery status (e.g., for bounces or failures)
   */
  async updateDeliveryStatus(
    emailId: string,
    deliveryStatus: 'sent' | 'delivered' | 'bounced' | 'failed',
    deliveryError?: string,
  ) {
    try {
      await this.prisma.sentEmail.update({
        where: { id: emailId },
        data: {
          deliveryStatus,
          deliveryError,
        },
      });

      this.logger.log(
        `📬 Delivery status updated: ${emailId} -> ${deliveryStatus}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update delivery status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get email statistics for a workspace
   */
  async getEmailStatistics(workspaceId: string) {
    const [
      totalSent,
      totalOpened,
      totalBounced,
      totalFailed,
    ] = await Promise.all([
      this.prisma.sentEmail.count({ where: { workspaceId } }),
      this.prisma.sentEmail.count({
        where: { workspaceId, openCount: { gt: 0 } },
      }),
      this.prisma.sentEmail.count({
        where: { workspaceId, deliveryStatus: 'bounced' },
      }),
      this.prisma.sentEmail.count({
        where: { workspaceId, deliveryStatus: 'failed' },
      }),
    ]);

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

    return {
      totalSent,
      totalOpened,
      totalBounced,
      totalFailed,
      openRate: Math.round(openRate * 100) / 100, // Round to 2 decimal places
    };
  }
}
