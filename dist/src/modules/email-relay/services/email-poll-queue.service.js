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
var EmailPollQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailPollQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const config_1 = require("@nestjs/config");
let EmailPollQueueService = EmailPollQueueService_1 = class EmailPollQueueService {
    emailPollQueue;
    config;
    logger = new common_1.Logger(EmailPollQueueService_1.name);
    constructor(emailPollQueue, config) {
        this.emailPollQueue = emailPollQueue;
        this.config = config;
    }
    async onModuleInit() {
        await this.schedulePolling();
        this.logger.log('Email polling cron jobs initialized');
    }
    async schedulePolling() {
        const repeatableJobs = await this.emailPollQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await this.emailPollQueue.removeRepeatableByKey(job.key);
        }
        const pollIntervalMinutes = this.config.get('EMAIL_POLL_INTERVAL_MINUTES', 5);
        await this.emailPollQueue.add('poll-inbox', {}, {
            repeat: {
                pattern: `*/${pollIntervalMinutes} * * * *`,
            },
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
        this.logger.log(`Scheduled email polling (every ${pollIntervalMinutes} minutes)`);
    }
    async triggerManualPolling() {
        await this.emailPollQueue.add('poll-inbox', {}, {
            priority: 1,
        });
        this.logger.log('Manual email polling job triggered');
    }
    async getQueueStats() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.emailPollQueue.getWaitingCount(),
            this.emailPollQueue.getActiveCount(),
            this.emailPollQueue.getCompletedCount(),
            this.emailPollQueue.getFailedCount(),
            this.emailPollQueue.getDelayedCount(),
        ]);
        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
        };
    }
    async clearQueue() {
        await this.emailPollQueue.drain();
        this.logger.log('Email polling queue cleared');
    }
};
exports.EmailPollQueueService = EmailPollQueueService;
exports.EmailPollQueueService = EmailPollQueueService = EmailPollQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('email-relay-poll')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        config_1.ConfigService])
], EmailPollQueueService);
//# sourceMappingURL=email-poll-queue.service.js.map