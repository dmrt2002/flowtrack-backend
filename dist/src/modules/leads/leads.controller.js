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
exports.LeadsController = void 0;
const common_1 = require("@nestjs/common");
const unified_auth_guard_1 = require("../../auth/guards/unified-auth.guard");
const leads_service_1 = require("./leads.service");
const leads_dto_1 = require("./dto/leads.dto");
const enrichment_queue_service_1 = require("../enrichment/services/enrichment-queue.service");
const prisma_service_1 = require("../../prisma/prisma.service");
let LeadsController = class LeadsController {
    leadsService;
    enrichmentQueue;
    prisma;
    constructor(leadsService, enrichmentQueue, prisma) {
        this.leadsService = leadsService;
        this.enrichmentQueue = enrichmentQueue;
        this.prisma = prisma;
    }
    async getLeads(workspaceId, query) {
        return this.leadsService.getLeads(workspaceId, query);
    }
    async getLeadMetrics(workspaceId, query) {
        return this.leadsService.getLeadMetrics(workspaceId, query);
    }
    async getLeadById(workspaceId, leadId) {
        return this.leadsService.getLeadById(workspaceId, leadId);
    }
    async updateLead(workspaceId, leadId, dto, req) {
        return this.leadsService.updateLead(workspaceId, leadId, dto, req.user?.id);
    }
    async updateLeadStatus(workspaceId, leadId, dto, req) {
        return this.leadsService.updateLeadStatus(workspaceId, leadId, dto, req.user?.id);
    }
    async bulkUpdateLeads(workspaceId, dto, req) {
        return this.leadsService.bulkUpdateLeads(workspaceId, dto, req.user?.id);
    }
    async deleteLead(workspaceId, leadId) {
        return this.leadsService.deleteLead(workspaceId, leadId);
    }
    async enrichLead(workspaceId, leadId) {
        const lead = await this.prisma.lead.findFirst({
            where: {
                id: leadId,
                workspaceId,
            },
        });
        if (!lead) {
            return {
                success: false,
                error: 'Lead not found',
            };
        }
        await this.enrichmentQueue.enqueueEnrichment({
            leadId: lead.id,
            workspaceId: lead.workspaceId,
            email: lead.email,
            name: lead.name || undefined,
            companyName: lead.companyName || undefined,
        });
        return {
            success: true,
            message: 'Enrichment queued',
            leadId,
        };
    }
};
exports.LeadsController = LeadsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, leads_dto_1.GetLeadsQueryDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getLeads", null);
__decorate([
    (0, common_1.Get)('metrics'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, leads_dto_1.GetLeadMetricsQueryDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getLeadMetrics", null);
__decorate([
    (0, common_1.Get)(':leadId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Param)('leadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getLeadById", null);
__decorate([
    (0, common_1.Patch)(':leadId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Param)('leadId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, leads_dto_1.UpdateLeadDto, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "updateLead", null);
__decorate([
    (0, common_1.Patch)(':leadId/status'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Param)('leadId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, leads_dto_1.UpdateLeadStatusDto, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "updateLeadStatus", null);
__decorate([
    (0, common_1.Patch)('bulk'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, leads_dto_1.BulkUpdateLeadsDto, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "bulkUpdateLeads", null);
__decorate([
    (0, common_1.Delete)(':leadId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Param)('leadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "deleteLead", null);
__decorate([
    (0, common_1.Post)(':leadId/enrich'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Param)('leadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "enrichLead", null);
exports.LeadsController = LeadsController = __decorate([
    (0, common_1.Controller)('workspaces/:workspaceId/leads'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [leads_service_1.LeadsService,
        enrichment_queue_service_1.EnrichmentQueueService,
        prisma_service_1.PrismaService])
], LeadsController);
//# sourceMappingURL=leads.controller.js.map