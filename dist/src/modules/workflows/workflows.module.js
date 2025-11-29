"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowsModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const jwt_1 = require("@nestjs/jwt");
const prisma_module_1 = require("../../prisma/prisma.module");
const email_module_1 = require("../email/email.module");
const workflows_controller_1 = require("./workflows.controller");
const workflow_queue_service_1 = require("./services/workflow-queue.service");
const workflow_executor_service_1 = require("./services/workflow-executor.service");
const condition_evaluator_service_1 = require("./services/condition-evaluator.service");
const workflow_configuration_service_1 = require("./services/workflow-configuration.service");
const workflow_execution_processor_1 = require("./processors/workflow-execution.processor");
let WorkflowsModule = class WorkflowsModule {
};
exports.WorkflowsModule = WorkflowsModule;
exports.WorkflowsModule = WorkflowsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            email_module_1.EmailModule,
            jwt_1.JwtModule.register({}),
            bullmq_1.BullModule.registerQueue({
                name: 'workflow-execution',
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50,
                },
            }),
        ],
        controllers: [workflows_controller_1.WorkflowsController],
        providers: [
            workflow_queue_service_1.WorkflowQueueService,
            workflow_executor_service_1.WorkflowExecutorService,
            condition_evaluator_service_1.ConditionEvaluatorService,
            workflow_configuration_service_1.WorkflowConfigurationService,
            workflow_execution_processor_1.WorkflowExecutionProcessor,
        ],
        exports: [
            workflow_queue_service_1.WorkflowQueueService,
        ],
    })
], WorkflowsModule);
//# sourceMappingURL=workflows.module.js.map