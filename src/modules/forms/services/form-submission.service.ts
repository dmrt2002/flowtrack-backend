import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FormValidationService } from './form-validation.service';
import {
  FormSubmissionDto,
  FormSubmissionResponseDto,
} from '../dto/form-submission.dto';
import { PublicFormSchemaDto } from '../dto/embed-config.dto';
import { LeadSource, WorkflowStatus, FieldType } from '@prisma/client';
import { EnrichmentQueueService } from '../../enrichment/services/enrichment-queue.service';

@Injectable()
export class FormSubmissionService {
  private readonly logger = new Logger(FormSubmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: FormValidationService,
    private readonly enrichmentQueue: EnrichmentQueueService,
  ) {}

  /**
   * Get public form schema by workspace slug
   */
  async getPublicFormBySlug(
    workspaceSlug: string,
  ): Promise<PublicFormSchemaDto> {
    // Find workspace by slug
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        workflows: {
          where: {
            status: WorkflowStatus.active,
            deletedAt: null,
          },
          include: {
            formFields: {
              where: {
                isActive: true,
                deletedAt: null,
              },
              orderBy: {
                displayOrder: 'asc',
              },
            },
          },
          take: 1, // Get the first active workflow
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(
        `Workspace not found with slug: ${workspaceSlug}`,
      );
    }

    if (!workspace.workflows || workspace.workflows.length === 0) {
      throw new NotFoundException(
        `No active workflow found for workspace: ${workspaceSlug}`,
      );
    }

    const workflow = workspace.workflows[0];

    // Transform form fields to DTO format
    const fields = workflow.formFields.map((field) => ({
      id: field.id,
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType as FieldType,
      placeholder: field.placeholder || undefined,
      helpText: field.helpText || undefined,
      isRequired: field.isRequired,
      options: field.options
        ? (field.options as Array<{ label: string; value: string }>)
        : undefined,
      validationRules: field.validationRules
        ? (field.validationRules as any)
        : undefined,
      displayOrder: field.displayOrder,
    }));

    // Extract settings from workflow
    const workflowSettings = workflow.settings as any;
    const formSettings = workflowSettings?.form || {};

    return {
      workflowId: workflow.id,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      fields,
      settings: {
        // Form header and description
        formHeader: workflow.formHeader,
        formHeaderRich: workflow.formHeaderRich,
        showFormHeader: workflow.showFormHeader,
        formDescription: workflow.formDescription,
        formDescriptionRich: workflow.formDescriptionRich,
        showFormDescription: workflow.showFormDescription,
        // Submit button and success message
        successMessage:
          formSettings.successMessage ||
          "Thank you! We'll be in touch soon.",
        redirectUrl: formSettings.redirectUrl,
        submitButtonText: formSettings.submitButtonText || 'Submit',
        theme: formSettings.theme,
      },
      isActive: workflow.status === WorkflowStatus.active,
      strategyName:
        workflow.strategyId ||
        (workflow.configurationData as any)?.strategyName ||
        undefined,
    };
  }

