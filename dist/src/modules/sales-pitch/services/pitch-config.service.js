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
var PitchConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PitchConfigService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const pitch_config_types_1 = require("../types/pitch-config.types");
let PitchConfigService = PitchConfigService_1 = class PitchConfigService {
    prisma;
    logger = new common_1.Logger(PitchConfigService_1.name);
    SETTINGS_KEY = 'pitchConfig';
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getConfig(workspaceId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { settings: true },
        });
        if (!workspace) {
            throw new common_1.NotFoundException('Workspace not found');
        }
        const settings = workspace.settings;
        const pitchConfig = settings[this.SETTINGS_KEY];
        if (!pitchConfig) {
            return { ...pitch_config_types_1.DEFAULT_PITCH_CONFIG };
        }
        return {
            ...pitch_config_types_1.DEFAULT_PITCH_CONFIG,
            ...pitchConfig,
            quickSettings: {
                ...pitch_config_types_1.DEFAULT_PITCH_CONFIG.quickSettings,
                ...pitchConfig.quickSettings,
            },
            advancedConfig: {
                ...pitch_config_types_1.DEFAULT_PITCH_CONFIG.advancedConfig,
                ...pitchConfig.advancedConfig,
            },
        };
    }
    async updateQuickSettings(workspaceId, quickSettings) {
        const currentConfig = await this.getConfig(workspaceId);
        const updatedConfig = {
            ...currentConfig,
            quickSettings: {
                ...currentConfig.quickSettings,
                ...quickSettings,
            },
        };
        await this.saveConfig(workspaceId, updatedConfig);
        this.logger.log(`Updated quick settings for workspace ${workspaceId}`);
        return updatedConfig;
    }
    async selectTemplate(workspaceId, templateId) {
        const currentConfig = await this.getConfig(workspaceId);
        const templateExists = pitch_config_types_1.BUILT_IN_TEMPLATES.some((t) => t.id === templateId) ||
            currentConfig.customTemplates.some((t) => t.id === templateId);
        if (!templateExists) {
            throw new common_1.NotFoundException('Template not found');
        }
        const updatedConfig = {
            ...currentConfig,
            selectedTemplateId: templateId,
        };
        await this.saveConfig(workspaceId, updatedConfig);
        this.logger.log(`Selected template ${templateId} for workspace ${workspaceId}`);
        return updatedConfig;
    }
    async createCustomTemplate(workspaceId, template) {
        const currentConfig = await this.getConfig(workspaceId);
        const newTemplate = {
            ...template,
            id: `custom-${Date.now()}`,
            category: 'custom',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const updatedConfig = {
            ...currentConfig,
            customTemplates: [...currentConfig.customTemplates, newTemplate],
        };
        await this.saveConfig(workspaceId, updatedConfig);
        this.logger.log(`Created custom template for workspace ${workspaceId}`);
        return updatedConfig;
    }
    async updateCustomTemplate(workspaceId, templateId, updates) {
        const currentConfig = await this.getConfig(workspaceId);
        const templateIndex = currentConfig.customTemplates.findIndex((t) => t.id === templateId);
        if (templateIndex === -1) {
            throw new common_1.NotFoundException('Custom template not found');
        }
        currentConfig.customTemplates[templateIndex] = {
            ...currentConfig.customTemplates[templateIndex],
            ...updates,
            updatedAt: new Date(),
        };
        await this.saveConfig(workspaceId, currentConfig);
        this.logger.log(`Updated custom template ${templateId} for workspace ${workspaceId}`);
        return currentConfig;
    }
    async deleteCustomTemplate(workspaceId, templateId) {
        const currentConfig = await this.getConfig(workspaceId);
        const updatedConfig = {
            ...currentConfig,
            customTemplates: currentConfig.customTemplates.filter((t) => t.id !== templateId),
        };
        if (currentConfig.selectedTemplateId === templateId) {
            updatedConfig.selectedTemplateId = pitch_config_types_1.BUILT_IN_TEMPLATES[0].id;
        }
        await this.saveConfig(workspaceId, updatedConfig);
        this.logger.log(`Deleted custom template ${templateId} for workspace ${workspaceId}`);
        return updatedConfig;
    }
    async updateAdvancedConfig(workspaceId, advancedConfig) {
        const currentConfig = await this.getConfig(workspaceId);
        const updatedConfig = {
            ...currentConfig,
            advancedConfig: {
                ...currentConfig.advancedConfig,
                ...advancedConfig,
            },
        };
        await this.saveConfig(workspaceId, updatedConfig);
        this.logger.log(`Updated advanced config for workspace ${workspaceId}`);
        return updatedConfig;
    }
    async getAllTemplates(workspaceId) {
        const config = await this.getConfig(workspaceId);
        return [...pitch_config_types_1.BUILT_IN_TEMPLATES, ...config.customTemplates];
    }
    async resetToDefault(workspaceId) {
        const defaultConfig = { ...pitch_config_types_1.DEFAULT_PITCH_CONFIG };
        await this.saveConfig(workspaceId, defaultConfig);
        this.logger.log(`Reset pitch config to default for workspace ${workspaceId}`);
        return defaultConfig;
    }
    async saveConfig(workspaceId, config) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { settings: true },
        });
        if (!workspace) {
            throw new common_1.NotFoundException('Workspace not found');
        }
        const settings = workspace.settings;
        settings[this.SETTINGS_KEY] = config;
        await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { settings },
        });
    }
};
exports.PitchConfigService = PitchConfigService;
exports.PitchConfigService = PitchConfigService = PitchConfigService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PitchConfigService);
//# sourceMappingURL=pitch-config.service.js.map