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
var WorkflowExecutionProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowExecutionProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const workflow_executor_service_1 = require("../services/workflow-executor.service");
let WorkflowExecutionProcessor = WorkflowExecutionProcessor_1 = class WorkflowExecutionProcessor extends bullmq_1.WorkerHost {
    workflowExecutor;
    logger = new common_1.Logger(WorkflowExecutionProcessor_1.name);
    constructor(workflowExecutor) {
        super();
        this.workflowExecutor = workflowExecutor;
    }
    async process(job) {
        this.logger.log(`Processing job: ${job.name} (ID: ${job.id})`);
        try {
            switch (job.name) {
                case 'execute-workflow':
                    await this.executeWorkflow(job);
                    break;
                case 'execute-delayed-step':
                    await this.executeDelayedStep(job);
                    break;
                default:
                    this.logger.warn(`Unknown job type: ${job.name}`);
            }
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Job failed: ${job.name}`, error);
            throw error;
        }
    }
    async executeWorkflow(job) {
        const { executionId } = job.data;
        this.logger.log(`Executing workflow: ${executionId}`);
        await this.workflowExecutor.execute(executionId);
        this.logger.log(`Workflow execution completed: ${executionId}`);
    }
    async executeDelayedStep(job) {
        const { executionId, fromStep } = job.data;
        this.logger.log(`Resuming workflow ${executionId} from step ${fromStep}`);
        await this.workflowExecutor.execute(executionId, fromStep);
        this.logger.log(`Delayed workflow execution completed: ${executionId}`);
    }
};
exports.WorkflowExecutionProcessor = WorkflowExecutionProcessor;
exports.WorkflowExecutionProcessor = WorkflowExecutionProcessor = WorkflowExecutionProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('workflow-execution', {
        concurrency: 5,
    }),
    __metadata("design:paramtypes", [workflow_executor_service_1.WorkflowExecutorService])
], WorkflowExecutionProcessor);
//# sourceMappingURL=workflow-execution.processor.js.map