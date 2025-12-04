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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PitchConfigController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PitchConfigController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const unified_auth_guard_1 = require("../../../auth/guards/unified-auth.guard");
const user_decorator_1 = require("../../../auth/decorators/user.decorator");
const pitch_config_service_1 = require("../services/pitch-config.service");
const pitch_template_service_1 = require("../services/pitch-template.service");
let PitchConfigController = PitchConfigController_1 = class PitchConfigController {
    configService;
    templateService;
    logger = new common_1.Logger(PitchConfigController_1.name);
    constructor(configService, templateService) {
        this.configService = configService;
        this.templateService = templateService;
    }
    async getConfig(user) {
        const workspaceId = user.workspaces[0]?.id;
        if (!workspaceId) {
            throw new Error('No workspace found for user');
        }
        return this.configService.getConfig(workspaceId);
    }
    async getAllTemplates(user) {
        const workspaceId = user.workspaces[0]?.id;
        if (!workspaceId) {
            throw new Error('No workspace found for user');
        }
        return this.configService.getAllTemplates(workspaceId);
    }
    async updateQuickSettings(user, quickSettings) {
        const workspaceId = user.workspaces[0]?.id;
        if (!workspaceId) {
            throw new Error('No workspace found for user');
        }
        this.logger.log(`Updating quick settings for workspace ${workspaceId}`);
        return this.configService.updateQuickSettings(workspaceId, quickSettings);
    }
    async selectTemplate(user, body) {
        const workspaceId = user.workspaces[0]?.id;
        if (!workspaceId) {
            throw new Error('No workspace found for user');
        }
        this.logger.log(`Selecting template ${body.templateId} for workspace ${workspaceId}`);
        return this.configService.selectTemplate(workspaceId, body.templateId);
    }
    async createTemplate(user, template) {
        const workspaceId = user.workspaces[0]?.id;
        if (!workspaceId) {
            throw new Error('No workspace found for user');
        }
        this.logger.log(`Creating custom template for workspace ${workspaceId}`);
        return this.configService.createCustomTemplate(workspaceId, template);
    }
    async updateTemplate(user, templateId, updates) {
        const workspaceId = user.workspaces[0]?.id;
        if (!workspaceId) {
            throw new Error('No workspace found for user');
        }
        this.logger.log(`Updating template ${templateId} for workspace ${workspaceId}`);
        return this.configService.updateCustomTemplate(workspaceId, templateId, updates);
    }
    async deleteTemplate(user, templateId) {
        const workspaceId = user.workspaces[0]?.id;
        if (!workspaceId) {
            throw new Error('No workspace found for user');
        }
        this.logger.log(`Deleting template ${templateId} for workspace ${workspaceId}`);
        return this.configService.deleteCustomTemplate(workspaceId, templateId);
    }
    async updateAdvancedConfig(user, advancedConfig) {
        const workspaceId = user.workspaces[0]?.id;
        if (!workspaceId) {
            throw new Error('No workspace found for user');
        }
        this.logger.log(`Updating advanced config for workspace ${workspaceId}`);
        return this.configService.updateAdvancedConfig(workspaceId, advancedConfig);
    }
    async validateTemplate(body) {
        return this.templateService.validateTemplate(body.template);
    }
    async resetToDefault(user) {
        const workspaceId = user.workspaces[0]?.id;
        if (!workspaceId) {
            throw new Error('No workspace found for user');
        }
        this.logger.log(`Resetting config to default for workspace ${workspaceId}`);
        return this.configService.resetToDefault(workspaceId);
    }
};
exports.PitchConfigController = PitchConfigController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get workspace pitch configuration',
        description: 'Retrieves the current pitch generation configuration for the workspace',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Configuration retrieved successfully',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PitchConfigController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Get)('templates'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all pitch templates',
        description: 'Retrieves all available templates including built-in and custom templates',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Templates retrieved successfully',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PitchConfigController.prototype, "getAllTemplates", null);
__decorate([
    (0, common_1.Patch)('quick-settings'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update quick settings',
        description: 'Updates tone, length, and focus areas for pitch generation',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Quick settings updated successfully',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PitchConfigController.prototype, "updateQuickSettings", null);
__decorate([
    (0, common_1.Post)('select-template'),
    (0, swagger_1.ApiOperation)({
        summary: 'Select active template',
        description: 'Sets the active template for pitch generation',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Template selected successfully',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PitchConfigController.prototype, "selectTemplate", null);
__decorate([
    (0, common_1.Post)('templates'),
    (0, swagger_1.ApiOperation)({
        summary: 'Create custom template',
        description: 'Creates a new custom pitch template',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Custom template created successfully',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PitchConfigController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Patch)('templates/:templateId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update custom template',
        description: 'Updates an existing custom template',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Custom template updated successfully',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('templateId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PitchConfigController.prototype, "updateTemplate", null);
__decorate([
    (0, common_1.Delete)('templates/:templateId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete custom template',
        description: 'Deletes a custom template',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Custom template deleted successfully',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PitchConfigController.prototype, "deleteTemplate", null);
__decorate([
    (0, common_1.Patch)('advanced'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update advanced configuration',
        description: 'Updates advanced pitch generation settings including custom prompts',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Advanced config updated successfully',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PitchConfigController.prototype, "updateAdvancedConfig", null);
__decorate([
    (0, common_1.Post)('validate-template'),
    (0, swagger_1.ApiOperation)({
        summary: 'Validate template syntax',
        description: 'Validates Handlebars template syntax without saving',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Template validation result',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PitchConfigController.prototype, "validateTemplate", null);
__decorate([
    (0, common_1.Post)('reset'),
    (0, swagger_1.ApiOperation)({
        summary: 'Reset to default configuration',
        description: 'Resets all pitch configuration to default values',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Configuration reset successfully',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PitchConfigController.prototype, "resetToDefault", null);
exports.PitchConfigController = PitchConfigController = PitchConfigController_1 = __decorate([
    (0, swagger_1.ApiTags)('Pitch Configuration'),
    (0, common_1.Controller)('pitch-config'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [pitch_config_service_1.PitchConfigService,
        pitch_template_service_1.PitchTemplateService])
], PitchConfigController);
//# sourceMappingURL=pitch-config.controller.js.map