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
var PitchQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PitchQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const bullmq_2 = require("@nestjs/bullmq");
let PitchQueueService = PitchQueueService_1 = class PitchQueueService {
    pitchQueue;
    logger = new common_1.Logger(PitchQueueService_1.name);
    constructor(pitchQueue) {
        this.pitchQueue = pitchQueue;
    }
    async addBatchGenerationJob(workspaceId, leadIds, userId) {
        this.logger.log(`Adding batch pitch generation job for ${leadIds.length} leads`);
        const job = await this.pitchQueue.add('generate-batch', {
            workspaceId,
            leadIds,
            userId,
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: {
                age: 3600,
                count: 100,
            },
            removeOnFail: {
                age: 86400,
            },
        });
        this.logger.log(`Batch generation job created with ID: ${job.id}`);
        return job.id;
    }
    async getJobProgress(jobId) {
        const job = await this.pitchQueue.getJob(jobId);
        if (!job) {
            return null;
        }
        const state = await job.getState();
        const progress = job.progress || { completed: 0, failed: 0 };
        const data = job.data;
        return {
            total: data.leadIds.length,
            completed: progress.completed || 0,
            failed: progress.failed || 0,
            inProgress: state === 'active' || state === 'waiting',
        };
    }
    async cancelJob(jobId) {
        const job = await this.pitchQueue.getJob(jobId);
        if (job) {
            await job.remove();
            this.logger.log(`Job ${jobId} cancelled`);
        }
    }
    async getQueueStats() {
        const [waiting, active, completed, failed] = await Promise.all([
            this.pitchQueue.getWaitingCount(),
            this.pitchQueue.getActiveCount(),
            this.pitchQueue.getCompletedCount(),
            this.pitchQueue.getFailedCount(),
        ]);
        return {
            waiting,
            active,
            completed,
            failed,
        };
    }
};
exports.PitchQueueService = PitchQueueService;
exports.PitchQueueService = PitchQueueService = PitchQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_2.InjectQueue)('pitch-generation')),
    __metadata("design:paramtypes", [bullmq_1.Queue])
], PitchQueueService);
//# sourceMappingURL=pitch-queue.service.js.map