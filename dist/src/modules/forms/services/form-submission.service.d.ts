import { PrismaService } from '../../../prisma/prisma.service';
import { FormValidationService } from './form-validation.service';
import { FormSubmissionDto, FormSubmissionResponseDto } from '../dto/form-submission.dto';
import { PublicFormSchemaDto } from '../dto/embed-config.dto';
import { EnrichmentQueueService } from '../../enrichment/services/enrichment-queue.service';
export declare class FormSubmissionService {
    private readonly prisma;
    private readonly validationService;
    private readonly enrichmentQueue;
    private readonly logger;
    constructor(prisma: PrismaService, validationService: FormValidationService, enrichmentQueue: EnrichmentQueueService);
    getPublicFormBySlug(workspaceSlug: string): Promise<PublicFormSchemaDto>;
    submitForm(workspaceSlug: string, submission: FormSubmissionDto, metadata: {
        ipAddress?: string;
        userAgent?: string;
        origin?: string;
    }): Promise<FormSubmissionResponseDto>;
    trackFormView(workspaceSlug: string, tracking: {
        utk?: string;
        userAgent?: string;
        ipAddress?: string;
    }): Promise<void>;
}
