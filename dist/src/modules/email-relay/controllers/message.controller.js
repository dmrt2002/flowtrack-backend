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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageController = void 0;
const common_1 = require("@nestjs/common");
const unified_auth_guard_1 = require("../../../auth/guards/unified-auth.guard");
const message_service_1 = require("../services/message.service");
const relay_email_service_1 = require("../services/relay-email.service");
const prisma_service_1 = require("../../../prisma/prisma.service");
const send_relay_email_dto_1 = require("../dto/send-relay-email.dto");
const get_messages_dto_1 = require("../dto/get-messages.dto");
const zod_validation_pipe_1 = require("../../../common/pipes/zod-validation.pipe");
let MessageController = class MessageController {
    messageService;
    relayEmailService;
    prisma;
    constructor(messageService, relayEmailService, prisma) {
        this.messageService = messageService;
        this.relayEmailService = relayEmailService;
        this.prisma = prisma;
    }
    async getWorkspaceMessages(workspaceId, query) {
        return this.messageService.getMessagesByWorkspace(workspaceId, query.direction, query.limit, query.offset);
    }
    async getLeadMessages(workspaceId, leadId, query) {
        const lead = await this.prisma.lead.findFirst({
            where: {
                id: leadId,
                workspaceId,
            },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found in this workspace');
        }
        return this.messageService.getMessagesByLead(leadId, workspaceId, query.direction, query.limit, query.offset);
    }
    async sendEmailToLead(workspaceId, leadId, dto) {
        const lead = await this.prisma.lead.findFirst({
            where: {
                id: leadId,
                workspaceId,
            },
            select: {
                email: true,
                name: true,
            },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found in this workspace');
        }
        try {
            const result = await this.relayEmailService.sendEmailToLead(workspaceId, leadId, lead.email, lead.name || undefined, dto.subject, dto.textBody, dto.htmlBody, dto.senderName);
            return {
                success: true,
                messageId: result.messageId,
                message: 'Email sent successfully',
            };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to send email: ' + error.message);
        }
    }
};
exports.MessageController = MessageController;
__decorate([
    (0, common_1.Get)('messages'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(get_messages_dto_1.getMessagesQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MessageController.prototype, "getWorkspaceMessages", null);
__decorate([
    (0, common_1.Get)('leads/:leadId/messages'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Param)('leadId')),
    __param(2, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(get_messages_dto_1.getMessagesQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MessageController.prototype, "getLeadMessages", null);
__decorate([
    (0, common_1.Post)('leads/:leadId/messages/send'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Param)('leadId')),
    __param(2, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(send_relay_email_dto_1.sendRelayEmailSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MessageController.prototype, "sendEmailToLead", null);
exports.MessageController = MessageController = __decorate([
    (0, common_1.Controller)('workspaces/:workspaceId'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [message_service_1.MessageService,
        relay_email_service_1.RelayEmailService,
        prisma_service_1.PrismaService])
], MessageController);
//# sourceMappingURL=message.controller.js.map