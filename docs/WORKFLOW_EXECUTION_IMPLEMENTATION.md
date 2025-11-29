# FlowTrack Workflow Execution System - Complete Implementation Guide

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Architecture Overview](#architecture-overview)
4. [Implementation Guide](#implementation-guide)
5. [Code Examples](#code-examples)
6. [Database Schema Deep-Dive](#database-schema-deep-dive)
7. [Testing & Validation](#testing--validation)
8. [Monitoring & Debugging](#monitoring--debugging)
9. [Performance Optimization](#performance-optimization)
10. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### Problem Statement
FlowTrack creates leads when forms are submitted and queues workflow executions, but **no worker processes these executions**. This means:
- ❌ Emails are never sent automatically
- ❌ Follow-ups don't happen
- ❌ Lead qualification logic doesn't run
- ❌ WorkflowExecution records stay in 'queued' status forever

### Solution
Implement a complete workflow execution system using BullMQ workers that:
- ✅ Automatically processes queued workflow executions
- ✅ Sends initial and follow-up emails
- ✅ Handles delays between workflow steps
- ✅ Evaluates conditions (budget qualification, reply tracking, booking status)
- ✅ Updates lead status based on workflow outcomes
- ✅ Provides full execution tracking and logging

### Impact
- **User Experience**: Leads receive automated emails immediately after form submission
- **Sales Team**: Qualified leads are automatically nurtured and booked
- **System Reliability**: Failed executions are retried automatically
- **Visibility**: Complete execution history in database for analytics

---

## Current System Analysis

### What's Already Implemented

#### 1. Form Submission Flow ✅
**File**: `backend/src/modules/forms/controllers/public-form.controller.ts`

```typescript
// Lines 78-98
this.workflowTriggerService
  .triggerFormWorkflow(result.leadId, formSchema.workflowId, {
    submissionData: submission.fields,
    tracking: submission.tracking,
    metadata: { ipAddress, userAgent, origin },
  })
  .catch((error) => {
    console.error('Failed to trigger workflow:', error);
  });
```

**Status**: Fully functional
- Creates/updates Lead in database
- Stores lead field data (EAV pattern)
- Calls WorkflowTriggerService asynchronously

#### 2. Workflow Trigger Service ⚠️ (Partial)
**File**: `backend/src/modules/forms/services/workflow-trigger.service.ts`

**What Works**:
```typescript
// Creates WorkflowExecution record
const execution = await this.prisma.workflowExecution.create({
  data: {
    id: executionId,
    workflowId,
    workspaceId: workflow.workspaceId,
    leadId,
    triggerType: 'form_submission',
    triggerNodeId: triggerNode?.id,
    triggerData: triggerData as any,
    status: WorkflowExecutionStatus.queued, // ← Stays here forever!
  },
});
```

**What's Missing**:
```typescript
// Lines 97-99 - Critical TODO
// TODO: Queue execution for async processing
// This would typically be done via a message queue (Bull, RabbitMQ, etc.)
// For now, we just create the execution record
```

#### 3. Email Service ✅
**File**: `backend/src/modules/email/workflow-email.service.ts`

**Capabilities**:
- Gmail API integration (OAuth-based sending)
- SMTP fallback (when Gmail not connected)
- Template rendering with variable substitution
- Calendly/Google Meet link insertion
- Attribution tracking

**Example**:
```typescript
await this.emailService.sendWorkflowEmail(workspaceId, {
  to: 'lead@example.com',
  subject: 'Thanks for your interest!',
  htmlBody: renderedTemplate,
});
```

**Status**: Fully functional and ready to use

#### 4. BullMQ Infrastructure ✅
**File**: `backend/src/app.module.ts`

```typescript
BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get('REDIS_PORT', 6379),
      password: config.get('REDIS_PASSWORD'),
    },
  }),
}),
```

**Status**: Configured and ready
- Redis connection established
- BullMQ module imported globally
- Example queue working (booking-polling)

#### 5. Database Schema ✅
**File**: `backend/prisma/schema.prisma`

**WorkflowExecution Table** (Lines 739-779):
```prisma
model WorkflowExecution {
  id              String                  @id
  workflowId      String
  workspaceId     String
  leadId          String?
  triggerType     String                  // 'form_submission'
  triggerNodeId   String?
  triggerData     Json?
  status          WorkflowExecutionStatus // queued/running/completed/failed
  startedAt       DateTime?
  completedAt     DateTime?
  durationMs      Int?
  errorMessage    String?
  errorDetails    Json?
  retryCount      Int                     @default(0)
  maxRetries      Int                     @default(3)
  outputData      Json?

  workflow        Workflow                @relation(fields: [workflowId])
  lead            Lead?                   @relation(fields: [leadId])
  executionSteps  ExecutionStep[]
  executionLogs   ExecutionLog[]
}
```

**Status**: Complete and ready for use

### What's Missing

#### 1. Workflow Execution Queue Service ❌
**Purpose**: Enqueue workflow executions to BullMQ
**Location**: `backend/src/modules/workflows/services/workflow-queue.service.ts`

**Required Methods**:
```typescript
async enqueueExecution(executionId: string): Promise<void>
async enqueueDelayedExecution(executionId: string, fromStep: number, delayMs: number): Promise<void>
```

#### 2. Workflow Executor Service ❌
**Purpose**: Core execution engine that processes workflows
**Location**: `backend/src/modules/workflows/services/workflow-executor.service.ts`

**Required Methods**:
```typescript
async execute(executionId: string): Promise<void>
async executeNode(execution, node, lead): Promise<void>
async executeSendEmail(node, lead, execution): Promise<void>
async executeSendFollowup(node, lead, execution): Promise<void>
async executeDelay(node, execution, step): Promise<void>
async evaluateCondition(node, lead): Promise<boolean>
async markLeadFailed(leadId: string): Promise<void>
```

#### 3. Workflow Execution Processor ❌
**Purpose**: BullMQ worker that picks up queued executions
**Location**: `backend/src/modules/workflows/processors/workflow-execution.processor.ts`

**Required**:
```typescript
@Processor('workflow-execution')
export class WorkflowExecutionProcessor extends WorkerHost {
  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'execute-workflow':
        await this.executorService.execute(job.data.executionId);
        break;
      case 'execute-delayed-step':
        await this.executorService.resumeFromStep(job.data.executionId, job.data.stepNumber);
        break;
    }
  }
}
```

#### 4. Condition Evaluator Service ❌
**Purpose**: Evaluate workflow conditions (budget, reply, booking)
**Location**: `backend/src/modules/workflows/services/condition-evaluator.service.ts`

**Required Methods**:
```typescript
async evaluateCondition(node: WorkflowNode, lead: Lead): Promise<boolean>
async checkBudgetQualification(node, lead): Promise<boolean>
async checkReplyReceived(lead): Promise<boolean>
async checkBookingCompleted(lead): Promise<boolean>
```

#### 5. Workflows Module ❌
**Purpose**: Wire all services together
**Location**: `backend/src/modules/workflows/workflows.module.ts`

**Required**:
- Import EmailModule, PrismaModule
- Register BullMQ queue: 'workflow-execution'
- Provide all services
- Export WorkflowQueueService for use by WorkflowTriggerService

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        FlowTrack Backend                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Public Form     │
│  Submission      │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  FormSubmissionService                                       │
│  - Create/Update Lead                                        │
│  - Store field data                                          │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  WorkflowTriggerService                                      │
│  - Create WorkflowExecution (status: 'queued')               │
│  - Create ExecutionLog                                       │
│  - 🆕 Call WorkflowQueueService.enqueueExecution()           │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  WorkflowQueueService  🆕                                    │
│  - Add job to BullMQ queue                                   │
│  - Configure retry logic                                     │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  BullMQ Queue: 'workflow-execution'                          │
│  - Redis-backed job queue                                    │
│  - Supports delayed jobs                                     │
│  - Automatic retries                                         │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  WorkflowExecutionProcessor  🆕                              │
│  - Pick up jobs from queue                                   │
│  - Call WorkflowExecutorService                              │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  WorkflowExecutorService  🆕                                 │
│  - Load workflow nodes (in executionOrder)                   │
│  - Execute each node sequentially                            │
│  - Create ExecutionStep records                              │
│  - Update WorkflowExecution status                           │
└────────┬─────────────────────────────────────────────────────┘
         │
         ├──────────► Send Email Node
         │            └─► EmailService.sendWorkflowEmail()
         │
         ├──────────► Delay Node
         │            └─► WorkflowQueueService.enqueueDelayedExecution()
         │
         ├──────────► Condition Node
         │            └─► ConditionEvaluatorService.evaluateCondition()
         │
         └──────────► Mark Failed Node
                      └─► Update lead.status = 'failed'
```

### Data Flow Diagram

```
1. Form Submit
   └─► Lead Created in DB

2. Workflow Trigger
   └─► WorkflowExecution { status: 'queued' } created
   └─► Job added to Redis queue

3. Worker Picks Up Job (immediately)
   └─► WorkflowExecution { status: 'running' } updated

4. Execute Workflow Nodes (in order):
   ├─► Step 1: trigger_form (skip, already triggered)
   ├─► Step 2: condition (check budget qualification)
   │   └─► If qualified, continue
   │   └─► If not qualified, skip to mark_failed
   ├─► Step 3: send_email
   │   └─► Call EmailService
   │   └─► Update lead.lastEmailSentAt
   │   └─► Create ExecutionStep { status: 'completed' }
   ├─► Step 4: delay (wait 3 days)
   │   └─► WorkflowExecution { status: 'paused' }
   │   └─► Queue delayed job (delay: 3 days)
   │   └─► STOP EXECUTION

[3 days later]

5. Delayed Job Executes
   └─► WorkflowExecution { status: 'running' }
   └─► Resume from step 5

6. Continue Execution:
   ├─► Step 5: condition (did they reply?)
   │   └─► Check lead.lastEmailOpenedAt
   ├─► Step 6: send_followup (if no reply)
   │   └─► Call EmailService
   │   └─► Update lead.lastEmailSentAt
   ├─► Step 7: delay (wait for booking)
   ├─► Step 8: condition (did they book?)
   │   └─► Check Booking table
   └─► Step 9: mark_failed (if no booking)
       └─► Update lead.status = 'failed'

7. Workflow Complete
   └─► WorkflowExecution { status: 'completed', completedAt: now }
```

### Node Types and Handlers

```
┌─────────────────────┬──────────────────────────────────────────┐
│ Node Type           │ Handler Action                           │
├─────────────────────┼──────────────────────────────────────────┤
│ trigger_form        │ Skip (already triggered)                 │
├─────────────────────┼──────────────────────────────────────────┤
│ send_email          │ 1. Load email template from config       │
│                     │ 2. Render with lead variables            │
│                     │ 3. Call EmailService.sendWorkflowEmail() │
│                     │ 4. Update lead.lastEmailSentAt           │
├─────────────────────┼──────────────────────────────────────────┤
│ send_followup       │ Same as send_email but uses followUp     │
│                     │ template from config                     │
├─────────────────────┼──────────────────────────────────────────┤
│ delay               │ 1. Get delay duration from config        │
│                     │ 2. Pause WorkflowExecution               │
│                     │ 3. Queue delayed job (BullMQ)            │
│                     │ 4. STOP current execution                │
├─────────────────────┼──────────────────────────────────────────┤
│ condition           │ 1. Check condition type from config      │
│                     │ 2. Call ConditionEvaluatorService        │
│                     │ 3. Return true/false                     │
│                     │ 4. Branch logic (future enhancement)     │
├─────────────────────┼──────────────────────────────────────────┤
│ mark_failed         │ Update lead.status = 'failed'            │
└─────────────────────┴──────────────────────────────────────────┘
```

---

## Implementation Guide

### Step 1: Create Workflows Module

**File**: `backend/src/modules/workflows/workflows.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

// Services
import { WorkflowQueueService } from './services/workflow-queue.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';

// Processors
import { WorkflowExecutionProcessor } from './processors/workflow-execution.processor';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    BullModule.registerQueue({
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
  providers: [
    WorkflowQueueService,
    WorkflowExecutorService,
    ConditionEvaluatorService,
    WorkflowExecutionProcessor,
  ],
  exports: [
    WorkflowQueueService, // Export for use in WorkflowTriggerService
  ],
})
export class WorkflowsModule {}
```

### Step 2: Implement WorkflowQueueService

**File**: `backend/src/modules/workflows/services/workflow-queue.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class WorkflowQueueService {
  private readonly logger = new Logger(WorkflowQueueService.name);

  constructor(
    @InjectQueue('workflow-execution')
    private workflowQueue: Queue,
  ) {}

  /**
   * Enqueue a workflow execution for immediate processing
   */
  async enqueueExecution(executionId: string): Promise<void> {
    this.logger.log(`Enqueueing workflow execution: ${executionId}`);

    await this.workflowQueue.add(
      'execute-workflow',
      { executionId },
      {
        jobId: `execution-${executionId}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Successfully enqueued execution: ${executionId}`);
  }

  /**
   * Enqueue a delayed workflow execution (for resume after delay)
   */
  async enqueueDelayedExecution(
    executionId: string,
    fromStep: number,
    delayMs: number,
  ): Promise<void> {
    this.logger.log(
      `Enqueueing delayed execution: ${executionId} (delay: ${delayMs}ms, from step: ${fromStep})`,
    );

    await this.workflowQueue.add(
      'execute-delayed-step',
      { executionId, fromStep },
      {
        delay: delayMs,
        jobId: `delayed-${executionId}-${fromStep}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Successfully enqueued delayed execution: ${executionId}`,
    );
  }

  /**
   * Get queue metrics for monitoring
   */
  async getQueueMetrics() {
    const waiting = await this.workflowQueue.getWaitingCount();
    const active = await this.workflowQueue.getActiveCount();
    const delayed = await this.workflowQueue.getDelayedCount();
    const failed = await this.workflowQueue.getFailedCount();

    return { waiting, active, delayed, failed };
  }
}
```

### Step 3: Implement ConditionEvaluatorService

**File**: `backend/src/modules/workflows/services/condition-evaluator.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowNode, Lead } from '@prisma/client';

@Injectable()
export class ConditionEvaluatorService {
  private readonly logger = new Logger(ConditionEvaluatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Evaluate a condition node
   */
  async evaluateCondition(node: WorkflowNode, lead: any): Promise<boolean> {
    const conditionType = node.config?.['conditionType'];

    this.logger.log(
      `Evaluating condition: ${conditionType} for lead ${lead.id}`,
    );

    switch (conditionType) {
      case 'budget_qualification':
        return this.checkBudgetQualification(node, lead);

      case 'reply_received':
        return this.checkReplyReceived(lead);

      case 'booking_completed':
        return this.checkBookingCompleted(lead);

      default:
        this.logger.warn(`Unknown condition type: ${conditionType}`);
        return true; // Default to passing unknown conditions
    }
  }

  /**
   * Check if lead's budget meets qualification threshold
   */
  private async checkBudgetQualification(
    node: WorkflowNode,
    lead: any,
  ): Promise<boolean> {
    const threshold = node.config?.['budgetThreshold'] || 2000;

    // Find budget field in lead's field data
    const budgetField = lead.fieldData?.find(
      (field: any) => field.formField?.fieldKey === 'budget',
    );

    if (!budgetField) {
      this.logger.log(`No budget field found for lead ${lead.id}, passing by default`);
      return true;
    }

    const budget = parseInt(budgetField.value);
    const qualified = budget >= threshold;

    this.logger.log(
      `Budget qualification: ${budget} >= ${threshold} = ${qualified}`,
    );

    return qualified;
  }

  /**
   * Check if lead has replied to email
   */
  private async checkReplyReceived(lead: any): Promise<boolean> {
    const replied = lead.lastEmailOpenedAt != null;

    this.logger.log(`Reply check for lead ${lead.id}: ${replied}`);

    return replied;
  }

  /**
   * Check if lead has completed a booking
   */
  private async checkBookingCompleted(lead: any): Promise<boolean> {
    const bookingCount = await this.prisma.booking.count({
      where: { leadId: lead.id },
    });

    const hasBooking = bookingCount > 0;

    this.logger.log(
      `Booking check for lead ${lead.id}: ${hasBooking} (count: ${bookingCount})`,
    );

    return hasBooking;
  }
}
```

### Step 4: Implement WorkflowExecutorService (Core Engine)

**File**: `backend/src/modules/workflows/services/workflow-executor.service.ts`

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowEmailService } from '../../email/workflow-email.service';
import { WorkflowQueueService } from './workflow-queue.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import {
  WorkflowExecutionStatus,
  ExecutionStepStatus,
  WorkflowNode,
} from '@prisma/client';

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: WorkflowEmailService,
    private queueService: WorkflowQueueService,
    private conditionEvaluator: ConditionEvaluatorService,
  ) {}

  /**
   * Main execution method - orchestrates the entire workflow
   */
  async execute(executionId: string, fromStep: number = 0): Promise<void> {
    this.logger.log(`Starting workflow execution: ${executionId} from step ${fromStep}`);

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
        (node) => node.executionOrder >= fromStep,
      );

      this.logger.log(
        `Executing ${nodesToExecute.length} nodes for execution ${executionId}`,
      );

      // Execute each node sequentially
      for (const node of nodesToExecute) {
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
          this.logger.log(`Condition result: ${conditionMet}`);
          // TODO: Handle conditional branching
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
    const emailTemplate =
      node.config?.['emailTemplate'] ||
      execution.workflow.configurationData?.['emailTemplate'];

    const emailSubject =
      node.config?.['emailSubject'] || 'Thanks for reaching out!';

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

    // Send email
    await this.emailService.sendWorkflowEmail(execution.workspaceId, {
      to: lead.email,
      subject: emailSubject,
      htmlBody,
    });

    // Update lead
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastEmailSentAt: new Date(),
        lastActivityAt: new Date(),
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

    const followUpTemplate =
      node.config?.['followUpTemplate'] ||
      execution.workflow.configurationData?.['followUpTemplate'];

    const emailSubject = node.config?.['emailSubject'] || 'Following up';

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
    const delayDays =
      node.config?.['delayDays'] ||
      execution.workflow.configurationData?.['followUpDelayDays'] ||
      3;

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
      data: { status: 'failed' },
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
        errorDetails: { stack: error.stack },
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
        errorDetails: { stack: error.stack },
      },
    });

    // Create execution log
    await this.prisma.executionLog.create({
      data: {
        executionId,
        level: 'error',
        message: `Execution failed: ${error.message}`,
        metadata: { stack: error.stack },
      },
    });
  }
}
```

### Step 5: Implement WorkflowExecutionProcessor

**File**: `backend/src/modules/workflows/processors/workflow-execution.processor.ts`

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkflowExecutorService } from '../services/workflow-executor.service';

@Processor('workflow-execution', {
  concurrency: 5, // Process up to 5 workflows concurrently
})
export class WorkflowExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowExecutionProcessor.name);

  constructor(private workflowExecutor: WorkflowExecutorService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
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
    } catch (error) {
      this.logger.error(`Job failed: ${job.name}`, error);
      throw error; // BullMQ will retry based on job config
    }
  }

  /**
   * Handle immediate workflow execution
   */
  private async executeWorkflow(job: Job) {
    const { executionId } = job.data;
    this.logger.log(`Executing workflow: ${executionId}`);

    await this.workflowExecutor.execute(executionId);

    this.logger.log(`Workflow execution completed: ${executionId}`);
  }

  /**
   * Handle delayed step execution (resume after delay)
   */
  private async executeDelayedStep(job: Job) {
    const { executionId, fromStep } = job.data;
    this.logger.log(
      `Resuming workflow ${executionId} from step ${fromStep}`,
    );

    await this.workflowExecutor.execute(executionId, fromStep);

    this.logger.log(`Delayed workflow execution completed: ${executionId}`);
  }
}
```

### Step 6: Update WorkflowTriggerService

**File**: `backend/src/modules/forms/services/workflow-trigger.service.ts`

Add to imports:
```typescript
import { WorkflowQueueService } from '../../workflows/services/workflow-queue.service';
```

Add to constructor:
```typescript
constructor(
  private prisma: PrismaService,
  private workflowQueueService: WorkflowQueueService, // Add this
) {}
```

Update the `triggerFormWorkflow` method (around line 97):
```typescript
// REMOVE the TODO comment and mock executor call

// ADD this instead:
// Queue execution for async processing
await this.workflowQueueService.enqueueExecution(execution.id);

this.logger.log(
  `Workflow execution queued successfully: ${execution.id}`,
);
```

### Step 7: Register WorkflowsModule in AppModule

**File**: `backend/src/app.module.ts`

Add to imports array:
```typescript
import { WorkflowsModule } from './modules/workflows/workflows.module';
```

Add to the `imports` array in `@Module`:
```typescript
@Module({
  imports: [
    // ... existing imports ...
    WorkflowsModule, // Add this
  ],
  // ...
})
```

---

## Database Schema Deep-Dive

### WorkflowExecution Lifecycle

```
Status Flow:
  queued → running → completed
                  ↘ failed
                  ↘ paused → running (after delay)
```

**Fields Explained**:
- `triggerType`: How workflow started ('form_submission', 'manual', 'api')
- `triggerNodeId`: Which WorkflowNode started the execution
- `triggerData`: Form submission data, stored as JSON
- `status`: Current execution state
- `startedAt`: When execution began
- `completedAt`: When execution finished (success or failure)
- `durationMs`: Total execution time in milliseconds
- `errorMessage`: Human-readable error (if failed)
- `errorDetails`: Full error stack trace (if failed)
- `retryCount`: Number of retry attempts
- `maxRetries`: Maximum retries before giving up
- `outputData`: Final execution results (JSON)

### ExecutionStep Tracking

Each workflow node execution creates an `ExecutionStep`:

```typescript
{
  id: 'step_abc123',
  executionId: 'exec_xyz789',
  workflowNodeId: 'node_123',
  stepNumber: 3,
  status: 'completed',
  startedAt: '2024-01-15T10:30:00Z',
  completedAt: '2024-01-15T10:30:02Z',
  durationMs: 2000,
  inputData: { leadEmail: 'user@example.com' },
  outputData: { emailSent: true, messageId: 'msg_456' },
  errorMessage: null,
  errorDetails: null,
  retryCount: 0,
}
```

**Use Cases**:
- Debug which step failed
- Measure performance of each step
- Replay execution from specific step
- Audit trail for compliance

### ExecutionLog

Detailed logs for debugging:

```typescript
{
  id: 'log_abc123',
  executionId: 'exec_xyz789',
  level: 'info', // info/warn/error/debug
  message: 'Sent email to user@example.com',
  metadata: { emailProvider: 'gmail', messageId: 'msg_456' },
  timestamp: '2024-01-15T10:30:02Z',
}
```

**Query Examples**:
```typescript
// Get all logs for an execution
const logs = await prisma.executionLog.findMany({
  where: { executionId: 'exec_xyz789' },
  orderBy: { timestamp: 'asc' },
});

// Get error logs only
const errors = await prisma.executionLog.findMany({
  where: {
    executionId: 'exec_xyz789',
    level: 'error',
  },
});
```

---

## Testing & Validation

### Manual Testing Procedure

#### 1. Setup Test Environment

```bash
# Ensure Redis is running
redis-cli ping # Should return PONG

# Check database connection
npx prisma db pull

# Start backend
npm run start:dev
```

#### 2. Submit Test Form

```bash
# Submit via curl
curl -X POST http://localhost:3000/api/v1/forms/public/test-workspace/submit \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "name": "Test User",
      "email": "test@example.com",
      "companyName": "Test Corp",
      "budget": "5000"
    },
    "tracking": {
      "utmSource": "test",
      "utmCampaign": "manual-test"
    }
  }'
```

#### 3. Verify Database Records

```sql
-- Check WorkflowExecution created
SELECT id, status, startedAt, completedAt
FROM "WorkflowExecution"
ORDER BY createdAt DESC
LIMIT 1;

-- Check ExecutionSteps
SELECT stepNumber, status, startedAt, completedAt, durationMs
FROM "ExecutionStep"
WHERE executionId = 'YOUR_EXECUTION_ID'
ORDER BY stepNumber;

-- Check ExecutionLogs
SELECT level, message, timestamp
FROM "ExecutionLog"
WHERE executionId = 'YOUR_EXECUTION_ID'
ORDER BY timestamp;

-- Check Lead updated
SELECT id, email, lastEmailSentAt, status
FROM "Lead"
WHERE email = 'test@example.com';
```

#### 4. Verify Email Sent

Check the email inbox for `test@example.com`. You should receive:
- Subject: "Thanks for reaching out!" (or configured subject)
- Body: Rendered template with variables replaced
- Booking link included (if configured)

#### 5. Monitor BullMQ Queue

```typescript
// Add this endpoint to your API for monitoring
@Get('workflows/queue-status')
async getQueueStatus() {
  const metrics = await this.workflowQueueService.getQueueMetrics();
  return metrics;
}
```

Expected response:
```json
{
  "waiting": 0,
  "active": 1,
  "delayed": 0,
  "failed": 0
}
```

#### 6. Test Delayed Execution

For testing delays without waiting days, temporarily modify delay configuration:

```typescript
// In WorkflowExecutorService.executeDelay()
const delayMs = 30000; // 30 seconds instead of 3 days
```

Submit form → Wait 30 seconds → Verify follow-up email sent

### Automated Testing

```typescript
// workflow-executor.service.spec.ts
import { Test } from '@nestjs/testing';
import { WorkflowExecutorService } from './workflow-executor.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowEmailService } from '../../email/workflow-email.service';

describe('WorkflowExecutorService', () => {
  let service: WorkflowExecutorService;
  let prisma: PrismaService;
  let emailService: WorkflowEmailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkflowExecutorService,
        {
          provide: PrismaService,
          useValue: {
            workflowExecution: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            executionStep: {
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: WorkflowEmailService,
          useValue: {
            sendWorkflowEmail: jest.fn(),
            buildEmailFromTemplate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WorkflowExecutorService);
    prisma = module.get(PrismaService);
    emailService = module.get(WorkflowEmailService);
  });

  it('should execute send_email node', async () => {
    // Mock data
    const execution = {
      id: 'exec_123',
      workspaceId: 'ws_123',
      workflowId: 'wf_123',
      lead: {
        id: 'lead_123',
        email: 'test@example.com',
        name: 'Test User',
      },
    };

    const node = {
      id: 'node_123',
      nodeType: 'send_email',
      config: {
        emailSubject: 'Hello!',
        emailTemplate: '<p>Hi {firstName}!</p>',
      },
    };

    // Execute
    await service['executeSendEmail'](node, execution.lead, execution);

    // Verify email service called
    expect(emailService.sendWorkflowEmail).toHaveBeenCalledWith(
      'ws_123',
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Hello!',
      }),
    );
  });
});
```

---

## Monitoring & Debugging

### Logging Best Practices

All services use NestJS Logger with consistent formatting:

```typescript
this.logger.log(`Action completed: ${details}`); // Info
this.logger.warn(`Unexpected condition: ${details}`); // Warning
this.logger.error(`Operation failed: ${details}`, error); // Error
this.logger.debug(`Debug info: ${details}`); // Debug (dev only)
```

### Execution Monitoring Dashboard (Future)

Create an endpoint to view execution status:

```typescript
@Get('workflows/executions/:executionId')
async getExecutionStatus(@Param('executionId') executionId: string) {
  const execution = await this.prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      executionSteps: {
        orderBy: { stepNumber: 'asc' },
        include: { workflowNode: true },
      },
      executionLogs: {
        orderBy: { timestamp: 'asc' },
      },
      lead: true,
    },
  });

  return {
    id: execution.id,
    status: execution.status,
    progress: {
      totalSteps: execution.executionSteps.length,
      completedSteps: execution.executionSteps.filter(
        (s) => s.status === 'completed',
      ).length,
    },
    steps: execution.executionSteps.map((step) => ({
      stepNumber: step.stepNumber,
      nodeType: step.workflowNode.nodeType,
      status: step.status,
      duration: step.durationMs,
      error: step.errorMessage,
    })),
    logs: execution.executionLogs,
    lead: {
      email: execution.lead.email,
      status: execution.lead.status,
    },
  };
}
```

### Common Issues & Solutions

#### Issue: Execution stuck in 'queued' status
**Cause**: BullMQ processor not running or Redis connection failed
**Solution**:
```bash
# Check Redis
redis-cli ping

