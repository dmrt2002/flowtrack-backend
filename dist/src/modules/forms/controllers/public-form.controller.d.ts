import type { Request } from 'express';
import { FormSubmissionService } from '../services/form-submission.service';
import { WorkflowTriggerService } from '../services/workflow-trigger.service';
import type { FormSubmissionDto, FormSubmissionResponseDto } from '../dto/form-submission.dto';
import { PublicFormSchemaDto } from '../dto/embed-config.dto';
export declare class PublicFormController {
    private readonly formSubmissionService;
    private readonly workflowTriggerService;
    constructor(formSubmissionService: FormSubmissionService, workflowTriggerService: WorkflowTriggerService);
    getPublicForm(workspaceSlug: string): Promise<PublicFormSchemaDto>;
    submitForm(workspaceSlug: string, submission: FormSubmissionDto, origin: string, userAgent: string, ipAddress: string, req: Request): Promise<FormSubmissionResponseDto>;
    trackFormView(workspaceSlug: string, userAgent: string, ipAddress: string, body: {
        utk?: string;
    }): Promise<void>;
    getEmbedScript(req: Request): string;
}
