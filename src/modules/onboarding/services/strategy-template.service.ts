import { Injectable } from '@nestjs/common';
import {
  STRATEGY_TEMPLATES,
  StrategyTemplate,
  getAllStrategyTemplates,
  getStrategyTemplate,
  isValidStrategyId,
  ConfigSchema,
  UNIFIED_CONFIG_SCHEMA,
  UNIFIED_WORKFLOW_BLUEPRINT,
} from '../constants/strategy-templates';

@Injectable()
export class StrategyTemplateService {
  /**
   * Get all available strategy templates (legacy - for backward compatibility)
   * @deprecated Use getUnifiedConfigurationSchema() instead
   */
  getAllTemplates(): StrategyTemplate[] {
    return getAllStrategyTemplates();
  }

  /**
   * Get a specific strategy template by ID (legacy - for backward compatibility)
   * @deprecated Use getUnifiedConfigurationSchema() instead
   */
  getTemplate(strategyId: string): StrategyTemplate | null {
    return getStrategyTemplate(strategyId);
  }

  /**
   * Get unified configuration schema (used for all workflows)
   */
  getUnifiedConfigurationSchema(): ConfigSchema {
    return UNIFIED_CONFIG_SCHEMA;
  }

  /**
   * Get unified workflow blueprint (used for all workflows)
   */
  getUnifiedWorkflowBlueprint() {
    return UNIFIED_WORKFLOW_BLUEPRINT;
  }

  /**
   * Get configuration schema for a strategy (legacy - for backward compatibility)
   * @deprecated Use getUnifiedConfigurationSchema() instead
   */
  getConfigurationSchema(strategyId: string): ConfigSchema | null {
    // For new unified workflow, return unified schema
    // For legacy strategies, return their specific schema
    const template = this.getTemplate(strategyId);
    return template ? template.configSchema : null;
  }

  /**
   * Validate strategy ID (legacy - for backward compatibility)
   */
  isValid(strategyId: string): boolean {
    return isValidStrategyId(strategyId);
  }

  /**
   * Get workflow blueprint for a strategy (legacy - for backward compatibility)
   * @deprecated Use getUnifiedWorkflowBlueprint() instead
   */
  getWorkflowBlueprint(strategyId: string) {
    // For new unified workflow, return unified blueprint
    // For legacy strategies, return their specific blueprint
    const template = this.getTemplate(strategyId);
    return template ? template.workflowBlueprint : null;
  }
}
