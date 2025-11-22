import { OnboardingService } from './services/onboarding.service';
import type { StrategySelectionDto, ConfigurationDto, OAuthCompleteDto, SimulationDto, FormFieldsDto } from './dto';
export declare class OnboardingController {
    private onboardingService;
    constructor(onboardingService: OnboardingService);
    selectStrategy(user: any, dto: StrategySelectionDto): Promise<{
        success: boolean;
        data: {
            workflowId: string;
            strategyId: "inbound-leads" | "outbound-sales" | "customer-nurture";
            strategyName: string;
            templateId: string;
            configurationSchema: import("./constants/strategy-templates").ConfigSchema;
        };
    }>;
    getFormFields(user: any, workflowId: string): Promise<{
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
    saveFormFields(user: any, dto: FormFieldsDto): Promise<{
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
    saveConfiguration(user: any, dto: ConfigurationDto): Promise<{
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
    confirmOAuth(user: any, dto: OAuthCompleteDto): Promise<{
        success: boolean;
        data: {
            provider: "gmail" | "outlook";
            email: string;
            connectedAt: string;
            permissions: string[];
        };
    }>;
    generateSimulation(user: any, dto: SimulationDto): Promise<{
        success: boolean;
        data: {
            simulationData: {
                sampleLeads: import("./services/simulation.service").SimulationLead[];
                actionsPerformed: import("./services/simulation.service").SimulationAction[];
                metrics: import("./services/simulation.service").SimulationMetrics;
            };
        };
    }>;
    getStatus(user: any): Promise<{
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
}
