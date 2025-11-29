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
};
exports.EmailTrackingService = EmailTrackingService;
exports.EmailTrackingService = EmailTrackingService = EmailTrackingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService,
        config_1.ConfigService])
], EmailTrackingService);
//# sourceMappingURL=email-tracking.service.js.map