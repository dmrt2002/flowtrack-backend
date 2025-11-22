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
import { generateSlug } from '../../../common/utils/slug.util';
import {
  StrategySelectionDto,
  ConfigurationDto,
  OAuthCompleteDto,
  SimulationDto,
  FormFieldsDto,
} from '../dto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private strategyTemplateService: StrategyTemplateService,
    private configurationService: ConfigurationService,
    private simulationService: SimulationService,
  ) {}

  /**
   * Step 1: Save strategy selection
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
    await this.prisma.formField.createMany({
      data: [
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
      ],
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
   * Step 2a: Save form field configurations
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
   * Step 3: Save configuration (Email Configuration / Mad Libs)
   */
  async saveConfiguration(userId: string, dto: ConfigurationDto) {
    // Get onboarding session
    const session = await this.getSession(userId);

    if (!session) {
      throw new BadRequestException('Onboarding session not found');
    }

    // Validate step progression
    if (!session.completedSteps.includes(1)) {
      throw new ForbiddenException('Please complete Step 1 first');
    }

    // Validate configuration against schema
    const schema = this.strategyTemplateService.getConfigurationSchema(
      dto.strategyId,
    );

    if (!schema) {
      throw new BadRequestException('Invalid strategy ID');
    }

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

    // Generate workflow preview
    const workflowPreview = this.configurationService.generateWorkflowPreview(
      dto.strategyId,
      dto.configuration,
    );

    // Update session
    const updatedSession = await this.prisma.onboardingSession.update({
      where: { id: session.id },
      data: {
        configurationData: dto.configuration as any,
        currentStep: 3,
        completedSteps: [...new Set([...session.completedSteps, 2])],
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
   * Step 3: Confirm OAuth connection
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
   * Step 4: Generate simulation
   */
  async generateSimulation(userId: string, dto: SimulationDto) {
    // Get onboarding session by ID
    const session = await this.prisma.onboardingSession.findUnique({
      where: { id: dto.configurationId },
    });

    if (!session || session.userId !== userId) {
      throw new BadRequestException('Invalid configuration ID');
    }

    // Validate step progression
    if (!session.completedSteps.includes(3)) {
      throw new ForbiddenException('Please complete Step 3 first');
    }

    // Generate workflow preview
    const workflowPreview = this.configurationService.generateWorkflowPreview(
      dto.strategyId,
      session.configurationData as Record<string, any>,
    );

    // Generate simulation
    const simulationData = this.simulationService.generateSimulation(
      dto.strategyId,
      workflowPreview,
    );

    // Update session to mark simulation viewed (step 4 complete)
    await this.prisma.onboardingSession.update({
      where: { id: session.id },
      data: {
        currentStep: 4,
        completedSteps: [...new Set([...session.completedSteps, 4])],
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

    if (!session) {
      return {
        currentStep: 1,
        completedSteps: [],
        isComplete: false,
      };
    }

    // Get OAuth connection status
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
