import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StrategyTemplateService } from './strategy-template.service';
import { ConfigurationService } from './configuration.service';
import { SimulationService } from './simulation.service';
import { OAuthService } from '../../oauth/oauth.service';
import { StrategySelectionDto, ConfigurationDto, OAuthCompleteDto, SimulationDto, FormFieldsDto, CalendlyDto, SchedulingPreferenceDto, ActivateWorkflowDto } from '../dto';
export declare class OnboardingService {
    private prisma;
    private strategyTemplateService;
    private configurationService;
    private simulationService;
    private oauthService;
    private readonly logger;
    constructor(prisma: PrismaService, strategyTemplateService: StrategyTemplateService, configurationService: ConfigurationService, simulationService: SimulationService, oauthService: OAuthService);
    getOrCreateWorkflow(userId: string): Promise<{
        success: boolean;
        data: {
            workflowId: string;
            workspaceId: string;
            configurationSchema: import("../constants/strategy-templates").ConfigSchema;
        };
    }>;
    saveStrategy(userId: string, dto: StrategySelectionDto): Promise<{
        success: boolean;
        data: {
            workflowId: string;
            strategyId: "inbound-leads" | "outbound-sales" | "customer-nurture";
            strategyName: string;
            templateId: string;
            configurationSchema: import("../constants/strategy-templates").ConfigSchema;
        };
    }>;
    saveFormFields(userId: string, dto: FormFieldsDto): Promise<{
        success: boolean;
        data: {
            workflowId: string;
            formFields: {
                id: string;
                fieldKey: string;
                label: string;
                fieldType: import("@prisma/client").$Enums.FieldType;
                placeholder: string | undefined;
                helpText: string | undefined;
                isRequired: boolean;
                options: {
                    value: string;
                    label: string;
                }[] | undefined;
                validationRules: any;
                displayOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            availableVariables: string[];
        };
    }>;
    getFormFields(userId: string, workflowId: string): Promise<{
        success: boolean;
        data: {
            workflowId: string;
            workflowName: string;
            workflowStatus: import("@prisma/client").$Enums.WorkflowStatus;
            formFields: {
                id: string;
                fieldKey: string;
                label: string;
                fieldType: import("@prisma/client").$Enums.FieldType;
                placeholder: string | undefined;
                helpText: string | undefined;
                isRequired: boolean;
                options: {
                    value: string;
                    label: string;
                }[] | undefined;
                validationRules: any;
                displayOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            availableVariables: string[];
            settings: {
                formHeader: string | null;
                formHeaderRich: string | number | true | Prisma.JsonObject | Prisma.JsonArray | null;
                showFormHeader: boolean;
                formDescription: string | null;
                formDescriptionRich: string | number | true | Prisma.JsonObject | Prisma.JsonArray | null;
                showFormDescription: boolean;
                submitButtonText: any;
                successMessage: any;
                redirectUrl: any;
            };
        };
    }>;
    saveCalendlyLink(userId: string, dto: CalendlyDto): Promise<{
        success: boolean;
        message: string;
        data: {
            calendlyLink: string;
        };
    }>;
    saveSchedulingPreference(userId: string, dto: SchedulingPreferenceDto): Promise<{
        success: boolean;
        message: string;
        data: {
            schedulingType: "CALENDLY" | "GOOGLE_MEET";
            calendlyLink: string | null;
        };
    }>;
    saveConfiguration(userId: string, dto: ConfigurationDto): Promise<{
        success: boolean;
        data: {
            configurationId: string;
            configuration: Record<string, string | number | boolean | {
                field: string;
                operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
                value: number;
                currency: "USD" | "INR";
            }>;
            workflowPreview: {
                steps: {
                    order: number;
                    nodeType: string;
                    action: string;
                    description: string;
                    status: "pending";
                }[];
            };
        };
    }>;
    confirmOAuthConnection(userId: string, dto: OAuthCompleteDto): Promise<{
        success: boolean;
        data: {
            provider: "gmail" | "outlook";
            email: string;
            connectedAt: string;
            permissions: string[];
        };
    }>;
    generateSimulation(userId: string, dto: SimulationDto): Promise<{
        success: boolean;
        data: {
            simulationData: {
                sampleLeads: import("./simulation.service").SimulationLead[];
                actionsPerformed: import("./simulation.service").SimulationAction[];
                metrics: import("./simulation.service").SimulationMetrics;
                logicSteps: import("./simulation.service").StrategyLogicStep[];
                testLeads: import("./simulation.service").StrategyTestLead[];
                strategyId: "inbound-leads" | "outbound-sales" | "customer-nurture" | "gatekeeper" | "nurturer" | "closer";
            };
        };
    }>;
    getOnboardingStatus(userId: string): Promise<{
        currentStep: number;
        completedSteps: never[];
        isComplete: boolean;
        userAuthProvider: import("@prisma/client").$Enums.AuthProvider;
        signedUpWithGoogle: boolean;
        gmailConnected: boolean;
        gmailEmail: null;
        selectedStrategy?: undefined;
        configuration?: undefined;
        oauthConnection?: undefined;
    } | {
        currentStep: number;
        completedSteps: number[];
        isComplete: boolean;
        userAuthProvider: import("@prisma/client").$Enums.AuthProvider;
        signedUpWithGoogle: boolean;
        gmailConnected: boolean;
        gmailEmail: string | null;
        selectedStrategy: {
            id: string;
            name: string;
        } | undefined;
        configuration: Record<string, any>;
        oauthConnection: {
            provider: string;
            email: string;
            isConnected: boolean;
        } | undefined;
    }>;
    private generateDefaultWorkspaceName;
    private createDefaultWorkspace;
    activateWorkflow(userId: string, dto: ActivateWorkflowDto): Promise<{
        success: boolean;
        data: {
            workflowId: string;
            publicFormUrl: string;
            status: "active";
            activatedAt: string;
        };
    }>;
    private getSession;
}
