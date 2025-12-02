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
exports.SentEmailController = void 0;
const common_1 = require("@nestjs/common");
const unified_auth_guard_1 = require("../../../auth/guards/unified-auth.guard");
const user_decorator_1 = require("../../../auth/decorators/user.decorator");
const sent_email_service_1 = require("../services/sent-email.service");
const prisma_service_1 = require("../../../prisma/prisma.service");
let SentEmailController = class SentEmailController {
    sentEmailService;
    prisma;
    constructor(sentEmailService, prisma) {
        this.sentEmailService = sentEmailService;
        this.prisma = prisma;
    }
    async getWorkspaceEmails(user, workspaceId, workflowId, emailType, deliveryStatus, openStatus, search, limit, offset, sortBy, sortOrder) {
        await this.verifyWorkspaceAccess(user.id, workspaceId);
        const options = {
            workspaceId,
            workflowId,
            emailType,
            deliveryStatus,
            openStatus: openStatus || 'all',
            search,
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
            sortBy: sortBy || 'sentAt',
            sortOrder: sortOrder || 'desc',
        };
        const result = await this.sentEmailService.getSentEmailsByWorkspace(options);
        return {
            success: true,
            data: result,
        };
    }
    async getLeadEmails(user, workspaceId, leadId, emailType, openStatus, limit, offset) {
        await this.verifyWorkspaceAccess(user.id, workspaceId);
        const options = {
            workspaceId,
            leadId,
            emailType,
            openStatus: openStatus || 'all',
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
        };
        const result = await this.sentEmailService.getSentEmailsByLead(options);
        return {
            success: true,
            data: result,
        };
    }
    async getSentEmailById(user, emailId, workspaceId) {
        await this.verifyWorkspaceAccess(user.id, workspaceId);
        const sentEmail = await this.sentEmailService.getSentEmailById(emailId, workspaceId);
        return {
            success: true,
            data: sentEmail,
        };
    }
    async getEmailStatistics(user, workspaceId) {
        await this.verifyWorkspaceAccess(user.id, workspaceId);
        const statistics = await this.sentEmailService.getEmailStatistics(workspaceId);
        return {
            success: true,
            data: statistics,
        };
    }
    async verifyWorkspaceAccess(userId, workspaceId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    where: { userId },
                },
            },
        });
        if (!workspace || workspace.members.length === 0) {
            throw new Error('Workspace not found or access denied');
        }
        return workspace;
    }
};
exports.SentEmailController = SentEmailController;
__decorate([
    (0, common_1.Get)('workspaces/:workspaceId'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workspaceId')),
    __param(2, (0, common_1.Query)('workflowId')),
    __param(3, (0, common_1.Query)('emailType')),
    __param(4, (0, common_1.Query)('deliveryStatus')),
    __param(5, (0, common_1.Query)('openStatus')),
    __param(6, (0, common_1.Query)('search')),
    __param(7, (0, common_1.Query)('limit')),
    __param(8, (0, common_1.Query)('offset')),
    __param(9, (0, common_1.Query)('sortBy')),
    __param(10, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SentEmailController.prototype, "getWorkspaceEmails", null);
__decorate([
    (0, common_1.Get)('workspaces/:workspaceId/leads/:leadId'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workspaceId')),
    __param(2, (0, common_1.Param)('leadId')),
    __param(3, (0, common_1.Query)('emailType')),
    __param(4, (0, common_1.Query)('openStatus')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SentEmailController.prototype, "getLeadEmails", null);
__decorate([
    (0, common_1.Get)(':emailId/workspaces/:workspaceId'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('emailId')),
    __param(2, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SentEmailController.prototype, "getSentEmailById", null);
__decorate([
    (0, common_1.Get)('workspaces/:workspaceId/statistics'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SentEmailController.prototype, "getEmailStatistics", null);
exports.SentEmailController = SentEmailController = __decorate([
    (0, common_1.Controller)('sent-emails'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [sent_email_service_1.SentEmailService,
        prisma_service_1.PrismaService])
], SentEmailController);
//# sourceMappingURL=sent-email.controller.js.map