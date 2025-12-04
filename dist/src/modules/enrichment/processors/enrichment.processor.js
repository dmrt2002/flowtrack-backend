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
var EnrichmentProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichmentProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const enrichment_service_1 = require("../services/enrichment.service");
let EnrichmentProcessor = EnrichmentProcessor_1 = class EnrichmentProcessor extends bullmq_1.WorkerHost {
    enrichmentService;
    logger = new common_1.Logger(EnrichmentProcessor_1.name);
    constructor(enrichmentService) {
        super();
        this.enrichmentService = enrichmentService;
    }
    async process(job) {
        this.logger.log(`Processing enrichment job: ${job.name} (ID: ${job.id})`);
        try {
            switch (job.name) {
                case 'enrich-lead':
                    return await this.enrichLead(job);
                default:
                    this.logger.warn(`Unknown job type: ${job.name}`);
                    return { success: false, error: 'Unknown job type' };
            }
        }
        catch (error) {
            this.logger.error(`Enrichment job failed: ${job.name} (Lead: ${job.data.leadId})`, error.stack);
            throw error;
        }
    }
    async enrichLead(job) {
        const { leadId, email, name, companyName, retryCount = 0 } = job.data;
        this.logger.log(`Enriching lead ${leadId} (${email}) - Attempt ${retryCount + 1}`);
        const result = await this.enrichmentService.enrichLead(leadId, email, name, companyName);
        if (result.success) {
            this.logger.log(`Successfully enriched lead ${leadId}`);
        }
        else if (result.skipped) {
            this.logger.warn(`Skipped enrichment for lead ${leadId}: ${result.skipReason}`);
        }
        else {
            this.logger.error(`Failed to enrich lead ${leadId}: ${result.error}`);
        }
        return result;
    }
};
exports.EnrichmentProcessor = EnrichmentProcessor;
exports.EnrichmentProcessor = EnrichmentProcessor = EnrichmentProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('lead-enrichment', {
        concurrency: 3,
    }),
    __metadata("design:paramtypes", [enrichment_service_1.EnrichmentService])
], EnrichmentProcessor);
//# sourceMappingURL=enrichment.processor.js.map