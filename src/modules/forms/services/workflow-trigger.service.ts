import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  WorkflowExecutionStatus,
  ExecutionStepStatus,
  LogLevel,
} from '@prisma/client';
import { WorkflowQueueService } from '../../workflows/services/workflow-queue.service';

@Injectable()
export class WorkflowTriggerService {
  private readonly logger = new Logger(WorkflowTriggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowQueueService: WorkflowQueueService,
  ) {}

  /**
   * Trigger workflow execution when form is submitted
   * Creates a WorkflowExecution record and queues it for processing
   */
  async triggerFormWorkflow(
    leadId: string,
    workflowId: string,
    triggerData: Record<string, any>,
  ): Promise<string> {
    try {
      // Get workflow and find trigger node
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          nodes: {
            where: {
              nodeCategory: 'trigger',
              nodeType: 'trigger_form', // Form submission trigger
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
        this.logger.warn(
          `No trigger node found for workflow ${workflowId}. Workflow may not execute.`,
        );
      }

      const triggerNode = workflow.nodes[0];

      // Create workflow execution
      const execution = await this.prisma.workflowExecution.create({
        data: {
          workflowId,
          workspaceId: workflow.workspaceId,
          leadId,
          triggerType: 'form_submission',
          triggerNodeId: triggerNode?.id,
          triggerData,
          status: WorkflowExecutionStatus.queued,
          startedAt: new Date(),
        },
      });

      // Create execution log
      await this.prisma.executionLog.create({
        data: {
          executionId: execution.id,
          workspaceId: workflow.workspaceId,
          logLevel: LogLevel.INFO,
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

      // Update workflow stats
      await this.prisma.workflow.update({
        where: { id: workflowId },
        data: {
          totalExecutions: { increment: 1 },
          lastExecutedAt: new Date(),
        },
      });

      this.logger.log(
        `Workflow execution created: ${execution.id} for lead ${leadId}`,
      );

      // Queue execution for async processing via BullMQ
      await this.workflowQueueService.enqueueExecution(execution.id);

      this.logger.log(
        `Workflow execution queued successfully: ${execution.id}`,
      );

      return execution.id;
    } catch (error) {
      this.logger.error(
        `Failed to trigger workflow ${workflowId} for lead ${leadId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Execute workflow synchronously (for simulation/testing)
   * This is a simplified version - actual execution would be more complex
   */
  async executeWorkflowSync(executionId: string): Promise<void> {
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
      // Update status to running
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: WorkflowExecutionStatus.running,
        },
      });

      // Log start
      await this.prisma.executionLog.create({
        data: {
          executionId,
          workspaceId: execution.workspaceId,
          logLevel: LogLevel.INFO,
          logCategory: 'execution',
          message: 'Workflow execution started',
          details: {
            workflowId: execution.workflowId,
            leadId: execution.leadId,
          },
        },
      });

      // TODO: Implement actual workflow execution logic
      // This would involve:
      // 1. Traversing workflow nodes in order
      // 2. Evaluating conditions
      // 3. Executing actions (send email, create tasks, etc.)
      // 4. Handling delays and waits
      // 5. Creating ExecutionStep records for each node

      // For now, just mark as completed
      const endTime = new Date();
      const durationMs = execution.startedAt
        ? endTime.getTime() - execution.startedAt.getTime()
        : 0;

      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: WorkflowExecutionStatus.completed,
          completedAt: endTime,
          durationMs,
        },
      });

      // Update workflow success count
      await this.prisma.workflow.update({
        where: { id: execution.workflowId },
        data: {
          successfulExecutions: { increment: 1 },
        },
      });

      this.logger.log(`Workflow execution completed: ${executionId}`);
    } catch (error) {
      // Mark as failed
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: WorkflowExecutionStatus.failed,
          errorMessage: error.message,
          errorDetails: {
            stack: error.stack,
            name: error.name,
          },
        },
      });

      // Update workflow failed count
      await this.prisma.workflow.update({
        where: { id: execution.workflowId },
        data: {
          failedExecutions: { increment: 1 },
        },
      });

      // Log error
      await this.prisma.executionLog.create({
        data: {
          executionId,
          workspaceId: execution.workspaceId,
          logLevel: LogLevel.ERROR,
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

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string) {
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
}
