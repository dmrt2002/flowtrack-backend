import { ConfigSchema } from '../constants/strategy-templates';
import { StrategyTemplateService } from './strategy-template.service';
interface ValidationError {
    field: string;
    message: string;
}
interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
export declare class ConfigurationService {
    private strategyTemplateService;
    constructor(strategyTemplateService: StrategyTemplateService);
    validateConfiguration(configuration: Record<string, any>, schema: ConfigSchema): ValidationResult;
    generateWorkflowPreview(strategyId: string, configuration: Record<string, any>): {
        order: number;
        nodeType: string;
        action: string;
        description: string;
        status: "pending";
    }[];
}
export {};
