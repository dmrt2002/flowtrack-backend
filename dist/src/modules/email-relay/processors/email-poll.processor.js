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
var EmailPollProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailPollProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const imap_poller_service_1 = require("../services/imap-poller.service");
let EmailPollProcessor = EmailPollProcessor_1 = class EmailPollProcessor extends bullmq_1.WorkerHost {
    imapPollerService;
    logger = new common_1.Logger(EmailPollProcessor_1.name);
    constructor(imapPollerService) {
        super();
        this.imapPollerService = imapPollerService;
    }
    async process(job) {
        this.logger.log(`Processing email polling job: ${job.id}`);
        const startTime = Date.now();
        try {
            await this.imapPollerService.pollInbox();
            const duration = Date.now() - startTime;
            this.logger.log(`Email polling completed in ${duration}ms`);
            return {
                success: true,
                timestamp: new Date(),
                duration,
            };
        }
        catch (error) {
            this.logger.error('Email polling job failed', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date(),
            };
        }
    }
};
exports.EmailPollProcessor = EmailPollProcessor;
exports.EmailPollProcessor = EmailPollProcessor = EmailPollProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('email-relay-poll', { concurrency: 1 }),
    __metadata("design:paramtypes", [imap_poller_service_1.ImapPollerService])
], EmailPollProcessor);
//# sourceMappingURL=email-poll.processor.js.map