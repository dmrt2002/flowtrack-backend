"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyTemplateService = void 0;
const common_1 = require("@nestjs/common");
const strategy_templates_1 = require("../constants/strategy-templates");
let StrategyTemplateService = class StrategyTemplateService {
    getAllTemplates() {
        return (0, strategy_templates_1.getAllStrategyTemplates)();
    }
    getTemplate(strategyId) {
        return (0, strategy_templates_1.getStrategyTemplate)(strategyId);
    }
    getConfigurationSchema(strategyId) {
        const template = this.getTemplate(strategyId);
        return template ? template.configSchema : null;
    }
    isValid(strategyId) {
        return (0, strategy_templates_1.isValidStrategyId)(strategyId);
    }
    getWorkflowBlueprint(strategyId) {
        const template = this.getTemplate(strategyId);
        return template ? template.workflowBlueprint : null;
    }
};
exports.StrategyTemplateService = StrategyTemplateService;
exports.StrategyTemplateService = StrategyTemplateService = __decorate([
    (0, common_1.Injectable)()
], StrategyTemplateService);
//# sourceMappingURL=strategy-template.service.js.map