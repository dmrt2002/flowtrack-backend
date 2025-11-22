import { StrategyTemplate, ConfigSchema } from '../constants/strategy-templates';
export declare class StrategyTemplateService {
    getAllTemplates(): StrategyTemplate[];
    getTemplate(strategyId: string): StrategyTemplate | null;
    getConfigurationSchema(strategyId: string): ConfigSchema | null;
    isValid(strategyId: string): boolean;
    getWorkflowBlueprint(strategyId: string): {
        triggerType: string;
        steps: Array<{
            nodeType: string;
            action: string;
            description: string;
        }>;
    } | null;
}
