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
var PollingQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollingQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const config_1 = require("@nestjs/config");
let PollingQueueService = PollingQueueService_1 = class PollingQueueService {
    pollingQueue;
    config;
    logger = new common_1.Logger(PollingQueueService_1.name);
    constructor(pollingQueue, config) {
        this.pollingQueue = pollingQueue;
        this.config = config;
    }
    async onModuleInit() {
        await this.schedulePolling();
        this.logger.log('Polling cron jobs initialized');
    }
    async schedulePolling() {
        const repeatableJobs = await this.pollingQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await this.pollingQueue.removeRepeatableByKey(job.key);
        }
        await this.pollingQueue.add('poll-calendly-free-accounts', {}, {
            repeat: {
                pattern: '0 */6 * * *',
            },
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 60000,
            },
        });
        this.logger.log('Scheduled Calendly FREE account polling (every 6 hours)');
    }
    async triggerManualPolling() {
        await this.pollingQueue.add('poll-calendly-free-accounts', {}, {
            priority: 1,
        });
        this.logger.log('Manual polling job triggered');
    }
    async getQueueStats() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.pollingQueue.getWaitingCount(),
            this.pollingQueue.getActiveCount(),
            this.pollingQueue.getCompletedCount(),
            this.pollingQueue.getFailedCount(),
            this.pollingQueue.getDelayedCount(),
        ]);
        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
        };
    }
    async getRecentJobs(limit = 10) {
        const jobs = await this.pollingQueue.getJobs(['completed', 'failed', 'active', 'waiting'], 0, limit);
        return jobs.map((job) => ({
            id: job.id,
            name: job.name,
            data: job.data,
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            returnvalue: job.returnvalue,
        }));
    }
    async pauseQueue() {
        await this.pollingQueue.pause();
        this.logger.log('Polling queue paused');
    }
    async resumeQueue() {
        await this.pollingQueue.resume();
        this.logger.log('Polling queue resumed');
    }
    async cleanupOldJobs() {
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const SEVEN_DAYS = 7 * ONE_DAY;
        await this.pollingQueue.clean(ONE_DAY, 10, 'completed');
        await this.pollingQueue.clean(SEVEN_DAYS, 10, 'failed');
        this.logger.log('Cleaned up old queue jobs');
    }
};
exports.PollingQueueService = PollingQueueService;
exports.PollingQueueService = PollingQueueService = PollingQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('booking-polling')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        config_1.ConfigService])
], PollingQueueService);
//# sourceMappingURL=polling-queue.service.js.map