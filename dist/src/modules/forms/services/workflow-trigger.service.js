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
var WorkflowTriggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowTriggerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const workflow_queue_service_1 = require("../../workflows/services/workflow-queue.service");
let WorkflowTriggerService = WorkflowTriggerService_1 = class WorkflowTriggerService {
    prisma;
    workflowQueueService;
    logger = new common_1.Logger(WorkflowTriggerService_1.name);
    constructor(prisma, workflowQueueService) {
        this.prisma = prisma;
        this.workflowQueueService = workflowQueueService;
    }
    async triggerFormWorkflow(leadId, workflowId, triggerData) {
        try {
            const workflow = await this.prisma.workflow.findUnique({
                where: { id: workflowId },
                include: {
                    nodes: {
                        where: {
                            nodeCategory: 'trigger',
                            nodeType: 'trigger_form',
                            deletedAt: null,
                        },
                        take: 1,
                    },
                },
            });
            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }
            if (!workflow.nodes || workflow.nodes.length === 0) {
                this.logger.warn(`No trigger node found for workflow ${workflowId}. Workflow may not execute.`);
            }
            const triggerNode = workflow.nodes[0];
            const execution = await this.prisma.workflowExecution.create({
                data: {
                    workflowId,
                    workspaceId: workflow.workspaceId,
                    leadId,
                    triggerType: 'form_submission',
                    triggerNodeId: triggerNode?.id,
                    triggerData,
                    status: client_1.WorkflowExecutionStatus.queued,
                    startedAt: new Date(),
                },
            });
            await this.prisma.executionLog.create({
                data: {
                    executionId: execution.id,
                    workspaceId: workflow.workspaceId,
                    logLevel: client_1.LogLevel.INFO,
                    logCategory: 'trigger',
                    message: 'Form submission workflow triggered',
                    details: {
                        leadId,
                        workflowId,
                        triggerNodeId: triggerNode?.id,
                        triggerData,
                    },
                    nodeType: 'trigger_form',
                },
            });
            await this.prisma.workflow.update({
                where: { id: workflowId },
                data: {
                    totalExecutions: { increment: 1 },
                    lastExecutedAt: new Date(),
                },
            });
            this.logger.log(`Workflow execution created: ${execution.id} for lead ${leadId}`);
            await this.workflowQueueService.enqueueExecution(execution.id);
            this.logger.log(`Workflow execution queued successfully: ${execution.id}`);
            return execution.id;
        }
        catch (error) {
            this.logger.error(`Failed to trigger workflow ${workflowId} for lead ${leadId}:`, error);
            throw error;
        }
    }
    async executeWorkflowSync(executionId) {
        const execution = await this.prisma.workflowExecution.findUnique({
            where: { id: executionId },
            include: {
                workflow: {
                    include: {
                        nodes: {
                            where: { deletedAt: null },
                            orderBy: { executionOrder: 'asc' },
                        },
                        edges: {
                            where: { deletedAt: null },
                        },
                    },
                },
                lead: {
                    include: {
                        fieldData: {
                            include: {
                                formField: true,
                            },
                        },
                    },
                },
            },
        });
        if (!execution) {
            throw new Error(`Execution not found: ${executionId}`);
        }
        try {
            await this.prisma.workflowExecution.update({
                where: { id: executionId },
                data: {
                    status: client_1.WorkflowExecutionStatus.running,
                },
            });
            await this.prisma.executionLog.create({
                data: {
                    executionId,
                    workspaceId: execution.workspaceId,
                    logLevel: client_1.LogLevel.INFO,
                    logCategory: 'execution',
                    message: 'Workflow execution started',
                    details: {
                        workflowId: execution.workflowId,
                        leadId: execution.leadId,
                    },
                },
            });
            const endTime = new Date();
            const durationMs = execution.startedAt
                ? endTime.getTime() - execution.startedAt.getTime()
                : 0;
            await this.prisma.workflowExecution.update({
                where: { id: executionId },
                data: {
                    status: client_1.WorkflowExecutionStatus.completed,
                    completedAt: endTime,
                    durationMs,
                },
            });
            await this.prisma.workflow.update({
                where: { id: execution.workflowId },
                data: {
                    successfulExecutions: { increment: 1 },
                },
            });
            this.logger.log(`Workflow execution completed: ${executionId}`);
        }
        catch (error) {
            await this.prisma.workflowExecution.update({
                where: { id: executionId },
                data: {
                    status: client_1.WorkflowExecutionStatus.failed,
                    errorMessage: error.message,
                    errorDetails: {
                        stack: error.stack,
                        name: error.name,
                    },
                },
            });
            await this.prisma.workflow.update({
                where: { id: execution.workflowId },
                data: {
                    failedExecutions: { increment: 1 },
                },
            });
            await this.prisma.executionLog.create({
                data: {
                    executionId,
                    workspaceId: execution.workspaceId,
                    logLevel: client_1.LogLevel.ERROR,
                    logCategory: 'execution',
                    message: 'Workflow execution failed',
                    details: {
                        error: error.message,
                        stack: error.stack,
                    },
                },
            });
            this.logger.error(`Workflow execution failed: ${executionId}`, error);
            throw error;
        }
    }
    async getExecutionStatus(executionId) {
        return this.prisma.workflowExecution.findUnique({
            where: { id: executionId },
            include: {
                executionSteps: {
                    orderBy: { stepNumber: 'asc' },
                },
                executionLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
    }
};
exports.WorkflowTriggerService = WorkflowTriggerService;
exports.WorkflowTriggerService = WorkflowTriggerService = WorkflowTriggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workflow_queue_service_1.WorkflowQueueService])
], WorkflowTriggerService);
//# sourceMappingURL=workflow-trigger.service.js.map