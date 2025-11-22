import { Injectable } from '@nestjs/common';
import {
  STRATEGY_TEMPLATES,
  StrategyTemplate,
  getAllStrategyTemplates,
  getStrategyTemplate,
  isValidStrategyId,
  ConfigSchema,
} from '../constants/strategy-templates';

@Injectable()
export class StrategyTemplateService {
  /**
   * Get all available strategy templates
   */
  getAllTemplates(): StrategyTemplate[] {
    return getAllStrategyTemplates();
  }

  /**
   * Get a specific strategy template by ID
   */
  getTemplate(strategyId: string): StrategyTemplate | null {
    return getStrategyTemplate(strategyId);
  }

  /**
   * Get configuration schema for a strategy
   */
  getConfigurationSchema(strategyId: string): ConfigSchema | null {
    const template = this.getTemplate(strategyId);
    return template ? template.configSchema : null;
  }

  /**
   * Validate strategy ID
   */
  isValid(strategyId: string): boolean {
    return isValidStrategyId(strategyId);
  }

  /**
   * Get workflow blueprint for a strategy
   */
  getWorkflowBlueprint(strategyId: string) {
    const template = this.getTemplate(strategyId);
    return template ? template.workflowBlueprint : null;
  }
}
