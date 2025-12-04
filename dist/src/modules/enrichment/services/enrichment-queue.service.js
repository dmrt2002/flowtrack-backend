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
var EnrichmentQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichmentQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let EnrichmentQueueService = EnrichmentQueueService_1 = class EnrichmentQueueService {
    enrichmentQueue;
    logger = new common_1.Logger(EnrichmentQueueService_1.name);
    constructor(enrichmentQueue) {
        this.enrichmentQueue = enrichmentQueue;
    }
    async enqueueEnrichment(jobData) {
        this.logger.log(`Enqueueing enrichment for lead: ${jobData.leadId}`);
        await this.enrichmentQueue.add('enrich-lead', jobData, {
            jobId: `enrich-${jobData.leadId}`,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
        this.logger.log(`Successfully enqueued enrichment for lead: ${jobData.leadId}`);
    }
    async bulkEnqueueEnrichment(jobs) {
        this.logger.log(`Bulk enqueueing ${jobs.length} leads for enrichment`);
        const bulkJobs = jobs.map((jobData) => ({
            name: 'enrich-lead',
            data: jobData,
            opts: {
                jobId: `enrich-${jobData.leadId}`,
                removeOnComplete: true,
                removeOnFail: false,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            },
        }));
        await this.enrichmentQueue.addBulk(bulkJobs);
        this.logger.log(`Successfully enqueued ${jobs.length} leads for enrichment`);
    }
    async getQueueStatus() {
        const [waiting, active, completed, failed] = await Promise.all([
            this.enrichmentQueue.getWaitingCount(),
            this.enrichmentQueue.getActiveCount(),
            this.enrichmentQueue.getCompletedCount(),
            this.enrichmentQueue.getFailedCount(),
        ]);
        return { waiting, active, completed, failed };
    }
};
exports.EnrichmentQueueService = EnrichmentQueueService;
exports.EnrichmentQueueService = EnrichmentQueueService = EnrichmentQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('lead-enrichment')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], EnrichmentQueueService);
//# sourceMappingURL=enrichment-queue.service.js.map