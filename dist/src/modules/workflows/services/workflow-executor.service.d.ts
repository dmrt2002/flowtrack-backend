import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowEmailService } from '../../email/workflow-email.service';
import { RelayEmailService } from '../../email-relay/services/relay-email.service';
import { WorkflowQueueService } from './workflow-queue.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
export declare class WorkflowExecutorService {
    private prisma;
    private emailService;
    private relayEmailService;
    private queueService;
    private conditionEvaluator;
    private readonly logger;
    constructor(prisma: PrismaService, emailService: WorkflowEmailService, relayEmailService: RelayEmailService, queueService: WorkflowQueueService, conditionEvaluator: ConditionEvaluatorService);
    execute(executionId: string, fromStep?: number): Promise<void>;
    private executeNode;
    private executeSendEmail;
    private executeSendFollowup;
    private executeDelay;
    private markLeadFailed;
    private createExecutionStep;
    private updateStepStatus;
    private handleStepError;
    private handleExecutionError;
    private getReachableNodes;
    private storeBranchDecision;
}