# Check BullMQ logs
# Look for WorkflowExecutionProcessor in application logs
```

#### Issue: Email not sent (ExecutionStep shows 'completed' but no email received)
**Cause**: Email service credentials not configured
**Solution**:
```sql
-- Check workspace has email credentials
SELECT id, name, gmailEmail, smtpHost
FROM "Workspace"
WHERE id = 'YOUR_WORKSPACE_ID';
```

#### Issue: Workflow fails at condition node
**Cause**: Lead missing required field data
**Solution**:
```sql
-- Verify lead has field data
SELECT lfd.value, ff.fieldKey
FROM "LeadFieldData" lfd
JOIN "FormField" ff ON lfd.formFieldId = ff.id
WHERE lfd.leadId = 'YOUR_LEAD_ID';
```

#### Issue: Delayed execution never resumes
**Cause**: Delayed job not created or Redis lost delayed jobs
**Solution**:
```typescript
// Check delayed jobs in Redis
// Use Bull Board UI (optional dependency)
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

// Add to main.ts for development
const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullMQAdapter(workflowQueue)],
  serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());
```

---

## Performance Optimization

### Queue Concurrency Tuning

```typescript
@Processor('workflow-execution', {
  concurrency: 10, // Increase for higher throughput
})
```

**Guidelines**:
- Start with 5
- Monitor CPU and memory usage
- Increase to 10-20 if system handles it
- Consider dedicated worker instances for scale

### Database Query Optimization

```typescript
// Use select to limit data fetched
const execution = await this.prisma.workflowExecution.findUnique({
  where: { id: executionId },
  select: {
    id: true,
    status: true,
    workflowId: true,
    leadId: true,
    workflow: {
      select: {
        configurationData: true,
        nodes: {
          where: { deletedAt: null },
          orderBy: { executionOrder: 'asc' },
          select: {
            id: true,
            nodeType: true,
            config: true,
            executionOrder: true,
          },
        },
      },
    },
    lead: {
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        lastEmailSentAt: true,
        lastEmailOpenedAt: true,
        status: true,
        fieldData: {
          select: {
            value: true,
            formField: {
              select: {
                fieldKey: true,
              },
            },
          },
        },
      },
    },
  },
});
```

### Redis Optimization

```typescript
// Configure job options for performance
BullModule.registerQueue({
  name: 'workflow-execution',
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  settings: {
    maxStalledCount: 1, // Retry stalled jobs once
    stalledInterval: 30000, // Check for stalled jobs every 30s
  },
})
```

### Email Rate Limiting

Gmail API has rate limits (100 emails/day for free tier):

```typescript
// Add rate limiting to email service
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 per minute
async sendWorkflowEmail(...) {
  // ...
}
```

---

## Future Enhancements

### 1. Conditional Branching
Currently, condition nodes evaluate but don't branch. Future implementation:

```typescript
// Use WorkflowEdges to determine next node based on condition
const edges = await this.prisma.workflowEdge.findMany({
  where: {
    sourceNodeId: currentNode.id,
  },
});