  /**
   * Submit form and create lead
   */
  async submitForm(
    workspaceSlug: string,
    submission: FormSubmissionDto,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      origin?: string;
    },
  ): Promise<FormSubmissionResponseDto> {
    // Get form schema
    const formSchema = await this.getPublicFormBySlug(workspaceSlug);

    // Validate submission data
    const validation = this.validationService.validateSubmission(
      formSchema.fields as any,
      submission.fields,
    );

    if (!validation.isValid) {
      throw new BadRequestException({
        success: false,
        errors: validation.errors,
      });
    }

    // Sanitize and normalize values
    const sanitizedData: Record<string, any> = {};
    for (const field of formSchema.fields) {
      const rawValue = submission.fields[field.fieldKey];
      sanitizedData[field.fieldKey] = this.validationService.sanitizeValue(
        field.fieldType as any,
        rawValue,
      );
    }

    // Extract core fields
    const email = sanitizedData.email;
    const name = sanitizedData.name || null;
    const companyName = sanitizedData.companyName || null;
    const phone = sanitizedData.phone || null;

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    // Create lead using transaction
    const lead = await this.prisma.$transaction(async (tx: any) => {
      // Check if lead already exists for this workflow
      const existingLead = await tx.lead.findUnique({
        where: {
          workflowId_email: {
            workflowId: formSchema.workflowId,
            email: email,
          },
        },
      });

      // Create or update lead
      const leadData = {
        workflowId: formSchema.workflowId,
        workspaceId: formSchema.workspaceId,
        email,
        name,
        companyName,
        phone,
        source: LeadSource.FORM,
        sourceMetadata: {
          submittedAt: new Date().toISOString(),
          origin: metadata.origin,
          utk: submission.tracking?.utk,
          utm: {
            source: submission.tracking?.utmSource,
            medium: submission.tracking?.utmMedium,
            campaign: submission.tracking?.utmCampaign,
            term: submission.tracking?.utmTerm,
            content: submission.tracking?.utmContent,
          },
          referrer: submission.tracking?.referrer,
          pageUrl: submission.tracking?.pageUrl,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
        },
        lastActivityAt: new Date(),
      };

      let createdLead;

      if (existingLead) {
        // Update existing lead
        createdLead = await tx.lead.update({
          where: { id: existingLead.id },
          data: {
            ...leadData,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new lead
        createdLead = await tx.lead.create({
          data: leadData,
        });
      }

      // Delete existing field data (if updating)
      if (existingLead) {
        await tx.leadFieldData.deleteMany({
          where: { leadId: createdLead.id },
        });
      }

      // Create lead field data for custom fields
      const fieldDataPromises = formSchema.fields
        .filter((field) => sanitizedData[field.fieldKey] !== null)
        .map((field) =>
          tx.leadFieldData.create({
            data: {
              leadId: createdLead.id,
              formFieldId: field.id,
              value: String(sanitizedData[field.fieldKey]),
            },
          }),
        );

      await Promise.all(fieldDataPromises);

      // Create lead event
      await tx.leadEvent.create({
        data: {
          leadId: createdLead.id,
          eventType: 'form_submitted',
          eventCategory: 'activity',
          description: `Form submitted via ${workspaceSlug}`,
          metadata: {
            workspaceSlug,
            formData: sanitizedData,
            tracking: submission.tracking,
          },
        },
      });

      return createdLead;
    });

    // Trigger background enrichment for the lead
    try {
      await this.enrichmentQueue.enqueueEnrichment({
        leadId: lead.id,
        workspaceId: lead.workspaceId,
        email: lead.email,
        name: lead.name || undefined,
        companyName: lead.companyName || undefined,
      });
      this.logger.log(`Enrichment queued for lead ${lead.id}`);
    } catch (error) {
      // Don't fail form submission if enrichment queueing fails
      this.logger.error(`Failed to queue enrichment for lead ${lead.id}: ${error.message}`);
    }

    return {
      success: true,
      leadId: lead.id,
      message:
        formSchema.settings.successMessage ||
        "Thank you! We'll be in touch soon.",
      redirectUrl: formSchema.settings.redirectUrl,
    };
  }

  /**
   * Track form view analytics
   */
  async trackFormView(
    workspaceSlug: string,
    tracking: {
      utk?: string;
      userAgent?: string;
      ipAddress?: string;
    },
  ): Promise<void> {
    // Get workspace and workflow
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        workflows: {
          where: {
            status: WorkflowStatus.active,
            deletedAt: null,
          },
          take: 1,
        },
      },
    });

    if (!workspace || !workspace.workflows[0]) {
      return; // Silently fail for analytics
    }

    // Create usage event for form view
    await this.prisma.usageEvent.create({
      data: {
        workspaceId: workspace.id,
        eventType: 'form_view',
        eventCategory: 'communication',
        quantity: 1,
        relatedResourceId: workspace.workflows[0].id,
        relatedResourceType: 'workflow',
        isBillable: false,
        metadata: {
          utk: tracking.utk,
          userAgent: tracking.userAgent,
          ipAddress: tracking.ipAddress,
        },
      },
    });
  }
}
