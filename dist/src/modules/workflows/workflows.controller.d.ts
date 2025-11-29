import { WorkflowConfigurationService } from './services/workflow-configuration.service';
import type { WorkflowConfigurationDto } from './dto';
export declare class WorkflowsController {
    private workflowConfigurationService;
    constructor(workflowConfigurationService: WorkflowConfigurationService);
    getWorkflowConfiguration(user: any, workflowId: string): Promise<{
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
    updateWorkflowConfiguration(user: any, dto: WorkflowConfigurationDto): Promise<{
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