// Edge with condition: { conditionResult: 'true' }
// Edge without condition: default path
const nextEdge = conditionResult
  ? edges.find((e) => e.config?.conditionResult === 'true')
  : edges.find((e) => !e.config?.conditionResult);

const nextNode = await this.prisma.workflowNode.findUnique({
  where: { id: nextEdge.targetNodeId },
});
```

### 2. Parallel Execution Paths
Execute multiple branches simultaneously:

```typescript
// Find all outgoing edges
const parallelEdges = await this.prisma.workflowEdge.findMany({
  where: {
    sourceNodeId: currentNode.id,
    config: { path: { contains: 'parallel' } },
  },
});

// Execute each branch concurrently
await Promise.all(
  parallelEdges.map((edge) =>
    this.executeNode(execution, edge.targetNode, lead),
  ),
);
```

### 3. A/B Testing
Send different email variants to test performance:

```typescript
// Randomly select variant
const variant = Math.random() < 0.5 ? 'A' : 'B';
const template = node.config[`emailTemplate${variant}`];

// Track variant in execution
await this.prisma.executionStep.update({
  where: { id: step.id },
  data: {
    outputData: { variant },
  },
});
```

### 4. Webhook Actions
Trigger external APIs:

```typescript
case 'webhook':
  await this.executeWebhook(node, lead, execution);
  break;

