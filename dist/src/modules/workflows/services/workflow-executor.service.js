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
var WorkflowExecutorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowExecutorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const workflow_email_service_1 = require("../../email/workflow-email.service");
const workflow_queue_service_1 = require("./workflow-queue.service");
const condition_evaluator_service_1 = require("./condition-evaluator.service");
const client_1 = require("@prisma/client");
let WorkflowExecutorService = WorkflowExecutorService_1 = class WorkflowExecutorService {
    prisma;
    emailService;
    queueService;
    conditionEvaluator;
    logger = new common_1.Logger(WorkflowExecutorService_1.name);
    constructor(prisma, emailService, queueService, conditionEvaluator) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.queueService = queueService;
        this.conditionEvaluator = conditionEvaluator;
    }
    async execute(executionId, fromStep = 0) {
        this.logger.log(`Starting workflow execution: ${executionId} from step ${fromStep}`);
        const execution = await this.prisma.workflowExecution.findUnique({
            where: { id: executionId },
            include: {
                workflow: {
                    include: {
                        nodes: {
                            where: { deletedAt: null },
                            orderBy: { executionOrder: 'asc' },
                        },
                    },
                },
                lead: {
                    include: {
                        fieldData: {
                            include: { formField: true },
                        },
                    },
                },
            },
        });
        if (!execution) {
            throw new common_1.NotFoundException(`Execution not found: ${executionId}`);
        }
        if (!execution.lead) {
            throw new Error(`No lead associated with execution: ${executionId}`);
        }
        try {
            await this.prisma.workflowExecution.update({
                where: { id: executionId },
                data: {
                    status: client_1.WorkflowExecutionStatus.running,
                    startedAt: execution.startedAt || new Date(),
                },
            });
            const nodesToExecute = execution.workflow.nodes.filter((node) => (node.executionOrder ?? 0) >= fromStep);
            this.logger.log(`Executing ${nodesToExecute.length} nodes for execution ${executionId}`);
            execution.reachableNodeIds = null;
            for (const node of nodesToExecute) {
                if (execution.reachableNodeIds &&
                    !execution.reachableNodeIds.has(node.reactFlowNodeId)) {
                    this.logger.log(`Skipping node ${node.nodeType} (${node.reactFlowNodeId}) - not on selected branch`);
                    continue;
                }
                const shouldContinue = await this.executeNode(execution, node, execution.lead);
                if (!shouldContinue) {
                    this.logger.log(`Execution paused at node ${node.nodeType}`);
                    return;
                }
            }
            await this.prisma.workflowExecution.update({
                where: { id: executionId },
                data: {
                    status: client_1.WorkflowExecutionStatus.completed,
                    completedAt: new Date(),
                },
            });
            this.logger.log(`Workflow execution completed: ${executionId}`);
        }
        catch (error) {
            await this.handleExecutionError(executionId, error);
            throw error;
        }
    }
    async executeNode(execution, node, lead) {
        this.logger.log(`Executing node: ${node.nodeType} (order: ${node.executionOrder})`);
        const step = await this.createExecutionStep(execution.id, node.id);
        try {
            await this.updateStepStatus(step.id, client_1.ExecutionStepStatus.running);
            let shouldContinue = true;
            switch (node.nodeType) {
                case 'trigger_form':
                    this.logger.log('Trigger node - already executed');
                    break;
                case 'send_email':
                    await this.executeSendEmail(node, lead, execution);
                    break;
                case 'send_followup':
                    await this.executeSendFollowup(node, lead, execution);
                    break;
                case 'delay':
                    shouldContinue = false;
                    await this.executeDelay(node, execution, step);
                    break;
                case 'condition':
                    const conditionMet = await this.conditionEvaluator.evaluateCondition(node, lead);
                    this.logger.log(`Condition result for node ${node.reactFlowNodeId}: ${conditionMet}`);
                    const edges = await this.prisma.workflowEdge.findMany({
                        where: {
                            workflowId: execution.workflowId,
                            sourceNodeId: node.reactFlowNodeId,
                            deletedAt: null,
                            isEnabled: true,
                        },
                    });
                    const selectedHandle = conditionMet ? 'true' : 'false';
                    const selectedEdge = edges.find((e) => e.sourceHandle === selectedHandle);
                    if (selectedEdge) {
                        this.logger.log(`Following ${selectedHandle} branch to node ${selectedEdge.targetNodeId}`);
                        await this.storeBranchDecision(step.id, selectedHandle, selectedEdge.targetNodeId);
                        const reachableNodes = await this.getReachableNodes(execution.workflowId, selectedEdge.targetNodeId);
                        if (!execution.reachableNodeIds) {
                            execution.reachableNodeIds = new Set();
                        }
                        reachableNodes.forEach((nodeId) => execution.reachableNodeIds.add(nodeId));
                        this.logger.log(`Total reachable nodes after this condition: ${execution.reachableNodeIds.size}`);
                    }
                    else {
                        this.logger.warn(`No edge found for ${selectedHandle} branch on condition node ${node.reactFlowNodeId}`);
                    }
                    break;
                case 'mark_failed':
                    await this.markLeadFailed(lead.id);
                    break;
                default:
                    this.logger.warn(`Unknown node type: ${node.nodeType}`);
            }
            await this.updateStepStatus(step.id, client_1.ExecutionStepStatus.completed);
            return shouldContinue;
        }
        catch (error) {
            await this.handleStepError(step.id, error);
            throw error;
        }
    }
    async executeSendEmail(node, lead, execution) {
        this.logger.log(`Sending email to ${lead.email}`);
        const nodeConfig = node.config;
        const workflowConfig = execution.workflow.configurationData;
        const emailTemplate = nodeConfig?.emailTemplate || workflowConfig?.emailTemplate;
        const emailSubject = nodeConfig?.emailSubject || 'Thanks for reaching out!';
        if (!emailTemplate) {
            throw new Error('No email template configured for send_email node');
        }
        const variables = {
            firstName: lead.name?.split(' ')[0] || 'there',
            companyName: lead.companyName || '',
            email: lead.email,
        };
        const htmlBody = await this.emailService.buildEmailFromTemplate(execution.workspaceId, execution.workflowId, lead.id, emailTemplate, variables);
        await this.emailService.sendWorkflowEmail(execution.workspaceId, {
            to: lead.email,
            subject: emailSubject,
            htmlBody,
        });
        await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
                lastEmailSentAt: new Date(),
                lastActivityAt: new Date(),
                status: 'EMAIL_SENT',
            },
        });
        this.logger.log(`Successfully sent email to ${lead.email}`);
    }
    async executeSendFollowup(node, lead, execution) {
        this.logger.log(`Sending follow-up email to ${lead.email}`);
        const nodeConfig = node.config;
        const workflowConfig = execution.workflow.configurationData;
        const followUpTemplate = nodeConfig?.followUpTemplate || workflowConfig?.followUpTemplate;
        const emailSubject = nodeConfig?.emailSubject || 'Following up';
        if (!followUpTemplate) {
            throw new Error('No follow-up template configured');
        }
        const variables = {
            firstName: lead.name?.split(' ')[0] || 'there',
            companyName: lead.companyName || '',
            email: lead.email,
        };
        const htmlBody = await this.emailService.buildEmailFromTemplate(execution.workspaceId, execution.workflowId, lead.id, followUpTemplate, variables);
        await this.emailService.sendWorkflowEmail(execution.workspaceId, {
            to: lead.email,
            subject: emailSubject,
            htmlBody,
        });
        await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
                lastEmailSentAt: new Date(),
                lastActivityAt: new Date(),
                status: 'FOLLOW_UP_SENT',
            },
        });
        this.logger.log(`Successfully sent follow-up email to ${lead.email}`);
    }
    async executeDelay(node, execution, step) {
        const nodeConfig = node.config;
        const workflowConfig = execution.workflow.configurationData;
        const delayDays = nodeConfig?.delayDays || workflowConfig?.followUpDelayDays || 3;
        const delayMs = delayDays * 24 * 60 * 60 * 1000;
        this.logger.log(`Delaying execution for ${delayDays} days (${delayMs}ms)`);
        await this.prisma.workflowExecution.update({
            where: { id: execution.id },
            data: { status: client_1.WorkflowExecutionStatus.paused },
        });
        await this.queueService.enqueueDelayedExecution(execution.id, step.stepNumber + 1, delayMs);
        this.logger.log(`Workflow paused, will resume in ${delayDays} days`);
    }
    async markLeadFailed(leadId) {
        await this.prisma.lead.update({
            where: { id: leadId },
            data: { status: client_1.LeadStatus.LOST },
        });
        this.logger.log(`Marked lead ${leadId} as failed`);
    }
    async createExecutionStep(executionId, nodeId) {
        const stepCount = await this.prisma.executionStep.count({
            where: { executionId },
        });
        return this.prisma.executionStep.create({
            data: {
                executionId,
                workflowNodeId: nodeId,
                stepNumber: stepCount + 1,
                status: client_1.ExecutionStepStatus.pending,
            },
        });
    }
    async updateStepStatus(stepId, status) {
        const data = { status };
        if (status === client_1.ExecutionStepStatus.running) {
            data.startedAt = new Date();
        }
        else if (status === client_1.ExecutionStepStatus.completed) {
            data.completedAt = new Date();
            const step = await this.prisma.executionStep.findUnique({
                where: { id: stepId },
            });
            if (step?.startedAt) {
                data.durationMs = Date.now() - step.startedAt.getTime();
            }
        }
        await this.prisma.executionStep.update({
            where: { id: stepId },
            data,
        });
    }
    async handleStepError(stepId, error) {
        this.logger.error(`Step execution failed: ${stepId}`, error);
        await this.prisma.executionStep.update({
            where: { id: stepId },
            data: {
                status: client_1.ExecutionStepStatus.failed,
                errorMessage: error.message,
                errorDetails: { stack: error.stack },
            },
        });
    }
    async handleExecutionError(executionId, error) {
        this.logger.error(`Workflow execution failed: ${executionId}`, error);
        await this.prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
                status: client_1.WorkflowExecutionStatus.failed,
                completedAt: new Date(),
                errorMessage: error.message,
                errorDetails: { stack: error.stack },
            },
        });
        const execution = await this.prisma.workflowExecution.findUnique({
            where: { id: executionId },
            select: { workspaceId: true },
        });
        if (execution) {
            await this.prisma.executionLog.create({
                data: {
                    executionId,
                    workspaceId: execution.workspaceId,
                    logLevel: 'ERROR',
                    message: `Execution failed: ${error.message}`,
                    details: { stack: error.stack },
                },
            });
        }
    }
    async getReachableNodes(workflowId, startNodeId) {
        const reachable = new Set();
        const queue = [startNodeId];
        const visited = new Set();
        const edges = await this.prisma.workflowEdge.findMany({
            where: {
                workflowId,
                deletedAt: null,
                isEnabled: true,
            },
        });
        const adjacency = new Map();
        for (const edge of edges) {
            if (!adjacency.has(edge.sourceNodeId)) {
                adjacency.set(edge.sourceNodeId, []);
            }
            adjacency.get(edge.sourceNodeId).push(edge.targetNodeId);
        }
        while (queue.length > 0) {
            const currentNodeId = queue.shift();
            if (visited.has(currentNodeId)) {
                continue;
            }
            visited.add(currentNodeId);
            reachable.add(currentNodeId);
            const outgoing = adjacency.get(currentNodeId) || [];
            for (const targetId of outgoing) {
                if (!visited.has(targetId)) {
                    queue.push(targetId);
                }
            }
        }
        this.logger.log(`Found ${reachable.size} reachable nodes from ${startNodeId}`);
        return reachable;
    }
    async storeBranchDecision(stepId, branchTaken, targetNodeId) {
        await this.prisma.executionStep.update({
            where: { id: stepId },
            data: {
                outputData: {
                    branchTaken,
                    targetNodeId,
                },
            },
        });
    }
};
exports.WorkflowExecutorService = WorkflowExecutorService;
exports.WorkflowExecutorService = WorkflowExecutorService = WorkflowExecutorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workflow_email_service_1.WorkflowEmailService,
        workflow_queue_service_1.WorkflowQueueService,
        condition_evaluator_service_1.ConditionEvaluatorService])
], WorkflowExecutorService);
//# sourceMappingURL=workflow-executor.service.js.map