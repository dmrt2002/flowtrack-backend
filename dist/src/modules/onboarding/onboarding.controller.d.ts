import { OnboardingService } from './services/onboarding.service';
import type { StrategySelectionDto, ConfigurationDto, OAuthCompleteDto, SimulationDto, FormFieldsDto, CalendlyDto, SchedulingPreferenceDto, ActivateWorkflowDto } from './dto';
export declare class OnboardingController {
    private onboardingService;
    constructor(onboardingService: OnboardingService);
    initOnboarding(user: any): Promise<{
        success: boolean;
        data: {
            workflowId: string;
            workspaceId: string;
            configurationSchema: import("./constants/strategy-templates").ConfigSchema;
        };
    }>;
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
                formHeaderRich: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
                showFormHeader: boolean;
                formDescription: string | null;
                formDescriptionRich: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
                showFormDescription: boolean;
                submitButtonText: any;
                successMessage: any;
                redirectUrl: any;
            };
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
    saveCalendlyLink(user: any, dto: CalendlyDto): Promise<{
        success: boolean;
        message: string;
        data: {
            calendlyLink: string;
        };
    }>;
    saveSchedulingPreference(user: any, dto: SchedulingPreferenceDto): Promise<{
        success: boolean;
        message: string;
        data: {
            schedulingType: "CALENDLY" | "GOOGLE_MEET";
            calendlyLink: string | null;
        };
    }>;
    saveConfiguration(user: any, dto: ConfigurationDto): Promise<{
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
                logicSteps: import("./services/simulation.service").StrategyLogicStep[];
                testLeads: import("./services/simulation.service").StrategyTestLead[];
                strategyId: "inbound-leads" | "outbound-sales" | "customer-nurture" | "gatekeeper" | "nurturer" | "closer";
            };
        };
    }>;
    getStatus(user: any): Promise<{
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
    activateWorkflow(user: any, dto: ActivateWorkflowDto): Promise<{
        success: boolean;
        data: {
            workflowId: string;
            publicFormUrl: string;
            status: "active";
            activatedAt: string;
        };
    }>;
}
