import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowEmailService } from '../../email/workflow-email.service';
import { RelayEmailService } from '../../email-relay/services/relay-email.service';
import { WorkflowQueueService } from './workflow-queue.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import {
  WorkflowExecutionStatus,
  ExecutionStepStatus,
  WorkflowNode,
  LeadStatus,
} from '@prisma/client';

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: WorkflowEmailService,
    private relayEmailService: RelayEmailService,
    private queueService: WorkflowQueueService,
    private conditionEvaluator: ConditionEvaluatorService,
  ) {}

  /**
   * Main execution method - orchestrates the entire workflow
   */
  async execute(executionId: string, fromStep: number = 0): Promise<void> {
    this.logger.log(
      `Starting workflow execution: ${executionId} from step ${fromStep}`,
    );

    // Load execution with all relations
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
      throw new NotFoundException(`Execution not found: ${executionId}`);
    }

    if (!execution.lead) {
      throw new Error(`No lead associated with execution: ${executionId}`);
    }

    try {
      // Update to running status
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: WorkflowExecutionStatus.running,
          startedAt: execution.startedAt || new Date(),
        },
      });

      // Get nodes to execute (from fromStep onwards)
      const nodesToExecute = execution.workflow.nodes.filter(
        (node) => (node.executionOrder ?? 0) >= fromStep,
      );

      this.logger.log(
        `Executing ${nodesToExecute.length} nodes for execution ${executionId}`,
      );

      // Initialize execution context for branch tracking
      (execution as any).reachableNodeIds = null;

      // Execute each node sequentially
      for (const node of nodesToExecute) {
        // Skip nodes that are not reachable due to conditional branching
        if (
          (execution as any).reachableNodeIds &&
          !(execution as any).reachableNodeIds.has(node.reactFlowNodeId)
        ) {
          this.logger.log(
            `Skipping node ${node.nodeType} (${node.reactFlowNodeId}) - not on selected branch`,
          );
          continue;
        }

        const shouldContinue = await this.executeNode(
          execution,
          node,
          execution.lead,
        );

        // If node returns false (e.g., delay node), stop execution
        if (!shouldContinue) {
          this.logger.log(`Execution paused at node ${node.nodeType}`);
          return;
        }
      }

      // Mark execution as completed
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: WorkflowExecutionStatus.completed,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Workflow execution completed: ${executionId}`);
    } catch (error) {
      await this.handleExecutionError(executionId, error);
      throw error;
    }
  }

  /**
   * Execute a single workflow node
   * Returns: true to continue, false to pause execution
   */
  private async executeNode(
    execution: any,
    node: WorkflowNode,
    lead: any,
  ): Promise<boolean> {
    this.logger.log(
      `Executing node: ${node.nodeType} (order: ${node.executionOrder})`,
    );

    // Create execution step
    const step = await this.createExecutionStep(execution.id, node.id);

    try {
      // Update step to running
      await this.updateStepStatus(step.id, ExecutionStepStatus.running);

      // Execute based on node type
      let shouldContinue = true;

      switch (node.nodeType) {
        case 'trigger_form':
          // Already triggered, just log
          this.logger.log('Trigger node - already executed');
          break;

        case 'send_email':
          await this.executeSendEmail(node, lead, execution);
          break;

        case 'send_followup':
          await this.executeSendFollowup(node, lead, execution);
          break;

        case 'delay':
          shouldContinue = false; // Pause execution
          await this.executeDelay(node, execution, step);
          break;

        case 'condition':
          const conditionMet = await this.conditionEvaluator.evaluateCondition(
            node,
            lead,
          );
          this.logger.log(
            `Condition result for node ${node.reactFlowNodeId}: ${conditionMet}`,
          );

          // Get workflow edges for this condition node
          const edges = await this.prisma.workflowEdge.findMany({
            where: {
              workflowId: execution.workflowId,
              sourceNodeId: node.reactFlowNodeId,
              deletedAt: null,
              isEnabled: true,
            },
          });

          // Select branch based on condition result
          const selectedHandle = conditionMet ? 'true' : 'false';
          const selectedEdge = edges.find(
            (e) => e.sourceHandle === selectedHandle,
          );

          if (selectedEdge) {
            this.logger.log(
              `Following ${selectedHandle} branch to node ${selectedEdge.targetNodeId}`,
            );

            // Store branch decision in step metadata
            await this.storeBranchDecision(
              step.id,
              selectedHandle,
              selectedEdge.targetNodeId,
            );

            // Get all nodes reachable from selected branch
            const reachableNodes = await this.getReachableNodes(
              execution.workflowId,
              selectedEdge.targetNodeId,
            );

            // Store reachable nodes in execution context for filtering
            if (!(execution as any).reachableNodeIds) {
              (execution as any).reachableNodeIds = new Set<string>();
            }

            // Add all reachable nodes to the set
            reachableNodes.forEach((nodeId) =>
              (execution as any).reachableNodeIds.add(nodeId),
            );

            this.logger.log(
              `Total reachable nodes after this condition: ${(execution as any).reachableNodeIds.size}`,
            );
          } else {
            this.logger.warn(
              `No edge found for ${selectedHandle} branch on condition node ${node.reactFlowNodeId}`,
            );
          }
          break;

        case 'mark_failed':
          await this.markLeadFailed(lead.id);
          break;

        default:
          this.logger.warn(`Unknown node type: ${node.nodeType}`);
      }

      // Mark step as completed
      await this.updateStepStatus(step.id, ExecutionStepStatus.completed);

      return shouldContinue;
    } catch (error) {
      await this.handleStepError(step.id, error);
      throw error;
    }
  }

  /**
   * Execute send_email node
   */
  private async executeSendEmail(
    node: WorkflowNode,
    lead: any,
    execution: any,
  ): Promise<void> {
    this.logger.log(`Sending email to ${lead.email}`);

    // Get email template from node config or workflow config
    const nodeConfig = node.config as any;
    const workflowConfig = execution.workflow.configurationData as any;

    const emailTemplate =
      nodeConfig?.emailTemplate || workflowConfig?.emailTemplate;

    const emailSubject =
      nodeConfig?.emailSubject || 'Thanks for reaching out!';

    if (!emailTemplate) {
      throw new Error('No email template configured for send_email node');
    }

    // Prepare variables for template rendering
    const variables = {
      firstName: lead.name?.split(' ')[0] || 'there',
      companyName: lead.companyName || '',
      email: lead.email,
    };

    // Build email with template rendering
    const htmlBody = await this.emailService.buildEmailFromTemplate(
      execution.workspaceId,
      execution.workflowId,
      lead.id,
      emailTemplate,
      variables,
    );

    // Convert HTML to plain text for text body (basic conversion)
    const textBody = htmlBody
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    // Send email via Gmail Relay with Reply-To tracking
    await this.relayEmailService.sendEmailToLead(
      execution.workspaceId,
      lead.id,
      lead.email,
      lead.name || undefined,
      emailSubject,
      textBody,
      htmlBody,
      'FlowTrack',
    );

    // Update lead with email sent timestamp and status
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastEmailSentAt: new Date(),
        lastActivityAt: new Date(),
        status: 'EMAIL_SENT', // Auto-update status
      },
    });

    this.logger.log(`Successfully sent email to ${lead.email}`);
  }

  /**
   * Execute send_followup node
   */
  private async executeSendFollowup(
    node: WorkflowNode,
    lead: any,
    execution: any,
  ): Promise<void> {
    this.logger.log(`Sending follow-up email to ${lead.email}`);

    const nodeConfig = node.config as any;
    const workflowConfig = execution.workflow.configurationData as any;

    const followUpTemplate =
      nodeConfig?.followUpTemplate || workflowConfig?.followUpTemplate;

    const emailSubject = nodeConfig?.emailSubject || 'Following up';

    if (!followUpTemplate) {
      throw new Error('No follow-up template configured');
    }

    const variables = {
      firstName: lead.name?.split(' ')[0] || 'there',
      companyName: lead.companyName || '',
      email: lead.email,
    };

    const htmlBody = await this.emailService.buildEmailFromTemplate(
      execution.workspaceId,
      execution.workflowId,
      lead.id,
      followUpTemplate,
      variables,
    );

    // Convert HTML to plain text for text body (basic conversion)
    const textBody = htmlBody
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    // Send email via Gmail Relay with Reply-To tracking
    await this.relayEmailService.sendEmailToLead(
      execution.workspaceId,
      lead.id,
      lead.email,
      lead.name || undefined,
      emailSubject,
      textBody,
      htmlBody,
      'FlowTrack',
    );

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastEmailSentAt: new Date(),
        lastActivityAt: new Date(),
        status: 'FOLLOW_UP_SENT', // Auto-update status
      },
    });

    this.logger.log(`Successfully sent follow-up email to ${lead.email}`);
  }

  /**
   * Execute delay node - pauses workflow and schedules resume
   */
  private async executeDelay(
    node: WorkflowNode,
    execution: any,
    step: any,
  ): Promise<void> {
    const nodeConfig = node.config as any;
    const workflowConfig = execution.workflow.configurationData as any;

    const delayDays =
      nodeConfig?.delayDays || workflowConfig?.followUpDelayDays || 3;

    const delayMs = delayDays * 24 * 60 * 60 * 1000;

    this.logger.log(
      `Delaying execution for ${delayDays} days (${delayMs}ms)`,
    );

    // Pause workflow execution
    await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: WorkflowExecutionStatus.paused },
    });

    // Queue delayed continuation from next step
    await this.queueService.enqueueDelayedExecution(
      execution.id,
      step.stepNumber + 1,
      delayMs,
    );

    this.logger.log(`Workflow paused, will resume in ${delayDays} days`);
  }

  /**
   * Mark lead as failed
   */
  private async markLeadFailed(leadId: string): Promise<void> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.LOST },
    });

    this.logger.log(`Marked lead ${leadId} as failed`);
  }

  /**
   * Create execution step record
   */
  private async createExecutionStep(executionId: string, nodeId: string) {
    const stepCount = await this.prisma.executionStep.count({
      where: { executionId },
    });

    return this.prisma.executionStep.create({
      data: {
        executionId,
        workflowNodeId: nodeId,
        stepNumber: stepCount + 1,
        status: ExecutionStepStatus.pending,
      },
    });
  }

  /**
   * Update execution step status
   */
  private async updateStepStatus(
    stepId: string,
    status: ExecutionStepStatus,
  ) {
    const data: any = { status };

    if (status === ExecutionStepStatus.running) {
      data.startedAt = new Date();
    } else if (status === ExecutionStepStatus.completed) {
      data.completedAt = new Date();
      // Calculate duration
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

  /**
   * Handle step execution error
   */
  private async handleStepError(stepId: string, error: any) {
    this.logger.error(`Step execution failed: ${stepId}`, error);

    await this.prisma.executionStep.update({
      where: { id: stepId },
      data: {
        status: ExecutionStepStatus.failed,
        errorMessage: error.message,
        errorDetails: { stack: error.stack } as any,
      },
    });
  }

  /**
   * Handle workflow execution error
   */
  private async handleExecutionError(executionId: string, error: any) {
    this.logger.error(`Workflow execution failed: ${executionId}`, error);

    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: WorkflowExecutionStatus.failed,
        completedAt: new Date(),
        errorMessage: error.message,
        errorDetails: { stack: error.stack } as any,
      },
    });

    // Get execution for workspaceId
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
      select: { workspaceId: true },
    });

    // Create execution log
    if (execution) {
      await this.prisma.executionLog.create({
        data: {
          executionId,
          workspaceId: execution.workspaceId,
          logLevel: 'ERROR',
          message: `Execution failed: ${error.message}`,
          details: { stack: error.stack } as any,
        },
      });
    }
  }

  /**
   * Get all nodes reachable from a given node by traversing workflow edges
   * Uses BFS to find all downstream nodes
   */
  private async getReachableNodes(
    workflowId: string,
    startNodeId: string,
  ): Promise<Set<string>> {
    const reachable = new Set<string>();
    const queue: string[] = [startNodeId];
    const visited = new Set<string>();

    // Get all edges for this workflow
    const edges = await this.prisma.workflowEdge.findMany({
      where: {
        workflowId,
        deletedAt: null,
        isEnabled: true,
      },
    });

    // Build adjacency map: sourceNodeId -> targetNodeId[]
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.sourceNodeId)) {
        adjacency.set(edge.sourceNodeId, []);
      }
      adjacency.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    }

    // BFS traversal
    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;

      if (visited.has(currentNodeId)) {
        continue;
      }

      visited.add(currentNodeId);
      reachable.add(currentNodeId);

      // Add all outgoing nodes to queue
      const outgoing = adjacency.get(currentNodeId) || [];
      for (const targetId of outgoing) {
        if (!visited.has(targetId)) {
          queue.push(targetId);
        }
      }
    }

    this.logger.log(
      `Found ${reachable.size} reachable nodes from ${startNodeId}`,
    );

    return reachable;
  }

  /**
   * Store metadata about branch selection in execution step
   */
  private async storeBranchDecision(
    stepId: string,
    branchTaken: 'true' | 'false',
    targetNodeId: string,
  ): Promise<void> {
    await this.prisma.executionStep.update({
      where: { id: stepId },
      data: {
        outputData: {
          branchTaken,
          targetNodeId,
        } as any,
      },
    });
  }
}
