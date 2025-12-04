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
exports.EnrichmentController = void 0;
const common_1 = require("@nestjs/common");
const enrichment_service_1 = require("./services/enrichment.service");
const enrichment_queue_service_1 = require("./services/enrichment-queue.service");
const prisma_service_1 = require("../../prisma/prisma.service");
let EnrichmentController = class EnrichmentController {
    enrichmentService;
    enrichmentQueue;
    prisma;
    constructor(enrichmentService, enrichmentQueue, prisma) {
        this.enrichmentService = enrichmentService;
        this.enrichmentQueue = enrichmentQueue;
        this.prisma = prisma;
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
    async getEnrichment(workspaceId, leadId) {
        const lead = await this.prisma.lead.findFirst({
            where: {
                id: leadId,
                workspaceId,
            },
            select: {
                enrichmentData: true,
                enrichmentStatus: true,
                enrichedAt: true,
            },
        });
        if (!lead) {
            return {
                success: false,
                error: 'Lead not found',
            };
        }
        return {
            success: true,
            data: lead.enrichmentData,
            status: lead.enrichmentStatus,
            enrichedAt: lead.enrichedAt,
        };
    }
    async getQueueStatus() {
        const status = await this.enrichmentQueue.getQueueStatus();
        return {
            success: true,
            queue: status,
        };
    }
    async bulkEnrich(workspaceId) {
        const leads = await this.prisma.lead.findMany({
            where: {
                workspaceId,
                OR: [
                    { enrichmentStatus: null },
                    { enrichmentStatus: 'PENDING' },
                    { enrichmentStatus: 'FAILED' },
                ],
            },
            select: {
                id: true,
                workspaceId: true,
                email: true,
                name: true,
                companyName: true,
            },
            take: 100,
        });
        if (leads.length === 0) {
            return {
                success: true,
                message: 'No leads to enrich',
                count: 0,
            };
        }
        await this.enrichmentQueue.bulkEnqueueEnrichment(leads.map((lead) => ({
            leadId: lead.id,
            workspaceId: lead.workspaceId,
            email: lead.email,
            name: lead.name || undefined,
            companyName: lead.companyName || undefined,
        })));
        return {
            success: true,
            message: `Enrichment queued for ${leads.length} leads`,
            count: leads.length,
        };
    }
};
exports.EnrichmentController = EnrichmentController;
__decorate([
    (0, common_1.Post)(':leadId/enrich'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Param)('leadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EnrichmentController.prototype, "enrichLead", null);
__decorate([
    (0, common_1.Get)(':leadId/enrichment'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Param)('leadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EnrichmentController.prototype, "getEnrichment", null);
__decorate([
    (0, common_1.Get)('enrichment/status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EnrichmentController.prototype, "getQueueStatus", null);
__decorate([
    (0, common_1.Post)('enrich/bulk'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnrichmentController.prototype, "bulkEnrich", null);
exports.EnrichmentController = EnrichmentController = __decorate([
    (0, common_1.Controller)('api/v1/workspaces/:workspaceId/leads'),
    __metadata("design:paramtypes", [enrichment_service_1.EnrichmentService,
        enrichment_queue_service_1.EnrichmentQueueService,
        prisma_service_1.PrismaService])
], EnrichmentController);
//# sourceMappingURL=enrichment.controller.js.map