"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationService = void 0;
const common_1 = require("@nestjs/common");
const strategy_template_service_1 = require("./strategy-template.service");
let ConfigurationService = class ConfigurationService {
    strategyTemplateService;
    constructor(strategyTemplateService) {
        this.strategyTemplateService = strategyTemplateService;
    }
    validateConfiguration(configuration, schema) {
        const errors = [];
        for (const field of schema.fields) {
            const value = configuration[field.id];
            if (field.required && (value === undefined || value === null || value === '')) {
                errors.push({
                    field: field.id,
                    message: `${field.label} is required`,
                });
                continue;
            }
            if (!field.required && (value === undefined || value === null || value === '')) {
                continue;
            }
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
    generateWorkflowPreview(strategyId, configuration) {
        const blueprint = this.strategyTemplateService.getWorkflowBlueprint(strategyId);
        if (!blueprint) {
            throw new common_1.BadRequestException('Invalid strategy ID');
        }
        return blueprint.steps.map((step, index) => {
            let action = step.action;
            let description = step.description;
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
                status: 'pending',
            };
        });
    }
};
exports.ConfigurationService = ConfigurationService;
exports.ConfigurationService = ConfigurationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [strategy_template_service_1.StrategyTemplateService])
], ConfigurationService);
//# sourceMappingURL=configuration.service.js.map