import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigSchema, ConfigField } from '../constants/strategy-templates';
import { StrategyTemplateService } from './strategy-template.service';

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

@Injectable()
export class ConfigurationService {
  constructor(private strategyTemplateService: StrategyTemplateService) {}

  /**
   * Validate configuration against schema
   */
  validateConfiguration(
    configuration: Record<string, any>,
    schema: ConfigSchema,
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const field of schema.fields) {
      const value = configuration[field.id];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: field.id,
          message: `${field.label} is required`,
        });
        continue;
      }

      // Skip validation if field is empty and not required
      if (!field.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type-specific validation
      if (field.type === 'text' || field.type === 'textarea') {
        const strValue = String(value);

        if (field.validation?.minLength && strValue.length < field.validation.minLength) {
          errors.push({
            field: field.id,
            message: `Must be at least ${field.validation.minLength} characters`,
          });
        }

        if (field.validation?.maxLength && strValue.length > field.validation.maxLength) {
          errors.push({
            field: field.id,
            message: `Must be less than ${field.validation.maxLength} characters`,
          });
        }

        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(strValue)) {
            errors.push({
              field: field.id,
              message: 'Invalid format',
            });
          }
        }
      }

      if (field.type === 'number') {
        const numValue = Number(value);

        if (isNaN(numValue)) {
          errors.push({
            field: field.id,
            message: 'Must be a valid number',
          });
          continue;
        }

        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          errors.push({
            field: field.id,
            message: `Must be at least ${field.validation.min}`,
          });
        }

        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          errors.push({
            field: field.id,
            message: `Must be less than ${field.validation.max}`,
          });
        }
      }

      if (field.type === 'select' && field.options) {
        const validOptions = field.options.map((opt) => opt.value);
        if (!validOptions.includes(value)) {
          errors.push({
            field: field.id,
            message: 'Invalid option selected',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate workflow preview steps based on strategy and configuration
   */
  generateWorkflowPreview(strategyId: string, configuration: Record<string, any>) {
    const blueprint = this.strategyTemplateService.getWorkflowBlueprint(strategyId);

    if (!blueprint) {
      throw new BadRequestException('Invalid strategy ID');
    }

    // Replace placeholders in workflow steps with actual config values
    return blueprint.steps.map((step, index) => {
      let action = step.action;
      let description = step.description;

      // Replace placeholders like {responseTime} with actual values
      Object.keys(configuration).forEach((key) => {
        const placeholder = `{${key}}`;
        const value = configuration[key];
        action = action.replace(placeholder, String(value));
        description = description.replace(placeholder, String(value));
      });

      return {
        order: index + 1,
        nodeType: step.nodeType,
        action,
        description,
        status: 'pending' as const,
      };
    });
  }
}
