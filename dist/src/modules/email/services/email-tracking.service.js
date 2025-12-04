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
var EmailTrackingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTrackingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let EmailTrackingService = EmailTrackingService_1 = class EmailTrackingService {
    jwtService;
    prisma;
    configService;
    logger = new common_1.Logger(EmailTrackingService_1.name);
    constructor(jwtService, prisma, configService) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.configService = configService;
    }
    generateTrackingToken(payload) {
        const secret = this.configService.get('JWT_SECRET');
        const token = this.jwtService.sign(payload, {
            secret,
            expiresIn: '90d',
        });
        return token;
    }
    async verifyTrackingToken(token) {
        try {
            const secret = this.configService.get('JWT_SECRET');
            const payload = this.jwtService.verify(token, {
                secret,
            });
            return payload;
        }
        catch (error) {
            this.logger.warn(`Invalid tracking token: ${error.message}`);
            return null;
        }
    }
    async recordEmailOpen(payload) {
        try {
            const { leadId, workflowExecutionId, emailType } = payload;
            await this.prisma.lead.update({
                where: { id: leadId },
                data: {
                    lastEmailOpenedAt: new Date(),
                },
            });
            const execution = await this.prisma.workflowExecution.findUnique({
                where: { id: workflowExecutionId },
            });
            if (execution) {
                const outputData = execution.outputData || {};
                const emailOpens = outputData.emailOpens || {};
                emailOpens[emailType] = {
                    openedAt: new Date().toISOString(),
                    openCount: (emailOpens[emailType]?.openCount || 0) + 1,
                };
                await this.prisma.workflowExecution.update({
                    where: { id: workflowExecutionId },
                    data: {
                        outputData: {
                            ...outputData,
                            emailOpens,
                        },
                    },
                });
            }
            this.logger.log(`Email open tracked: leadId=${leadId}, emailType=${emailType}, executionId=${workflowExecutionId}`);
        }
        catch (error) {
            this.logger.error(`Failed to record email open: ${error.message}`, error.stack);
        }
    }
    getTrackingPixel() {
        const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        return transparentPng;
    }
    async createTrackingEvent(data) {
        try {
            await this.prisma.emailTrackingEvent.create({
                data: {
                    sentEmailId: data.sentEmailId,
                    workspaceId: data.workspaceId,
                    sentAt: data.sentAt,
                    openedAt: data.openedAt,
                    timeDeltaSeconds: data.timeDeltaSeconds,
                    clientIp: data.clientIp,
                    resolvedHostname: data.resolvedHostname,
                    userAgent: data.userAgent,
                    isAppleProxy: data.isAppleProxy,
                    classification: data.classification,
                    metadata: data.metadata || {},
                },
            });
            this.logger.log(`Tracking event created: sentEmailId=${data.sentEmailId}, classification=${data.classification}`);
        }
        catch (error) {
            this.logger.error(`Failed to create tracking event: ${error.message}`, error.stack);
            throw error;
        }
    }
    async updateSentEmailCounters(sentEmailId, classification, openedAt) {
        try {
            const sentEmail = await this.prisma.sentEmail.findUnique({
                where: { id: sentEmailId },
                select: {
                    openCount: true,
                    firstOpenedAt: true,
                    genuineOpenCount: true,
                    botPrefetchCount: true,
                    ambiguousOpenCount: true,
                    directOpenCount: true,
                },
            });
            if (!sentEmail) {
                this.logger.warn(`SentEmail not found: ${sentEmailId}`);
                return;
            }
            const updateData = {
                openCount: { increment: 1 },
                lastOpenedAt: openedAt,
            };
            if (!sentEmail.firstOpenedAt) {
                updateData.firstOpenedAt = openedAt;
            }
            switch (classification) {
                case client_1.EmailTrackingClassification.GENUINE_OPEN:
                    updateData.genuineOpenCount = { increment: 1 };
                    break;
                case client_1.EmailTrackingClassification.BOT_PREFETCH:
                    updateData.botPrefetchCount = { increment: 1 };
                    break;
                case client_1.EmailTrackingClassification.AMBIGUOUS:
                    updateData.ambiguousOpenCount = { increment: 1 };
                    break;
                case client_1.EmailTrackingClassification.DIRECT_OPEN:
                    updateData.directOpenCount = { increment: 1 };
                    break;
            }
            await this.prisma.sentEmail.update({
                where: { id: sentEmailId },
                data: updateData,
            });
            this.logger.debug(`SentEmail counters updated: sentEmailId=${sentEmailId}, classification=${classification}`);
        }
        catch (error) {
            this.logger.error(`Failed to update SentEmail counters: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findSentEmailByPayload(payload) {
        try {
            const sentEmail = await this.prisma.sentEmail.findFirst({
                where: {
                    leadId: payload.leadId,
                    workflowExecutionId: payload.workflowExecutionId,
                    emailType: payload.emailType,
                },
                select: {
                    id: true,
                    workspaceId: true,
                    sentAt: true,
                },
                orderBy: {
                    sentAt: 'desc',
                },
            });
            return sentEmail;
        }
        catch (error) {
            this.logger.error(`Failed to find SentEmail: ${error.message}`, error.stack);
            return null;
        }
    }
};
exports.EmailTrackingService = EmailTrackingService;
exports.EmailTrackingService = EmailTrackingService = EmailTrackingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService,
        config_1.ConfigService])
], EmailTrackingService);
//# sourceMappingURL=email-tracking.service.js.map