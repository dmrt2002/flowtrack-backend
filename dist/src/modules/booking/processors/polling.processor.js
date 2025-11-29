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
var PollingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollingProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const polling_service_1 = require("../services/polling.service");
let PollingProcessor = PollingProcessor_1 = class PollingProcessor extends bullmq_1.WorkerHost {
    pollingService;
    logger = new common_1.Logger(PollingProcessor_1.name);
    constructor(pollingService) {
        super();
        this.pollingService = pollingService;
    }
    async process(job) {
        this.logger.log(`Processing polling job: ${job.name}`);
        try {
            switch (job.name) {
                case 'poll-calendly-free-accounts':
                    await this.pollingService.pollAllCalendlyFreeAccounts();
                    return { success: true };
                default:
                    this.logger.warn(`Unknown job name: ${job.name}`);
                    return { success: false, error: 'Unknown job name' };
            }
        }
        catch (error) {
            this.logger.error(`Polling job failed: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.PollingProcessor = PollingProcessor;
exports.PollingProcessor = PollingProcessor = PollingProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('booking-polling', {
        concurrency: 1,
    }),
    __metadata("design:paramtypes", [polling_service_1.PollingService])
], PollingProcessor);
//# sourceMappingURL=polling.processor.js.map