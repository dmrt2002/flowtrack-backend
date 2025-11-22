import { PrismaService } from '../../../prisma/prisma.service';
import { StrategyTemplateService } from './strategy-template.service';
import { ConfigurationService } from './configuration.service';
import { SimulationService } from './simulation.service';
import { StrategySelectionDto, ConfigurationDto, OAuthCompleteDto, SimulationDto, FormFieldsDto } from '../dto';
export declare class OnboardingService {
    private prisma;
    private strategyTemplateService;
    private configurationService;
    private simulationService;
    private readonly logger;
    constructor(prisma: PrismaService, strategyTemplateService: StrategyTemplateService, configurationService: ConfigurationService, simulationService: SimulationService);
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
    saveConfiguration(userId: string, dto: ConfigurationDto): Promise<{
        success: boolean;
        data: {
            configurationId: string;
            configuration: Record<string, string | number | boolean>;
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
            };
        };
    }>;
    getOnboardingStatus(userId: string): Promise<{
        currentStep: number;
        completedSteps: never[];
        isComplete: boolean;
        selectedStrategy?: undefined;
        configuration?: undefined;
        oauthConnection?: undefined;
    } | {
        currentStep: number;
        completedSteps: number[];
        isComplete: boolean;
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
    private getSession;
}
