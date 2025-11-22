export interface ConfigFieldValidation {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
}
export interface ConfigField {
    id: string;
    type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox';
    label: string;
    placeholder?: string;
    required: boolean;
    validation?: ConfigFieldValidation;
    options?: Array<{
        value: string;
        label: string;
    }>;
    suffix?: string;
    variables?: string[];
    rows?: number;
    helpText?: string;
}
export interface ConfigSchema {
    fields: ConfigField[];
}
export interface StrategyTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    templateId: string;
    estimatedSetupTime: number;
    features: string[];
    configSchema: ConfigSchema;
    workflowBlueprint: {
        triggerType: string;
        steps: Array<{
            nodeType: string;
            action: string;
            description: string;
        }>;
    };
}
export declare const STRATEGY_TEMPLATES: Record<string, StrategyTemplate>;
export type StrategyId = 'inbound-leads' | 'outbound-sales' | 'customer-nurture' | 'gatekeeper' | 'nurturer' | 'closer';
export declare function getStrategyTemplate(id: string): StrategyTemplate | null;
export declare function getAllStrategyTemplates(): StrategyTemplate[];
export declare function isValidStrategyId(id: string): id is StrategyId;
