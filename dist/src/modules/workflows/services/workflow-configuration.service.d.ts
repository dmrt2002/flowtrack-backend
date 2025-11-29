import { PrismaService } from '../../../prisma/prisma.service';
import type { WorkflowConfigurationDto } from '../dto';
export declare class WorkflowConfigurationService {
    private prisma;
    constructor(prisma: PrismaService);
    getWorkflowConfiguration(userId: string, workflowId: string): Promise<{
        success: boolean;
        data: {
            workflowId: string;
            welcomeSubject: any;
            welcomeBody: any;
            thankYouSubject: any;
            thankYouBody: any;
            followUpSubject: any;
            followUpBody: any;
            followUpDelayDays: any;
            deadlineDays: any;
        };
    }>;
    updateWorkflowConfiguration(userId: string, dto: WorkflowConfigurationDto): Promise<{
        success: boolean;
        message: string;
        data: {
            workflowId: string;
            welcomeSubject: any;
            welcomeBody: any;
            thankYouSubject: any;
            thankYouBody: any;
            followUpSubject: any;
            followUpBody: any;
            followUpDelayDays: any;
            deadlineDays: any;
        };
    }>;
}
