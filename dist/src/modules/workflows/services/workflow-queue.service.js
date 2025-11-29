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
var WorkflowQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let WorkflowQueueService = WorkflowQueueService_1 = class WorkflowQueueService {
    workflowQueue;
    logger = new common_1.Logger(WorkflowQueueService_1.name);
    constructor(workflowQueue) {
        this.workflowQueue = workflowQueue;
    }
    async enqueueExecution(executionId) {
        this.logger.log(`Enqueueing workflow execution: ${executionId}`);
        await this.workflowQueue.add('execute-workflow', { executionId }, {
            jobId: `execution-${executionId}`,
            removeOnComplete: true,
            removeOnFail: false,
        });
        this.logger.log(`Successfully enqueued execution: ${executionId}`);
    }
    async enqueueDelayedExecution(executionId, fromStep, delayMs) {
        this.logger.log(`Enqueueing delayed execution: ${executionId} (delay: ${delayMs}ms, from step: ${fromStep})`);
        await this.workflowQueue.add('execute-delayed-step', { executionId, fromStep }, {
            delay: delayMs,
            jobId: `delayed-${executionId}-${fromStep}-${Date.now()}`,
            removeOnComplete: true,
            removeOnFail: false,
        });
        this.logger.log(`Successfully enqueued delayed execution: ${executionId}`);
    }
    async getQueueMetrics() {
        const waiting = await this.workflowQueue.getWaitingCount();
        const active = await this.workflowQueue.getActiveCount();
        const delayed = await this.workflowQueue.getDelayedCount();
        const failed = await this.workflowQueue.getFailedCount();
        return { waiting, active, delayed, failed };
    }
};
exports.WorkflowQueueService = WorkflowQueueService;
exports.WorkflowQueueService = WorkflowQueueService = WorkflowQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('workflow-execution')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], WorkflowQueueService);
//# sourceMappingURL=workflow-queue.service.js.map