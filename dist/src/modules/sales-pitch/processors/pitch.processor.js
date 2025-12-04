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
var PitchProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PitchProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const sales_pitch_service_1 = require("../services/sales-pitch.service");
let PitchProcessor = PitchProcessor_1 = class PitchProcessor extends bullmq_1.WorkerHost {
    pitchService;
    logger = new common_1.Logger(PitchProcessor_1.name);
    constructor(pitchService) {
        super();
        this.pitchService = pitchService;
    }
    async process(job) {
        const { workspaceId, leadIds } = job.data;
        this.logger.log(`Starting batch pitch generation for ${leadIds.length} leads`);
        let completed = 0;
        let failed = 0;
        for (const leadId of leadIds) {
            try {
                await this.pitchService.generateOrGetCachedPitch(leadId, workspaceId);
                completed++;
                this.logger.log(`Generated pitch for lead ${leadId} (${completed}/${leadIds.length})`);
                await job.updateProgress({
                    completed,
                    failed,
                    currentLeadId: leadId,
                });
            }
            catch (error) {
                failed++;
                this.logger.error(`Failed to generate pitch for lead ${leadId}: ${error.message}`);
                await job.updateProgress({
                    completed,
                    failed,
                    currentLeadId: leadId,
                    lastError: error.message,
                });
            }
        }
        this.logger.log(`Batch generation complete: ${completed} succeeded, ${failed} failed`);
        return {
            completed,
            failed,
            total: leadIds.length,
        };
    }
};
exports.PitchProcessor = PitchProcessor;
exports.PitchProcessor = PitchProcessor = PitchProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('pitch-generation', {
        concurrency: 3,
    }),
    __metadata("design:paramtypes", [sales_pitch_service_1.SalesPitchService])
], PitchProcessor);
//# sourceMappingURL=pitch.processor.js.map