"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FormSubmissionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSubmissionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const form_validation_service_1 = require("./form-validation.service");
const client_1 = require("@prisma/client");
const enrichment_queue_service_1 = require("../../enrichment/services/enrichment-queue.service");
let FormSubmissionService = FormSubmissionService_1 = class FormSubmissionService {
    prisma;
    validationService;
    enrichmentQueue;
    logger = new common_1.Logger(FormSubmissionService_1.name);
    constructor(prisma, validationService, enrichmentQueue) {
        this.prisma = prisma;
        this.validationService = validationService;
        this.enrichmentQueue = enrichmentQueue;
    }
    async getPublicFormBySlug(workspaceSlug) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
            include: {
                workflows: {
                    where: {
                        status: client_1.WorkflowStatus.active,
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
                    take: 1,
                },
            },
        });
        if (!workspace) {
            throw new common_1.NotFoundException(`Workspace not found with slug: ${workspaceSlug}`);
        }
        if (!workspace.workflows || workspace.workflows.length === 0) {
            throw new common_1.NotFoundException(`No active workflow found for workspace: ${workspaceSlug}`);
        }
        const workflow = workspace.workflows[0];
        const fields = workflow.formFields.map((field) => ({
            id: field.id,
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: field.fieldType,
            placeholder: field.placeholder || undefined,
            helpText: field.helpText || undefined,
            isRequired: field.isRequired,
            options: field.options
                ? field.options
                : undefined,
            validationRules: field.validationRules
                ? field.validationRules
                : undefined,
            displayOrder: field.displayOrder,
        }));
        const workflowSettings = workflow.settings;
        const formSettings = workflowSettings?.form || {};
        return {
            workflowId: workflow.id,
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            workspaceSlug: workspace.slug,
            fields,
            settings: {
                formHeader: workflow.formHeader,
                formHeaderRich: workflow.formHeaderRich,
                showFormHeader: workflow.showFormHeader,
                formDescription: workflow.formDescription,
                formDescriptionRich: workflow.formDescriptionRich,
                showFormDescription: workflow.showFormDescription,
                successMessage: formSettings.successMessage ||
                    "Thank you! We'll be in touch soon.",
                redirectUrl: formSettings.redirectUrl,
                submitButtonText: formSettings.submitButtonText || 'Submit',
                theme: formSettings.theme,
            },
            isActive: workflow.status === client_1.WorkflowStatus.active,
            strategyName: workflow.strategyId ||
                workflow.configurationData?.strategyName ||
                undefined,
        };
    }
    async submitForm(workspaceSlug, submission, metadata) {
        const formSchema = await this.getPublicFormBySlug(workspaceSlug);
        const validation = this.validationService.validateSubmission(formSchema.fields, submission.fields);
        if (!validation.isValid) {
            throw new common_1.BadRequestException({
                success: false,
                errors: validation.errors,
            });
        }
        const sanitizedData = {};
        for (const field of formSchema.fields) {
            const rawValue = submission.fields[field.fieldKey];
            sanitizedData[field.fieldKey] = this.validationService.sanitizeValue(field.fieldType, rawValue);
        }
        const email = sanitizedData.email;
        const name = sanitizedData.name || null;
        const companyName = sanitizedData.companyName || null;
        const phone = sanitizedData.phone || null;
        if (!email) {
            throw new common_1.BadRequestException('Email is required');
        }
        const lead = await this.prisma.$transaction(async (tx) => {
            const existingLead = await tx.lead.findUnique({
                where: {
                    workflowId_email: {
                        workflowId: formSchema.workflowId,
                        email: email,
                    },
                },
            });
            const leadData = {
                workflowId: formSchema.workflowId,
                workspaceId: formSchema.workspaceId,
                email,
                name,
                companyName,
                phone,
                source: client_1.LeadSource.FORM,
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
                createdLead = await tx.lead.update({
                    where: { id: existingLead.id },
                    data: {
                        ...leadData,
                        updatedAt: new Date(),
                    },
                });
            }
            else {
                createdLead = await tx.lead.create({
                    data: leadData,
                });
            }
            if (existingLead) {
                await tx.leadFieldData.deleteMany({
                    where: { leadId: createdLead.id },
                });
            }
            const fieldDataPromises = formSchema.fields
                .filter((field) => sanitizedData[field.fieldKey] !== null)
                .map((field) => tx.leadFieldData.create({
                data: {
                    leadId: createdLead.id,
                    formFieldId: field.id,
                    value: String(sanitizedData[field.fieldKey]),
                },
            }));
            await Promise.all(fieldDataPromises);
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
        try {
            await this.enrichmentQueue.enqueueEnrichment({
                leadId: lead.id,
                workspaceId: lead.workspaceId,
                email: lead.email,
                name: lead.name || undefined,
                companyName: lead.companyName || undefined,
            });
            this.logger.log(`Enrichment queued for lead ${lead.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to queue enrichment for lead ${lead.id}: ${error.message}`);
        }
        return {
            success: true,
            leadId: lead.id,
            message: formSchema.settings.successMessage ||
                "Thank you! We'll be in touch soon.",
            redirectUrl: formSchema.settings.redirectUrl,
        };
    }
    async trackFormView(workspaceSlug, tracking) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
            include: {
                workflows: {
                    where: {
                        status: client_1.WorkflowStatus.active,
                        deletedAt: null,
                    },
                    take: 1,
                },
            },
        });
        if (!workspace || !workspace.workflows[0]) {
            return;
        }
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
};
exports.FormSubmissionService = FormSubmissionService;
exports.FormSubmissionService = FormSubmissionService = FormSubmissionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        form_validation_service_1.FormValidationService,
        enrichment_queue_service_1.EnrichmentQueueService])
], FormSubmissionService);
//# sourceMappingURL=form-submission.service.js.map