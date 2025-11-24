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
var OnboardingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const strategy_template_service_1 = require("./strategy-template.service");
const configuration_service_1 = require("./configuration.service");
const simulation_service_1 = require("./simulation.service");
const oauth_service_1 = require("../../oauth/oauth.service");
const slug_util_1 = require("../../../common/utils/slug.util");
let OnboardingService = OnboardingService_1 = class OnboardingService {
    prisma;
    strategyTemplateService;
    configurationService;
    simulationService;
    oauthService;
    logger = new common_1.Logger(OnboardingService_1.name);
    constructor(prisma, strategyTemplateService, configurationService, simulationService, oauthService) {
        this.prisma = prisma;
        this.strategyTemplateService = strategyTemplateService;
        this.configurationService = configurationService;
        this.simulationService = simulationService;
        this.oauthService = oauthService;
    }
    async getOrCreateWorkflow(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { ownedWorkspaces: true, workspaceMemberships: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        let workspace = user.ownedWorkspaces[0] ||
            (user.workspaceMemberships[0]
                ? await this.prisma.workspace.findUnique({
                    where: { id: user.workspaceMemberships[0].workspaceId },
                })
                : null);
        if (!workspace) {
            workspace = await this.createDefaultWorkspace(userId, user);
            this.logger.log(`Auto-created default workspace ${workspace.id} for user ${userId}`);
        }
        const existingWorkflow = await this.prisma.workflow.findFirst({
            where: {
                workspaceId: workspace.id,
                status: 'draft',
            },
            orderBy: { createdAt: 'desc' },
        });
        if (existingWorkflow) {
            let session = await this.prisma.onboardingSession.findUnique({
                where: {
                    userId_workspaceId: {
                        userId,
                        workspaceId: workspace.id,
                    },
                },
            });
            if (!session) {
                session = await this.prisma.onboardingSession.create({
                    data: {
                        userId,
                        workspaceId: workspace.id,
                        currentStep: 1,
                        completedSteps: [],
                    },
                });
            }
            const unifiedSchema = this.strategyTemplateService.getUnifiedConfigurationSchema();
            return {
                success: true,
                data: {
                    workflowId: existingWorkflow.id,
                    configurationSchema: unifiedSchema,
                },
            };
        }
        const blueprint = this.strategyTemplateService.getUnifiedWorkflowBlueprint();
        const workflow = await this.prisma.workflow.create({
            data: {
                workspaceId: workspace.id,
                name: 'Lead Automation Workflow',
                description: 'Automated lead response and follow-up workflow',
                templateId: 'tmpl_unified_001',
                strategyId: 'unified',
                status: 'draft',
            },
        });
        const defaultFields = [
            {
                workflowId: workflow.id,
                fieldKey: 'name',
                label: 'Name',
                fieldType: 'TEXT',
                isRequired: true,
                displayOrder: 1,
            },
            {
                workflowId: workflow.id,
                fieldKey: 'email',
                label: 'Email',
                fieldType: 'EMAIL',
                isRequired: true,
                displayOrder: 2,
            },
            {
                workflowId: workflow.id,
                fieldKey: 'companyName',
                label: 'Company Name',
                fieldType: 'TEXT',
                isRequired: false,
                displayOrder: 3,
            },
        ];
        await this.prisma.formField.createMany({
            data: defaultFields,
        });
        const nodes = [];
        const nodeIdMap = {};
        blueprint.steps.forEach((step, index) => {
            const reactFlowNodeId = `node-${index + 1}`;
            nodeIdMap[index] = reactFlowNodeId;
            let nodeCategory = 'action';
            if (step.nodeType.startsWith('trigger_')) {
                nodeCategory = 'trigger';
            }
            else if (step.nodeType === 'delay' ||
                step.nodeType === 'condition' ||
                step.nodeType === 'wait_for_reply') {
                nodeCategory = 'logic';
            }
            else if (step.nodeType.startsWith('check_') ||
                step.nodeType.startsWith('monitor_')) {
                nodeCategory = 'utility';
            }
            const positionX = index * 250;
            const positionY = 100;
            nodes.push({
                workflowId: workflow.id,
                reactFlowNodeId,
                nodeType: step.nodeType,
                nodeCategory,
                positionX,
                positionY,
                config: {
                    action: step.action,
                    description: step.description,
                },
                executionOrder: index + 1,
            });
        });
        await this.prisma.workflowNode.createMany({
            data: nodes,
        });
        const edges = [];
        for (let i = 0; i < blueprint.steps.length - 1; i++) {
            const sourceNodeId = nodeIdMap[i];
            const targetNodeId = nodeIdMap[i + 1];
            const reactFlowEdgeId = `edge-${i + 1}-${i + 2}`;
            edges.push({
                workflowId: workflow.id,
                reactFlowEdgeId,
                sourceNodeId,
                targetNodeId,
                edgeType: 'default',
                isEnabled: true,
            });
        }
        if (edges.length > 0) {
            await this.prisma.workflowEdge.createMany({
                data: edges,
            });
        }
        let session = await this.prisma.onboardingSession.findUnique({
            where: {
                userId_workspaceId: {
                    userId,
                    workspaceId: workspace.id,
                },
            },
        });
        if (!session) {
            session = await this.prisma.onboardingSession.create({
                data: {
                    userId,
                    workspaceId: workspace.id,
                    currentStep: 1,
                    completedSteps: [],
                },
            });
        }
        const unifiedSchema = this.strategyTemplateService.getUnifiedConfigurationSchema();
        return {
            success: true,
            data: {
                workflowId: workflow.id,
                configurationSchema: unifiedSchema,
            },
        };
    }
    async saveStrategy(userId, dto) {
        const template = this.strategyTemplateService.getTemplate(dto.strategyId);
        if (!template) {
            throw new common_1.BadRequestException('Invalid strategy ID');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { ownedWorkspaces: true, workspaceMemberships: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        let workspace = user.ownedWorkspaces[0] ||
            (user.workspaceMemberships[0]
                ? await this.prisma.workspace.findUnique({
                    where: { id: user.workspaceMemberships[0].workspaceId },
                })
                : null);
        if (!workspace) {
            workspace = await this.createDefaultWorkspace(userId, user);
            this.logger.log(`Auto-created default workspace ${workspace.id} for user ${userId}`);
        }
        let session = await this.prisma.onboardingSession.findUnique({
            where: {
                userId_workspaceId: {
                    userId,
                    workspaceId: workspace.id,
                },
            },
        });
        if (session) {
            session = await this.prisma.onboardingSession.update({
                where: { id: session.id },
                data: {
                    selectedStrategyId: dto.strategyId,
                    templateId: dto.templateId,
                    currentStep: 2,
                    completedSteps: [1],
                },
            });
        }
        else {
            session = await this.prisma.onboardingSession.create({
                data: {
                    userId,
                    workspaceId: workspace.id,
                    selectedStrategyId: dto.strategyId,
                    templateId: dto.templateId,
                    currentStep: 2,
                    completedSteps: [1],
                },
            });
        }
        const blueprint = template.workflowBlueprint;
        const workflow = await this.prisma.workflow.create({
            data: {
                workspaceId: workspace.id,
                name: template.name,
                description: template.description,
                templateId: dto.templateId,
                strategyId: dto.strategyId,
                status: 'draft',
            },
        });
        const defaultFields = [
            {
                workflowId: workflow.id,
                fieldKey: 'name',
                label: 'Name',
                fieldType: 'TEXT',
                isRequired: true,
                displayOrder: 1,
            },
            {
                workflowId: workflow.id,
                fieldKey: 'email',
                label: 'Email',
                fieldType: 'EMAIL',
                isRequired: true,
                displayOrder: 2,
            },
            {
                workflowId: workflow.id,
                fieldKey: 'companyName',
                label: 'Company Name',
                fieldType: 'TEXT',
                isRequired: false,
                displayOrder: 3,
            },
        ];
        if (dto.strategyId === 'inbound-leads') {
            defaultFields.push({
                workflowId: workflow.id,
                fieldKey: 'budget',
                label: 'Budget',
                fieldType: 'NUMBER',
                isRequired: true,
                displayOrder: 4,
            });
        }
        await this.prisma.formField.createMany({
            data: defaultFields,
        });
        const nodes = [];
        const nodePositions = {};
        const nodeIdMap = {};
        blueprint.steps.forEach((step, index) => {
            const reactFlowNodeId = `node-${index + 1}`;
            nodeIdMap[index] = reactFlowNodeId;
            let nodeCategory = 'action';
            if (step.nodeType.startsWith('trigger_')) {
                nodeCategory = 'trigger';
            }
            else if (step.nodeType === 'delay' || step.nodeType === 'condition' || step.nodeType === 'wait_for_reply') {
                nodeCategory = 'logic';
            }
            else if (step.nodeType.startsWith('check_') || step.nodeType.startsWith('monitor_')) {
                nodeCategory = 'utility';
            }
            const positionX = index * 250;
            const positionY = 100;
            nodePositions[reactFlowNodeId] = { x: positionX, y: positionY };
            nodes.push({
                workflowId: workflow.id,
                reactFlowNodeId,
                nodeType: step.nodeType,
                nodeCategory,
                positionX: positionX,
                positionY: positionY,
                config: {
                    action: step.action,
                    description: step.description,
                },
                executionOrder: index + 1,
            });
        });
        await this.prisma.workflowNode.createMany({
            data: nodes,
        });
        const edges = [];
        for (let i = 0; i < blueprint.steps.length - 1; i++) {
            const sourceNodeId = nodeIdMap[i];
            const targetNodeId = nodeIdMap[i + 1];
            const reactFlowEdgeId = `edge-${i + 1}-${i + 2}`;
            edges.push({
                workflowId: workflow.id,
                reactFlowEdgeId,
                sourceNodeId,
                targetNodeId,
                edgeType: 'default',
                isEnabled: true,
            });
        }
        if (edges.length > 0) {
            await this.prisma.workflowEdge.createMany({
                data: edges,
            });
        }
        return {
            success: true,
            data: {
                workflowId: workflow.id,
                strategyId: dto.strategyId,
                strategyName: template.name,
                templateId: dto.templateId,
                configurationSchema: template.configSchema,
            },
        };
    }
    async saveFormFields(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                ownedWorkspaces: true,
                workspaceMemberships: {
                    include: {
                        workspace: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const workflow = await this.prisma.workflow.findUnique({
            where: { id: dto.workflowId },
            include: {
                workspace: true,
            },
        });
        if (!workflow) {
            throw new common_1.NotFoundException('Workflow not found');
        }
        const hasAccess = user.ownedWorkspaces.some((ws) => ws.id === workflow.workspaceId) ||
            user.workspaceMemberships.some((membership) => membership.workspaceId === workflow.workspaceId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this workflow');
        }
        await this.prisma.formField.deleteMany({
            where: { workflowId: dto.workflowId },
        });
        const formFieldsData = dto.formFields.map((field) => {
            const fieldData = {
                workflowId: dto.workflowId,
                fieldKey: field.fieldKey,
                label: field.label,
                fieldType: field.fieldType,
                placeholder: field.placeholder || null,
                helpText: field.helpText || null,
                isRequired: field.isRequired,
                displayOrder: field.displayOrder,
                isActive: true,
            };
            if (field.fieldType === 'DROPDOWN' && field.options) {
                fieldData.options = field.options;
            }
            else {
                fieldData.options = null;
            }
            if (field.validationRules) {
                fieldData.validationRules = field.validationRules;
            }
            else {
                fieldData.validationRules = null;
            }
            return fieldData;
        });
        await this.prisma.formField.createMany({
            data: formFieldsData,
        });
        const session = await this.getSession(userId);
        if (session) {
            await this.prisma.onboardingSession.update({
                where: { id: session.id },
                data: {
                    currentStep: 3,
                    completedSteps: [...new Set([...session.completedSteps, 2])],
                },
            });
        }
        const savedFields = await this.prisma.formField.findMany({
            where: { workflowId: dto.workflowId },
            orderBy: { displayOrder: 'asc' },
        });
        const formFields = savedFields.map((field) => ({
            id: field.id,
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: field.fieldType,
            placeholder: field.placeholder || undefined,
            helpText: field.helpText || undefined,
            isRequired: field.isRequired,
            options: field.options && field.fieldType === 'DROPDOWN'
                ? field.options
                : undefined,
            validationRules: field.validationRules
                ? field.validationRules
                : undefined,
            displayOrder: field.displayOrder,
            createdAt: field.createdAt.toISOString(),
            updatedAt: field.updatedAt.toISOString(),
        }));
        const defaultFieldKeys = ['name', 'email', 'companyName'];
        const customFieldVariables = savedFields.map((field) => `{${field.fieldKey}}`);
        const defaultVariables = defaultFieldKeys.map((key) => `{${key}}`);
        const allVariables = [
            ...defaultVariables,
            ...customFieldVariables.filter((v) => !defaultVariables.includes(v)),
        ];
        const availableVariables = allVariables;
        this.logger.log(`Saved ${formFields.length} form fields for workflow ${dto.workflowId}`);
        return {
            success: true,
            data: {
                workflowId: dto.workflowId,
                formFields,
                availableVariables,
            },
        };
    }
    async getFormFields(userId, workflowId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                ownedWorkspaces: true,
                workspaceMemberships: {
                    include: {
                        workspace: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const workflow = await this.prisma.workflow.findUnique({
            where: { id: workflowId },
            include: {
                workspace: true,
            },
        });
        if (!workflow) {
            throw new common_1.NotFoundException('Workflow not found');
        }
        const hasAccess = user.ownedWorkspaces.some((ws) => ws.id === workflow.workspaceId) ||
            user.workspaceMemberships.some((membership) => membership.workspaceId === workflow.workspaceId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this workflow');
        }
        const savedFields = await this.prisma.formField.findMany({
            where: { workflowId },
            orderBy: { displayOrder: 'asc' },
        });
        const formFields = savedFields.map((field) => ({
            id: field.id,
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: field.fieldType,
            placeholder: field.placeholder || undefined,
            helpText: field.helpText || undefined,
            isRequired: field.isRequired,
            options: field.options && field.fieldType === 'DROPDOWN'
                ? field.options
                : undefined,
            validationRules: field.validationRules
                ? field.validationRules
                : undefined,
            displayOrder: field.displayOrder,
            createdAt: field.createdAt.toISOString(),
            updatedAt: field.updatedAt.toISOString(),
        }));
        const defaultFieldKeys = ['name', 'email', 'companyName'];
        const customFieldVariables = savedFields.map((field) => `{${field.fieldKey}}`);
        const defaultVariables = defaultFieldKeys.map((key) => `{${key}}`);
        const allVariables = [
            ...defaultVariables,
            ...customFieldVariables.filter((v) => !defaultVariables.includes(v)),
        ];
        const availableVariables = allVariables;
        this.logger.log(`Retrieved ${formFields.length} form fields for workflow ${workflowId}`);
        return {
            success: true,
            data: {
                workflowId,
                formFields,
                availableVariables,
            },
        };
    }
    async saveCalendlyLink(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                ownedWorkspaces: true,
                workspaceMemberships: {
                    include: {
                        workspace: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const workflow = await this.prisma.workflow.findUnique({
            where: { id: dto.workflowId },
            include: {
                workspace: true,
            },
        });
        if (!workflow) {
            throw new common_1.NotFoundException('Workflow not found');
        }
        const hasAccess = user.ownedWorkspaces.some((ws) => ws.id === workflow.workspaceId) ||
            user.workspaceMemberships.some((membership) => membership.workspaceId === workflow.workspaceId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this workflow');
        }
        await this.oauthService.saveCalendlyLink(workflow.workspaceId, dto.calendlyLink);
        await this.prisma.workflow.update({
            where: { id: dto.workflowId },
            data: {
                schedulingType: 'CALENDLY',
            },
        });
        return {
            success: true,
            message: 'Calendly link saved successfully',
            data: {
                calendlyLink: dto.calendlyLink,
            },
        };
    }
    async saveSchedulingPreference(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                ownedWorkspaces: true,
                workspaceMemberships: {
                    include: {
                        workspace: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const workflow = await this.prisma.workflow.findUnique({
            where: { id: dto.workflowId },
            include: {
                workspace: true,
            },
        });
        if (!workflow) {
            throw new common_1.NotFoundException('Workflow not found');
        }
        const hasAccess = user.ownedWorkspaces.some((ws) => ws.id === workflow.workspaceId) ||
            user.workspaceMemberships.some((membership) => membership.workspaceId === workflow.workspaceId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this workflow');
        }
        await this.prisma.workflow.update({
            where: { id: dto.workflowId },
            data: {
                schedulingType: dto.schedulingType,
            },
        });
        if (dto.schedulingType === 'CALENDLY' && dto.calendlyLink) {
            await this.oauthService.saveCalendlyLink(workflow.workspaceId, dto.calendlyLink);
        }
        const session = await this.getSession(userId);
        if (session) {
            await this.prisma.onboardingSession.update({
                where: { id: session.id },
                data: {
                    currentStep: 3,
                    completedSteps: [...new Set([...session.completedSteps, 3])],
                },
            });
        }
        return {
            success: true,
            message: 'Scheduling preference saved successfully',
            data: {
                schedulingType: dto.schedulingType,
                calendlyLink: dto.calendlyLink || null,
            },
        };
    }
    async saveConfiguration(userId, dto) {
        const session = await this.getSession(userId);
        if (!session) {
            throw new common_1.BadRequestException('Onboarding session not found');
        }
        let stepsToComplete = [...session.completedSteps];
        if (!stepsToComplete.includes(2)) {
            stepsToComplete.push(2);
        }
        if (!stepsToComplete.includes(3)) {
            stepsToComplete.push(3);
        }
        const schema = this.strategyTemplateService.getUnifiedConfigurationSchema();
        const validation = this.configurationService.validateConfiguration(dto.configuration, schema);
        if (!validation.isValid) {
            throw new common_1.BadRequestException({
                message: 'Validation failed',
                errors: validation.errors,
            });
        }
        const blueprint = this.strategyTemplateService.getUnifiedWorkflowBlueprint();
        const workflowPreview = blueprint.steps.map((step, index) => ({
            order: index + 1,
            nodeType: step.nodeType,
            action: step.action,
            description: step.description,
            status: 'pending',
        }));
        const updatedSession = await this.prisma.onboardingSession.update({
            where: { id: session.id },
            data: {
                configurationData: dto.configuration,
                currentStep: 4,
                completedSteps: [...new Set([...stepsToComplete, 4])],
            },
        });
        return {
            success: true,
            data: {
                configurationId: updatedSession.id,
                configuration: dto.configuration,
                workflowPreview: {
                    steps: workflowPreview,
                },
            },
        };
    }
    async confirmOAuthConnection(userId, dto) {
        const session = await this.getSession(userId);
        if (!session) {
            throw new common_1.BadRequestException('Onboarding session not found');
        }
        if (!session.completedSteps.includes(2)) {
            throw new common_1.ForbiddenException('Please complete Step 2 first');
        }
        const providerType = dto.provider === 'gmail' ? 'GOOGLE_EMAIL' : 'OUTLOOK_EMAIL';
        const oauthCredential = await this.prisma.oAuthCredential.findFirst({
            where: {
                workspaceId: session.workspaceId,
                providerType,
                providerEmail: dto.email,
                isActive: true,
                deletedAt: null,
            },
        });
        if (!oauthCredential) {
            throw new common_1.BadRequestException('OAuth connection not found');
        }
        await this.prisma.onboardingSession.update({
            where: { id: session.id },
            data: {
                currentStep: 4,
                completedSteps: [...new Set([...session.completedSteps, 3])],
            },
        });
        return {
            success: true,
            data: {
                provider: dto.provider,
                email: dto.email,
                connectedAt: oauthCredential.createdAt.toISOString(),
                permissions: ['read', 'send', 'modify'],
            },
        };
    }
    async generateSimulation(userId, dto) {
        const session = await this.prisma.onboardingSession.findUnique({
            where: { id: dto.configurationId },
        });
        if (!session || session.userId !== userId) {
            throw new common_1.BadRequestException('Invalid configuration ID');
        }
        if (!session.completedSteps.includes(4)) {
            throw new common_1.ForbiddenException('Please complete Step 4 (Email Configuration) first');
        }
        const blueprint = this.strategyTemplateService.getUnifiedWorkflowBlueprint();
        const workflowPreview = blueprint.steps.map((step, index) => ({
            order: index + 1,
            nodeType: step.nodeType,
            action: step.action,
            description: step.description,
            status: 'pending',
        }));
        const strategyId = dto.strategyId || 'unified';
        const simulationData = this.simulationService.generateSimulation(strategyId, workflowPreview, session.configurationData);
        await this.prisma.onboardingSession.update({
            where: { id: session.id },
            data: {
                currentStep: 5,
                completedSteps: [...new Set([...session.completedSteps, 5])],
            },
        });
        return {
            success: true,
            data: {
                simulationData,
            },
        };
    }
    async getOnboardingStatus(userId) {
        const session = await this.getSession(userId);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { authProvider: true },
        });
        if (!session) {
            return {
                currentStep: 1,
                completedSteps: [],
                isComplete: false,
                userAuthProvider: user?.authProvider || 'local',
                signedUpWithGoogle: user?.authProvider === 'clerk',
                gmailConnected: false,
                gmailEmail: null,
            };
        }
        const gmailCredential = await this.prisma.oAuthCredential.findFirst({
            where: {
                workspaceId: session.workspaceId,
                providerType: 'GOOGLE_EMAIL',
                isActive: true,
                deletedAt: null,
            },
            select: {
                providerEmail: true,
                createdAt: true,
            },
        });
        const oauthConnection = await this.prisma.oAuthCredential.findFirst({
            where: {
                workspaceId: session.workspaceId,
                isActive: true,
                deletedAt: null,
            },
            select: {
                providerType: true,
                providerEmail: true,
                createdAt: true,
            },
        });
        return {
            currentStep: session.currentStep,
            completedSteps: session.completedSteps,
            isComplete: session.isComplete,
            userAuthProvider: user?.authProvider || 'local',
            signedUpWithGoogle: user?.authProvider === 'clerk',
            gmailConnected: !!gmailCredential,
            gmailEmail: gmailCredential?.providerEmail || null,
            selectedStrategy: session.selectedStrategyId
                ? {
                    id: session.selectedStrategyId,
                    name: this.strategyTemplateService.getTemplate(session.selectedStrategyId)?.name || '',
                }
                : undefined,
            configuration: session.configurationData,
            oauthConnection: oauthConnection
                ? {
                    provider: oauthConnection.providerType === 'GOOGLE_EMAIL'
                        ? 'gmail'
                        : 'outlook',
                    email: oauthConnection.providerEmail || '',
                    isConnected: true,
                }
                : undefined,
        };
    }
    generateDefaultWorkspaceName(user) {
        if (user.firstName && user.lastName) {
            return `${user.firstName} ${user.lastName}'s Workspace`;
        }
        else if (user.firstName) {
            return `${user.firstName}'s Workspace`;
        }
        else {
            const emailName = user.email.split('@')[0];
            return `${emailName}'s Workspace`;
        }
    }
    async createDefaultWorkspace(userId, user) {
        const workspaceName = this.generateDefaultWorkspaceName(user);
        const baseSlug = (0, slug_util_1.generateSlug)(workspaceName);
        let slug = baseSlug;
        let counter = 1;
        while (await this.prisma.workspace.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        const generateIntakeEmailId = () => {
            return Math.random().toString(36).substring(2, 12);
        };
        let intakeEmailId = generateIntakeEmailId();
        while (await this.prisma.workspace.findUnique({ where: { intakeEmailId } })) {
            intakeEmailId = generateIntakeEmailId();
        }
        const workspace = await this.prisma.$transaction(async (tx) => {
            const newWorkspace = await tx.workspace.create({
                data: {
                    name: workspaceName,
                    slug,
                    intakeEmailId,
                    ownerUserId: userId,
                },
            });
            await tx.workspaceMember.create({
                data: {
                    userId,
                    workspaceId: newWorkspace.id,
                    role: 'admin',
                },
            });
            return newWorkspace;
        });
        return workspace;
    }
    async getSession(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { ownedWorkspaces: true, workspaceMemberships: true },
        });
        if (!user) {
            return null;
        }
        let workspace = user.ownedWorkspaces[0] ||
            (user.workspaceMemberships[0]
                ? await this.prisma.workspace.findUnique({
                    where: { id: user.workspaceMemberships[0].workspaceId },
                })
                : null);
        if (!workspace) {
            workspace = await this.createDefaultWorkspace(userId, user);
            this.logger.log(`Auto-created default workspace ${workspace.id} for user ${userId} (via getSession)`);
        }
        return this.prisma.onboardingSession.findUnique({
            where: {
                userId_workspaceId: {
                    userId,
                    workspaceId: workspace.id,
                },
            },
        });
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = OnboardingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        strategy_template_service_1.StrategyTemplateService,
        configuration_service_1.ConfigurationService,
        simulation_service_1.SimulationService,
        oauth_service_1.OAuthService])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map