private async executeWebhook(node, lead, execution) {
  const webhookUrl = node.config.webhookUrl;
  const payload = {
    leadId: lead.id,
    email: lead.email,
    executionId: execution.id,
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
```

### 5. Advanced Analytics
Track email open rates, click rates, conversion metrics:

```typescript
// Add webhook endpoint for email tracking pixels
@Post('email/track/:executionId/:stepId')
async trackEmailOpen(
  @Param('executionId') executionId: string,
  @Param('stepId') stepId: string,
) {
  await this.prisma.executionStep.update({
    where: { id: stepId },
    data: {
      outputData: {
        emailOpened: true,
        openedAt: new Date(),
      },
    },
  });

  await this.prisma.lead.update({
    where: { id: execution.leadId },
    data: { lastEmailOpenedAt: new Date() },
  });
}
```

### 6. Workflow Templates
Pre-built workflow templates for common use cases:

```typescript
const TEMPLATES = {
  'lead-nurture': {
    name: 'Lead Nurture Campaign',
    nodes: [
      { nodeType: 'trigger_form', executionOrder: 0 },
      { nodeType: 'send_email', executionOrder: 1, config: {...} },
      { nodeType: 'delay', executionOrder: 2, config: { delayDays: 3 } },
      { nodeType: 'send_followup', executionOrder: 3, config: {...} },
    ],
  },
};
```

### 7. Visual Workflow Builder
Frontend component to visually build workflows:

```typescript
// React Flow based editor
import ReactFlow from 'reactflow';

const WorkflowBuilder = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const onSave = async () => {
    await fetch('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({ nodes, edges }),
    });
  };

  return <ReactFlow nodes={nodes} edges={edges} onNodesChange={setNodes} />;
};
```

---

## Appendix

### Complete File Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── workflows/
│   │   │   ├── workflows.module.ts
│   │   │   ├── services/
│   │   │   │   ├── workflow-queue.service.ts
│   │   │   │   ├── workflow-executor.service.ts
│   │   │   │   └── condition-evaluator.service.ts
│   │   │   ├── processors/
│   │   │   │   └── workflow-execution.processor.ts
│   │   │   └── index.ts
│   │   ├── forms/
│   │   │   └── services/
│   │   │       └── workflow-trigger.service.ts (UPDATED)
│   │   └── email/
│   │       └── workflow-email.service.ts (EXISTING)
│   ├── app.module.ts (UPDATED)
│   └── main.ts
├── prisma/
│   └── schema.prisma (EXISTING)
└── docs/
    └── WORKFLOW_EXECUTION_IMPLEMENTATION.md (THIS FILE)
```

### Environment Variables

Required environment variables:

```env
# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email (Gmail or SMTP)
# Gmail OAuth (preferred)
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-secret
GMAIL_REDIRECT_URI=http://localhost:3000/auth/google/callback

# OR SMTP Fallback
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/flowtrack
```

### Deployment Checklist

- [ ] Redis server running and accessible
- [ ] Database migrated (npx prisma migrate deploy)
- [ ] Environment variables configured
- [ ] Email credentials connected (Gmail OAuth or SMTP)
- [ ] BullMQ worker process running
- [ ] Monitoring/logging configured
- [ ] Error alerting setup (Sentry, etc.)
- [ ] Queue metrics dashboard (Bull Board)
- [ ] Test workflow end-to-end
- [ ] Load testing completed
- [ ] Backup strategy in place

### References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [FlowTrack Codebase](https://github.com/yourusername/flowtrack)

---

## Document Changelog

| Date       | Version | Changes                           |
|------------|---------|-----------------------------------|
| 2024-01-15 | 1.0.0   | Initial comprehensive guide       |

---

**End of Documentation**

For questions or contributions, please contact the FlowTrack development team.
