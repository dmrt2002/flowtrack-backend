"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MessageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let MessageService = MessageService_1 = class MessageService {
    prisma;
    logger = new common_1.Logger(MessageService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createOutboundMessage(workspaceId, leadId, message) {
        try {
            return await this.prisma.message.create({
                data: {
                    workspaceId,
                    leadId,
                    direction: client_1.MessageDirection.OUTBOUND,
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
                    headers: message.headers ? message.headers : undefined,
                    sentAt: new Date(),
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to create outbound message for lead ${leadId}`, error);
            throw error;
        }
    }
    async createInboundMessage(workspaceId, leadId, fromEmail, fromName, subject, textBody, htmlBody, messageId, inReplyTo, threadId, headers, receivedAt) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const message = await tx.message.create({
                    data: {
                        workspaceId,
                        leadId,
                        direction: client_1.MessageDirection.INBOUND,
                        fromEmail,
                        fromName,
                        toEmail: process.env.GMAIL_RELAY_EMAIL || '',
                        subject,
                        htmlBody,
                        textBody,
                        messageId,
                        inReplyTo,
                        threadId,
                        headers: headers ? headers : undefined,
                        receivedAt,
                    },
                });
                await tx.lead.updateMany({
                    where: {
                        id: leadId,
                        status: {
                            in: [client_1.LeadStatus.EMAIL_SENT, client_1.LeadStatus.FOLLOW_UP_SENT],
                        },
                    },
                    data: {
                        status: client_1.LeadStatus.RESPONDED,
                        lastActivityAt: new Date(),
                    },
                });
                return message;
            });
        }
        catch (error) {
            this.logger.error(`Failed to create inbound message from ${fromEmail}`, error);
            throw error;
        }
    }
    async getMessagesByLead(leadId, workspaceId, direction, limit = 50, offset = 0) {
        const where = {
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
    async getMessagesByWorkspace(workspaceId, direction, limit = 50, offset = 0) {
        const where = {
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
    async findByMessageId(messageId) {
        return this.prisma.message.findUnique({
            where: { messageId },
        });
    }
    async messageExists(messageId) {
        const count = await this.prisma.message.count({
            where: { messageId },
        });
        return count > 0;
    }
    async getConversationsNeedingReply(workspaceId, limit = 50, offset = 0) {
        const leadsWithInbound = await this.prisma.message.findMany({
            where: {
                workspaceId,
                direction: client_1.MessageDirection.INBOUND,
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
        const conversations = await Promise.all(leadIds.slice(offset, offset + limit).map(async (leadId) => {
            const [lead, messageCount, latestMessage, hasUnread] = await Promise.all([
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
                this.prisma.message.findFirst({
                    where: {
                        leadId,
                        workspaceId,
                        direction: client_1.MessageDirection.INBOUND,
                    },
                    orderBy: { createdAt: 'desc' },
                }),
            ]);
            if (!lead)
                return null;
            const preview = latestMessage?.textBody.substring(0, 100) || '(No message content)';
            const lastActivityTime = hasUnread?.createdAt || lead.lastActivityAt;
            const minutesAgo = lastActivityTime
                ? Math.floor((Date.now() - lastActivityTime.getTime()) / (1000 * 60))
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
                hasUnread: true,
            };
        }));
        const filteredConversations = conversations.filter((c) => c !== null);
        filteredConversations.sort((a, b) => {
            const aTime = a.latestMessage.createdAt?.getTime() ||
                a.lead.lastActivityAt?.getTime() ||
                0;
            const bTime = b.latestMessage.createdAt?.getTime() ||
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
    async getConversationsSentOnly(workspaceId, limit = 50, offset = 0) {
        const leadsWithOutbound = await this.prisma.message.findMany({
            where: {
                workspaceId,
                direction: client_1.MessageDirection.OUTBOUND,
            },
            select: {
                leadId: true,
            },
            distinct: ['leadId'],
        });
        const outboundLeadIds = new Set(leadsWithOutbound.map((m) => m.leadId));
        const leadsWithInbound = await this.prisma.message.findMany({
            where: {
                workspaceId,
                direction: client_1.MessageDirection.INBOUND,
            },
            select: {
                leadId: true,
            },
            distinct: ['leadId'],
        });
        const inboundLeadIds = new Set(leadsWithInbound.map((m) => m.leadId));
        const sentOnlyLeadIds = Array.from(outboundLeadIds).filter((id) => !inboundLeadIds.has(id));
        if (sentOnlyLeadIds.length === 0) {
            return {
                data: [],
                total: 0,
                limit,
                offset,
            };
        }
        const conversations = await Promise.all(sentOnlyLeadIds.slice(offset, offset + limit).map(async (leadId) => {
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
            if (!lead)
                return null;
            const preview = latestMessage?.textBody.substring(0, 100) || '(No message content)';
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
                hasUnread: false,
            };
        }));
        const filteredConversations = conversations.filter((c) => c !== null);
        filteredConversations.sort((a, b) => {
            const aTime = a.latestMessage.createdAt?.getTime() ||
                a.lead.lastActivityAt?.getTime() ||
                0;
            const bTime = b.latestMessage.createdAt?.getTime() ||
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
};
exports.MessageService = MessageService;
exports.MessageService = MessageService = MessageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MessageService);
//# sourceMappingURL=message.service.js.map