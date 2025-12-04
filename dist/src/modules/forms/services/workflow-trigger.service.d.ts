import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowQueueService } from '../../workflows/services/workflow-queue.service';
export declare class WorkflowTriggerService {
    private readonly prisma;
    private readonly workflowQueueService;
    private readonly logger;
    constructor(prisma: PrismaService, workflowQueueService: WorkflowQueueService);
    triggerFormWorkflow(leadId: string, workflowId: string, triggerData: Record<string, any>): Promise<string>;
    executeWorkflowSync(executionId: string): Promise<void>;
    getExecutionStatus(executionId: string): Promise<({
        executionSteps: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.ExecutionStepStatus;
            completedAt: Date | null;
            errorMessage: string | null;
            retryCount: number;
            startedAt: Date | null;
            errorDetails: import("@prisma/client/runtime/library").JsonValue | null;
            durationMs: number | null;
            outputData: import("@prisma/client/runtime/library").JsonValue | null;
            stepNumber: number;
            inputData: import("@prisma/client/runtime/library").JsonValue | null;
            executionId: string;
            workflowNodeId: string;
        }[];
        executionLogs: {
            id: string;
            workspaceId: string;
            createdAt: Date;
            message: string;
            nodeType: string | null;
            executionId: string;
            executionStepId: string | null;
            logLevel: import("@prisma/client").$Enums.LogLevel;
            logCategory: string | null;
            details: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    } & {
        id: string;
        workspaceId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.WorkflowExecutionStatus;
        completedAt: Date | null;
        workflowId: string;
        errorMessage: string | null;
        retryCount: number;
        leadId: string | null;
        startedAt: Date | null;
        errorDetails: import("@prisma/client/runtime/library").JsonValue | null;
        durationMs: number | null;
        executionNumber: bigint;
        idempotencyKey: string | null;
        triggerType: string;
        triggerNodeId: string | null;
        triggerData: import("@prisma/client/runtime/library").JsonValue | null;
        maxRetries: number;
        lockAcquiredAt: Date | null;
        lockReleasedAt: Date | null;
        outputData: import("@prisma/client/runtime/library").JsonValue | null;
    }) | null>;
}
