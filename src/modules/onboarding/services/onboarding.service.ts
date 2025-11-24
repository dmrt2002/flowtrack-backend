import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StrategyTemplateService } from './strategy-template.service';
import { ConfigurationService } from './configuration.service';
import { SimulationService } from './simulation.service';
import { OAuthService } from '../../oauth/oauth.service';
import { generateSlug } from '../../../common/utils/slug.util';
import {
  StrategySelectionDto,
  ConfigurationDto,
  OAuthCompleteDto,
  SimulationDto,
  FormFieldsDto,
  CalendlyDto,
  SchedulingPreferenceDto,
} from '../dto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private strategyTemplateService: StrategyTemplateService,
    private configurationService: ConfigurationService,
    private simulationService: SimulationService,
    private oauthService: OAuthService,
  ) {}

  /**
   * Auto-create or get existing workflow for unified onboarding flow
   * This is called when user first accesses onboarding (replaces strategy selection)
   */
  async getOrCreateWorkflow(userId: string) {
    // Get user's workspace
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedWorkspaces: true, workspaceMemberships: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let workspace =
      user.ownedWorkspaces[0] ||
      (user.workspaceMemberships[0]
        ? await this.prisma.workspace.findUnique({
            where: { id: user.workspaceMemberships[0].workspaceId },
          })
        : null);

    // Auto-create workspace if none exists
    if (!workspace) {
      workspace = await this.createDefaultWorkspace(userId, user);
      this.logger.log(
        `Auto-created default workspace ${workspace.id} for user ${userId}`,
      );
    }

    // Check if workflow already exists
    const existingWorkflow = await this.prisma.workflow.findFirst({
      where: {
        workspaceId: workspace.id,
        status: 'draft',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingWorkflow) {
      // Get or create onboarding session
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

      // Get unified configuration schema
      const unifiedSchema = this.strategyTemplateService.getUnifiedConfigurationSchema();

      return {
        success: true,
        data: {
          workflowId: existingWorkflow.id,
          configurationSchema: unifiedSchema,
        },
      };
    }

    // Create new workflow with unified blueprint
    const blueprint = this.strategyTemplateService.getUnifiedWorkflowBlueprint();

    const workflow = await this.prisma.workflow.create({
      data: {
        workspaceId: workspace.id,
        name: 'Lead Automation Workflow',
        description: 'Automated lead response and follow-up workflow',
        templateId: 'tmpl_unified_001',
        strategyId: 'unified', // New unified strategy ID
        status: 'draft',
      },
    });

    // Create default form fields (Name, Email, Company Name)
    const defaultFields: Array<{
      workflowId: string;
      fieldKey: string;
      label: string;
      fieldType: 'TEXT' | 'EMAIL' | 'NUMBER';
      isRequired: boolean;
      displayOrder: number;
    }> = [
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

    // Create WorkflowNodes from blueprint
    const nodes: Array<{
      workflowId: string;
      reactFlowNodeId: string;
      nodeType: string;
      nodeCategory: 'trigger' | 'action' | 'logic' | 'utility';
      positionX: number;
      positionY: number;
      config: Record<string, any>;
      executionOrder: number;
    }> = [];
    const nodeIdMap: Record<number, string> = {};

    blueprint.steps.forEach((step, index) => {
      const reactFlowNodeId = `node-${index + 1}`;
      nodeIdMap[index] = reactFlowNodeId;

      let nodeCategory: 'trigger' | 'action' | 'logic' | 'utility' = 'action';
      if (step.nodeType.startsWith('trigger_')) {
        nodeCategory = 'trigger';
      } else if (
        step.nodeType === 'delay' ||
        step.nodeType === 'condition' ||
        step.nodeType === 'wait_for_reply'
      ) {
        nodeCategory = 'logic';
      } else if (
        step.nodeType.startsWith('check_') ||
        step.nodeType.startsWith('monitor_')
      ) {
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

    // Create WorkflowEdges
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

    // Create or update onboarding session
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

    // Get unified configuration schema
    const unifiedSchema = this.strategyTemplateService.getUnifiedConfigurationSchema();

    return {
      success: true,
      data: {
        workflowId: workflow.id,
        configurationSchema: unifiedSchema,
      },
    };
  }

  /**
   * Step 1: Save strategy selection (DEPRECATED - kept for backward compatibility)
   * @deprecated Use getOrCreateWorkflow() instead
   */
  async saveStrategy(userId: string, dto: StrategySelectionDto) {
    // Validate strategy exists
    const template = this.strategyTemplateService.getTemplate(dto.strategyId);
    if (!template) {
      throw new BadRequestException('Invalid strategy ID');
    }

    // Get user's first workspace (for now, assuming single workspace)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedWorkspaces: true, workspaceMemberships: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let workspace =
      user.ownedWorkspaces[0] ||
      (user.workspaceMemberships[0]
        ? await this.prisma.workspace.findUnique({
            where: { id: user.workspaceMemberships[0].workspaceId },
          })
        : null);

    // Auto-create workspace if none exists
    if (!workspace) {
      workspace = await this.createDefaultWorkspace(userId, user);
      this.logger.log(
        `Auto-created default workspace ${workspace.id} for user ${userId}`,
      );
    }

    // Get or create onboarding session
    let session = await this.prisma.onboardingSession.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
    });

    if (session) {
      // Update existing session
      session = await this.prisma.onboardingSession.update({
        where: { id: session.id },
        data: {
          selectedStrategyId: dto.strategyId,
          templateId: dto.templateId,
          currentStep: 2,
          completedSteps: [1],
        },
      });
    } else {
      // Create new session
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

    // Create Workflow with default nodes and edges from template blueprint
    // According to TECHNICAL-DOCUMENTATION.md: "creates a Workflow from the template
    // and pre-populates WorkflowNode and WorkflowEdge relations with the default flow"
    const blueprint = template.workflowBlueprint;
    
    // Create the workflow
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

    // Create default form fields (Name, Email, Company Name)
    const defaultFields: Array<{
      workflowId: string;
      fieldKey: string;
      label: string;
      fieldType: 'TEXT' | 'EMAIL' | 'NUMBER';
      isRequired: boolean;
      displayOrder: number;
    }> = [
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

    // Add Budget field for Gatekeeper strategy (mapped as 'inbound-leads' in backend)
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

    // Create WorkflowNodes from blueprint steps
    const nodes: Array<{
      workflowId: string;
      reactFlowNodeId: string;
      nodeType: string;
      nodeCategory: 'trigger' | 'action' | 'logic' | 'utility';
      positionX: number;
      positionY: number;
      config: Record<string, any>;
      executionOrder: number;
    }> = [];
    const nodePositions: Record<string, { x: number; y: number }> = {};
    const nodeIdMap: Record<number, string> = {}; // Map step index to reactFlowNodeId

    blueprint.steps.forEach((step, index) => {
      const reactFlowNodeId = `node-${index + 1}`;
      nodeIdMap[index] = reactFlowNodeId;
      
      // Determine node category based on nodeType
      let nodeCategory: 'trigger' | 'action' | 'logic' | 'utility' = 'action';
      if (step.nodeType.startsWith('trigger_')) {
        nodeCategory = 'trigger';
      } else if (step.nodeType === 'delay' || step.nodeType === 'condition' || step.nodeType === 'wait_for_reply') {
        nodeCategory = 'logic';
      } else if (step.nodeType.startsWith('check_') || step.nodeType.startsWith('monitor_')) {
        nodeCategory = 'utility';
      }

      // Position nodes horizontally (spacing: 250px apart)
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

    // Create all nodes
    await this.prisma.workflowNode.createMany({
      data: nodes,
    });

    // Create WorkflowEdges to connect nodes sequentially
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

    // Create all edges
    if (edges.length > 0) {
      await this.prisma.workflowEdge.createMany({
        data: edges,
      });
    }

    // Return template with configuration schema and workflowId for next step
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

  /**
   * Step 2: Save form field configurations (Form Builder)
   */
  async saveFormFields(userId: string, dto: FormFieldsDto) {
    // Get user with workspace relations
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
      throw new NotFoundException('User not found');
    }

    // Find workflow and validate ownership
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: dto.workflowId },
      include: {
        workspace: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check if user has access to the workflow's workspace
    const hasAccess =
      user.ownedWorkspaces.some((ws) => ws.id === workflow.workspaceId) ||
      user.workspaceMemberships.some(
        (membership) => membership.workspaceId === workflow.workspaceId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this workflow',
      );
    }

    // Delete existing form fields for this workflow
    await this.prisma.formField.deleteMany({
      where: { workflowId: dto.workflowId },
    });

    // Map form fields to Prisma create data
    const formFieldsData = dto.formFields.map((field) => {
      const fieldData: any = {
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

      // Add options for DROPDOWN fields
      if (field.fieldType === 'DROPDOWN' && field.options) {
        fieldData.options = field.options as any;
      } else {
        fieldData.options = null;
      }

      // Add validation rules if provided
      if (field.validationRules) {
        fieldData.validationRules = field.validationRules as any;
      } else {
        fieldData.validationRules = null;
      }

      return fieldData;
    });

    // Create new form fields
    await this.prisma.formField.createMany({
      data: formFieldsData,
    });

    // Mark Step 2 (Form Builder) as complete in onboarding session
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

    // Fetch saved form fields
    const savedFields = await this.prisma.formField.findMany({
      where: { workflowId: dto.workflowId },
      orderBy: { displayOrder: 'asc' },
    });

    // Map to response format matching frontend interface
    const formFields = savedFields.map((field) => ({
      id: field.id,
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      placeholder: field.placeholder || undefined,
      helpText: field.helpText || undefined,
      isRequired: field.isRequired,
      options:
        field.options && field.fieldType === 'DROPDOWN'
          ? (field.options as Array<{ value: string; label: string }>)
          : undefined,
      validationRules: field.validationRules
        ? (field.validationRules as any)
        : undefined,
      displayOrder: field.displayOrder,
      createdAt: field.createdAt.toISOString(),
      updatedAt: field.updatedAt.toISOString(),
    }));

    // Generate available variables from field keys
    // Always include default field variables (name, email, companyName)
    const defaultFieldKeys = ['name', 'email', 'companyName'];
    const customFieldVariables = savedFields.map(
      (field) => `{${field.fieldKey}}`,
    );
    
    // Combine default and custom variables, ensuring uniqueness
    const defaultVariables = defaultFieldKeys.map((key) => `{${key}}`);
    const allVariables = [
      ...defaultVariables,
      ...customFieldVariables.filter(
        (v) => !defaultVariables.includes(v),
      ),
    ];
    const availableVariables = allVariables;

    this.logger.log(
      `Saved ${formFields.length} form fields for workflow ${dto.workflowId}`,
    );

    return {
      success: true,
      data: {
        workflowId: dto.workflowId,
        formFields,
        availableVariables,
      },
    };
  }

  /**
   * Get form fields for a workflow
   */
  async getFormFields(userId: string, workflowId: string) {
    // Get user with workspace relations
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
      throw new NotFoundException('User not found');
    }

    // Find workflow and validate ownership
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        workspace: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check if user has access to the workflow's workspace
    const hasAccess =
      user.ownedWorkspaces.some((ws) => ws.id === workflow.workspaceId) ||
      user.workspaceMemberships.some(
        (membership) => membership.workspaceId === workflow.workspaceId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this workflow',
      );
    }

    // Fetch form fields from database
    const savedFields = await this.prisma.formField.findMany({
      where: { workflowId },
      orderBy: { displayOrder: 'asc' },
    });

    // Map to response format matching frontend interface
    const formFields = savedFields.map((field) => ({
      id: field.id,
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      placeholder: field.placeholder || undefined,
      helpText: field.helpText || undefined,
      isRequired: field.isRequired,
      options:
        field.options && field.fieldType === 'DROPDOWN'
          ? (field.options as Array<{ value: string; label: string }>)
          : undefined,
      validationRules: field.validationRules
        ? (field.validationRules as any)
        : undefined,
      displayOrder: field.displayOrder,
      createdAt: field.createdAt.toISOString(),
      updatedAt: field.updatedAt.toISOString(),
    }));

    // Generate available variables from field keys
    // Always include default field variables (name, email, companyName)
    const defaultFieldKeys = ['name', 'email', 'companyName'];
    const customFieldVariables = savedFields.map(
      (field) => `{${field.fieldKey}}`,
    );
    
    // Combine default and custom variables, ensuring uniqueness
    const defaultVariables = defaultFieldKeys.map((key) => `{${key}}`);
    const allVariables = [
      ...defaultVariables,
      ...customFieldVariables.filter(
        (v) => !defaultVariables.includes(v),
      ),
    ];
    const availableVariables = allVariables;

    this.logger.log(
      `Retrieved ${formFields.length} form fields for workflow ${workflowId}`,
    );

    return {
      success: true,
      data: {
        workflowId,
        formFields,
        availableVariables,
      },
    };
  }

  /**
   * Step 2.5: Save Calendly link (deprecated - use saveSchedulingPreference instead)
   */
  async saveCalendlyLink(userId: string, dto: CalendlyDto) {
    // Get user with workspace relations
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
      throw new NotFoundException('User not found');
    }

    // Find workflow and validate ownership
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: dto.workflowId },
      include: {
        workspace: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check if user has access to the workflow's workspace
    const hasAccess =
      user.ownedWorkspaces.some((ws) => ws.id === workflow.workspaceId) ||
      user.workspaceMemberships.some(
        (membership) => membership.workspaceId === workflow.workspaceId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this workflow',
      );
    }

    // Save Calendly link using OAuth service
    await this.oauthService.saveCalendlyLink(
      workflow.workspaceId,
      dto.calendlyLink,
    );

    // Update workflow scheduling type
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

  /**
   * Step 2.5: Save scheduling preference (Calendly or Google Meet)
   */
  async saveSchedulingPreference(
    userId: string,
    dto: SchedulingPreferenceDto,
  ) {
    // Get user with workspace relations
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
      throw new NotFoundException('User not found');
    }

    // Find workflow and validate ownership
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: dto.workflowId },
      include: {
        workspace: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check if user has access to the workflow's workspace
    const hasAccess =
      user.ownedWorkspaces.some((ws) => ws.id === workflow.workspaceId) ||
      user.workspaceMemberships.some(
        (membership) => membership.workspaceId === workflow.workspaceId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this workflow',
      );
    }

    // Update workflow scheduling type
    await this.prisma.workflow.update({
      where: { id: dto.workflowId },
      data: {
        schedulingType: dto.schedulingType,
      },
    });

    // If Calendly, save the link
    if (dto.schedulingType === 'CALENDLY' && dto.calendlyLink) {
      await this.oauthService.saveCalendlyLink(
        workflow.workspaceId,
        dto.calendlyLink,
      );
    }

    // Mark Step 3 (Integrations) as complete in onboarding session
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

  /**
   * Step 4: Save configuration (Email Configuration / Mad Libs)
   */
  async saveConfiguration(userId: string, dto: ConfigurationDto) {
    // Get onboarding session
    const session = await this.getSession(userId);

    if (!session) {
      throw new BadRequestException('Onboarding session not found');
    }

    // Validate step progression - Step 2 (Form Builder) must be complete
    // Step 2 and Step 3 are optional, so we auto-complete them if not already done
    // This allows users to skip form builder or integrations and proceed
    let stepsToComplete = [...session.completedSteps];
    
    // Auto-complete Step 2 if missing (form builder might be skipped)
    if (!stepsToComplete.includes(2)) {
      stepsToComplete.push(2);
    }
    
    // Auto-complete Step 3 if missing (integrations are optional)
    if (!stepsToComplete.includes(3)) {
      stepsToComplete.push(3);
    }

    // Get unified configuration schema (no strategy needed)
    const schema = this.strategyTemplateService.getUnifiedConfigurationSchema();

    const validation = this.configurationService.validateConfiguration(
      dto.configuration,
      schema,
    );

    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    // Generate workflow preview using unified blueprint
    const blueprint = this.strategyTemplateService.getUnifiedWorkflowBlueprint();
    const workflowPreview = blueprint.steps.map((step, index) => ({
      order: index + 1,
      nodeType: step.nodeType,
      action: step.action,
      description: step.description,
      status: 'pending' as const,
    }));

    // Update session - Mark Step 4 (Email Configuration) as complete
    // Also ensure Step 3 is marked complete (since integrations are optional)
    const updatedSession = await this.prisma.onboardingSession.update({
      where: { id: session.id },
      data: {
        configurationData: dto.configuration as any,
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

  /**
   * Step 3 (Legacy): Confirm OAuth connection (Deprecated - OAuth now handled in Integrations step)
   */
  async confirmOAuthConnection(userId: string, dto: OAuthCompleteDto) {
    // Get onboarding session
    const session = await this.getSession(userId);

    if (!session) {
      throw new BadRequestException('Onboarding session not found');
    }

    // Validate step progression
    if (!session.completedSteps.includes(2)) {
      throw new ForbiddenException('Please complete Step 2 first');
    }

    // Verify OAuth credential exists
    const providerType =
      dto.provider === 'gmail' ? 'GOOGLE_EMAIL' : 'OUTLOOK_EMAIL';

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
      throw new BadRequestException('OAuth connection not found');
    }

    // Update session
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

  /**
   * Step 5: Generate simulation
   */
  async generateSimulation(userId: string, dto: SimulationDto) {
    // Get onboarding session by ID
    const session = await this.prisma.onboardingSession.findUnique({
      where: { id: dto.configurationId },
    });

    if (!session || session.userId !== userId) {
      throw new BadRequestException('Invalid configuration ID');
    }

    // Validate step progression - Step 4 (Email Configuration) must be complete
    if (!session.completedSteps.includes(4)) {
      throw new ForbiddenException('Please complete Step 4 (Email Configuration) first');
    }

    // Generate workflow preview using unified blueprint
    const blueprint = this.strategyTemplateService.getUnifiedWorkflowBlueprint();
    const workflowPreview = blueprint.steps.map((step, index) => ({
      order: index + 1,
      nodeType: step.nodeType,
      action: step.action,
      description: step.description,
      status: 'pending' as const,
    }));

    // Generate simulation with configuration data (use 'unified' as default strategyId)
    const strategyId = dto.strategyId || 'unified';
    const simulationData = this.simulationService.generateSimulation(
      strategyId,
      workflowPreview,
      session.configurationData as Record<string, any>,
    );

    // Update session to mark simulation viewed (step 5 complete)
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

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(userId: string) {
    const session = await this.getSession(userId);

    // Get user to check auth provider
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

    // Get Gmail OAuth connection status specifically
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

    // Get any OAuth connection (for backward compatibility)
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
            name:
              this.strategyTemplateService.getTemplate(
                session.selectedStrategyId,
              )?.name || '',
          }
        : undefined,
      configuration: session.configurationData as Record<string, any>,
      oauthConnection: oauthConnection
        ? {
            provider:
              oauthConnection.providerType === 'GOOGLE_EMAIL'
                ? 'gmail'
                : 'outlook',
            email: oauthConnection.providerEmail || '',
            isConnected: true,
          }
        : undefined,
    };
  }

  /**
   * Helper: Generate default workspace name from user data
   */
  private generateDefaultWorkspaceName(user: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  }): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}'s Workspace`;
    } else if (user.firstName) {
      return `${user.firstName}'s Workspace`;
    } else {
      // Extract name from email (e.g., "john" from "john@example.com")
      const emailName = user.email.split('@')[0];
      return `${emailName}'s Workspace`;
    }
  }

  /**
   * Helper: Create default workspace for user
   */
  private async createDefaultWorkspace(
    userId: string,
    user: { firstName?: string | null; lastName?: string | null; email: string },
  ) {
    const workspaceName = this.generateDefaultWorkspaceName(user);

    // Generate a unique slug
    const baseSlug = generateSlug(workspaceName);
    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Generate unique intake email ID (short UUID-like string)
    const generateIntakeEmailId = (): string => {
      return Math.random().toString(36).substring(2, 12);
    };
    let intakeEmailId = generateIntakeEmailId();
    while (
      await this.prisma.workspace.findUnique({ where: { intakeEmailId } })
    ) {
      intakeEmailId = generateIntakeEmailId();
    }

    // Create workspace and membership in a transaction
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

  /**
   * Helper: Get user's onboarding session
   */
  private async getSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedWorkspaces: true, workspaceMemberships: true },
    });

    if (!user) {
      return null;
    }

    let workspace =
      user.ownedWorkspaces[0] ||
      (user.workspaceMemberships[0]
        ? await this.prisma.workspace.findUnique({
            where: { id: user.workspaceMemberships[0].workspaceId },
          })
        : null);

    // Auto-create workspace if none exists (for getSession helper)
    if (!workspace) {
      workspace = await this.createDefaultWorkspace(userId, user);
      this.logger.log(
        `Auto-created default workspace ${workspace.id} for user ${userId} (via getSession)`,
      );
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
}
