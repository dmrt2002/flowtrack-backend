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
var SentEmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentEmailService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let SentEmailService = SentEmailService_1 = class SentEmailService {
    prisma;
    logger = new common_1.Logger(SentEmailService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordSentEmail(data) {
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
            this.logger.log(`✅ Recorded sent email: ${sentEmail.id} (${data.emailType} to ${data.recipientEmail})`);
            return sentEmail;
        }
        catch (error) {
            this.logger.error(`Failed to record sent email: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getSentEmailsByWorkspace(options) {
        const { workspaceId, workflowId, emailType, deliveryStatus, openStatus, search, limit = 50, offset = 0, sortBy = 'sentAt', sortOrder = 'desc', } = options;
        const where = {
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
        }
        else if (openStatus === 'unopened') {
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
    async getSentEmailsByLead(options) {
        const { workspaceId, leadId, emailType, openStatus, limit = 50, offset = 0, } = options;
        if (!leadId) {
            throw new Error('leadId is required for getSentEmailsByLead');
        }
        const where = {
            workspaceId,
            leadId,
        };
        if (emailType) {
            where.emailType = emailType;
        }
        if (openStatus === 'opened') {
            where.openCount = { gt: 0 };
        }
        else if (openStatus === 'unopened') {
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
    async getSentEmailById(emailId, workspaceId) {
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
    async updateEmailOpenTracking(emailId) {
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
            this.logger.log(`📧 Email open tracked: ${emailId} (open count: ${sentEmail.openCount + 1})`);
        }
        catch (error) {
            this.logger.error(`Failed to update email open tracking: ${error.message}`, error.stack);
            throw error;
        }
    }
    async updateDeliveryStatus(emailId, deliveryStatus, deliveryError) {
        try {
            await this.prisma.sentEmail.update({
                where: { id: emailId },
                data: {
                    deliveryStatus,
                    deliveryError,
                },
            });
            this.logger.log(`📬 Delivery status updated: ${emailId} -> ${deliveryStatus}`);
        }
        catch (error) {
            this.logger.error(`Failed to update delivery status: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getEmailStatistics(workspaceId) {
        const [totalSent, totalOpened, totalBounced, totalFailed,] = await Promise.all([
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
            openRate: Math.round(openRate * 100) / 100,
        };
    }
};
exports.SentEmailService = SentEmailService;
exports.SentEmailService = SentEmailService = SentEmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SentEmailService);
//# sourceMappingURL=sent-email.service.js.map