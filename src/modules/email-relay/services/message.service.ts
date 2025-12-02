import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MessageDirection, LeadStatus, Prisma } from '@prisma/client';
import { EmailMessage } from '../types';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an outbound message record
   */
  async createOutboundMessage(
    workspaceId: string,
    leadId: string,
    message: EmailMessage,
  ) {
    try {
      return await this.prisma.message.create({
        data: {
          workspaceId,
          leadId,
          direction: MessageDirection.OUTBOUND,
          fromEmail: message.from.email,
          fromName: message.from.name,
          toEmail: message.to.email,
          toName: message.to.name,
          subject: message.subject,
          htmlBody: message.htmlBody,
          textBody: message.textBody,
          messageId: message.messageId,
          inReplyTo: message.inReplyTo,
          threadId: message.threadId,
          headers: message.headers ? (message.headers as Prisma.InputJsonValue) : undefined,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create outbound message for lead ${leadId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create an inbound message record and update lead status
   */
  async createInboundMessage(
    workspaceId: string,
    leadId: string,
    fromEmail: string,
    fromName: string | undefined,
    subject: string,
    textBody: string,
    htmlBody: string | undefined,
    messageId: string | undefined,
    inReplyTo: string | undefined,
    threadId: string | undefined,
    headers: Record<string, any> | undefined,
    receivedAt: Date,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create the inbound message
        const message = await tx.message.create({
          data: {
            workspaceId,
            leadId,
            direction: MessageDirection.INBOUND,
            fromEmail,
            fromName,
            toEmail: process.env.GMAIL_RELAY_EMAIL || '',
            subject,
            htmlBody,
            textBody,
            messageId,
            inReplyTo,
            threadId,
            headers: headers ? (headers as Prisma.InputJsonValue) : undefined,
            receivedAt,
          },
        });

        // Update lead status to RESPONDED if currently EMAIL_SENT or FOLLOW_UP_SENT
        await tx.lead.updateMany({
          where: {
            id: leadId,
            status: {
              in: [LeadStatus.EMAIL_SENT, LeadStatus.FOLLOW_UP_SENT],
            },
          },
          data: {
            status: LeadStatus.RESPONDED,
            lastActivityAt: new Date(),
          },
        });

        return message;
      });
    } catch (error) {
      this.logger.error(
        `Failed to create inbound message from ${fromEmail}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all messages for a specific lead (conversation thread)
   */
  async getMessagesByLead(
    leadId: string,
    workspaceId: string,
    direction?: MessageDirection,
    limit: number = 50,
    offset: number = 0,
  ) {
    const where: Prisma.MessageWhereInput = {
      leadId,
      workspaceId,
      ...(direction && { direction }),
    };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          direction: true,
          fromEmail: true,
          fromName: true,
          toEmail: true,
          toName: true,
          subject: true,
          htmlBody: true,
          textBody: true,
          messageId: true,
          inReplyTo: true,
          threadId: true,
          sentAt: true,
          receivedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data: messages,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get all messages for a workspace
   */
  async getMessagesByWorkspace(
    workspaceId: string,
    direction?: MessageDirection,
    limit: number = 50,
    offset: number = 0,
  ) {
    const where: Prisma.MessageWhereInput = {
      workspaceId,
      ...(direction && { direction }),
    };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          leadId: true,
          direction: true,
          fromEmail: true,
          fromName: true,
          toEmail: true,
          toName: true,
          subject: true,
          textBody: true,
          sentAt: true,
          receivedAt: true,
          createdAt: true,
          lead: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data: messages,
      total,
      limit,
      offset,
    };
  }

  /**
   * Find message by messageId to prevent duplicates
   */
  async findByMessageId(messageId: string) {
    return this.prisma.message.findUnique({
      where: { messageId },
    });
  }

  /**
   * Check if a message already exists
   */
  async messageExists(messageId: string): Promise<boolean> {
    const count = await this.prisma.message.count({
      where: { messageId },
    });
    return count > 0;
  }

  /**
   * Get conversations that need reply (have INBOUND messages)
   * Groups by lead and returns conversation metadata
   */
  async getConversationsNeedingReply(
    workspaceId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    // Get leads that have received INBOUND messages
    const leadsWithInbound = await this.prisma.message.findMany({
      where: {
        workspaceId,
        direction: MessageDirection.INBOUND,
      },
      select: {
        leadId: true,
      },
      distinct: ['leadId'],
    });

    const leadIds = leadsWithInbound.map((m) => m.leadId);

    if (leadIds.length === 0) {
      return {
        data: [],
        total: 0,
        limit,
        offset,
      };
    }

    // Get conversation metadata for each lead
    const conversations = await Promise.all(
      leadIds.slice(offset, offset + limit).map(async (leadId) => {
        const [lead, messageCount, latestMessage, hasUnread] =
          await Promise.all([
            this.prisma.lead.findUnique({
              where: { id: leadId },
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
                score: true,
                lastActivityAt: true,
              },
            }),
            this.prisma.message.count({
              where: { leadId, workspaceId },
            }),
            this.prisma.message.findFirst({
              where: { leadId, workspaceId },
              orderBy: { createdAt: 'desc' },
              select: {
                direction: true,
                textBody: true,
                subject: true,
                createdAt: true,
              },
            }),
            // Check if latest INBOUND message is "unread" (for future use)
            this.prisma.message.findFirst({
              where: {
                leadId,
                workspaceId,
                direction: MessageDirection.INBOUND,
              },
              orderBy: { createdAt: 'desc' },
            }),
          ]);

        if (!lead) return null;

        // Create preview from latest message
        const preview =
          latestMessage?.textBody.substring(0, 100) || '(No message content)';

        // Calculate time since last activity
        const lastActivityTime = hasUnread?.createdAt || lead.lastActivityAt;
        const minutesAgo = lastActivityTime
          ? Math.floor(
              (Date.now() - lastActivityTime.getTime()) / (1000 * 60),
            )
          : null;

        return {
          lead,
          messageCount,
          latestMessage: {
            preview,
            subject: latestMessage?.subject,
            direction: latestMessage?.direction,
            createdAt: latestMessage?.createdAt,
          },
          lastActivityMinutesAgo: minutesAgo,
          hasUnread: true, // For now, all replies are considered "unread"
        };
      }),
    );

    const filteredConversations = conversations.filter(
      (c) => c !== null,
    ) as any[];

    // Sort by most recent activity
    filteredConversations.sort((a, b) => {
      const aTime =
        a.latestMessage.createdAt?.getTime() ||
        a.lead.lastActivityAt?.getTime() ||
        0;
      const bTime =
        b.latestMessage.createdAt?.getTime() ||
        b.lead.lastActivityAt?.getTime() ||
        0;
      return bTime - aTime;
    });

    return {
      data: filteredConversations,
      total: leadIds.length,
      limit,
      offset,
    };
  }

  /**
   * Get conversations with only OUTBOUND messages (no replies yet)
   * Groups by lead and returns conversation metadata
   */
  async getConversationsSentOnly(
    workspaceId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    // Get all leads with OUTBOUND messages
    const leadsWithOutbound = await this.prisma.message.findMany({
      where: {
        workspaceId,
        direction: MessageDirection.OUTBOUND,
      },
      select: {
        leadId: true,
      },
      distinct: ['leadId'],
    });

    const outboundLeadIds = new Set(leadsWithOutbound.map((m) => m.leadId));

    // Get leads with INBOUND messages (to exclude)
    const leadsWithInbound = await this.prisma.message.findMany({
      where: {
        workspaceId,
        direction: MessageDirection.INBOUND,
      },
      select: {
        leadId: true,
      },
      distinct: ['leadId'],
    });

    const inboundLeadIds = new Set(leadsWithInbound.map((m) => m.leadId));

    // Filter to only leads with OUTBOUND but NO INBOUND
    const sentOnlyLeadIds = Array.from(outboundLeadIds).filter(
      (id) => !inboundLeadIds.has(id),
    );

    if (sentOnlyLeadIds.length === 0) {
      return {
        data: [],
        total: 0,
        limit,
        offset,
      };
    }

    // Get conversation metadata for each lead
    const conversations = await Promise.all(
      sentOnlyLeadIds.slice(offset, offset + limit).map(async (leadId) => {
        const [lead, messageCount, latestMessage] = await Promise.all([
          this.prisma.lead.findUnique({
            where: { id: leadId },
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              score: true,
              lastActivityAt: true,
            },
          }),
          this.prisma.message.count({
            where: { leadId, workspaceId },
          }),
          this.prisma.message.findFirst({
            where: { leadId, workspaceId },
            orderBy: { createdAt: 'desc' },
            select: {
              direction: true,
              textBody: true,
              subject: true,
              createdAt: true,
              sentAt: true,
            },
          }),
        ]);

        if (!lead) return null;

        // Create preview from latest message
        const preview =
          latestMessage?.textBody.substring(0, 100) || '(No message content)';

        // Calculate time since sent
        const sentTime = latestMessage?.sentAt || latestMessage?.createdAt;
        const minutesAgo = sentTime
          ? Math.floor((Date.now() - sentTime.getTime()) / (1000 * 60))
          : null;

        return {
          lead,
          messageCount,
          latestMessage: {
            preview,
            subject: latestMessage?.subject,
            direction: latestMessage?.direction,
            createdAt: latestMessage?.createdAt,
          },
          lastActivityMinutesAgo: minutesAgo,
          hasUnread: false, // No replies, so nothing unread
        };
      }),
    );

    const filteredConversations = conversations.filter(
      (c) => c !== null,
    ) as any[];

    // Sort by most recent sent time
    filteredConversations.sort((a, b) => {
      const aTime =
        a.latestMessage.createdAt?.getTime() ||
        a.lead.lastActivityAt?.getTime() ||
        0;
      const bTime =
        b.latestMessage.createdAt?.getTime() ||
        b.lead.lastActivityAt?.getTime() ||
        0;
      return bTime - aTime;
    });

    return {
      data: filteredConversations,
      total: sentOnlyLeadIds.length,
      limit,
      offset,
    };
  }
}
