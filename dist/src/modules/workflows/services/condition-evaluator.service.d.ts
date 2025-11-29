import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowNode } from '@prisma/client';
export declare class ConditionEvaluatorService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    evaluateCondition(node: WorkflowNode, lead: any): Promise<boolean>;
    private checkBudgetQualification;
    private checkReplyReceived;
    private checkBookingCompleted;
}
