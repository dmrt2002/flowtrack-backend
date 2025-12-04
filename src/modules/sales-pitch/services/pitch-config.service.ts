/**
 * Pitch Configuration Service
 *
 * Manages workspace-level pitch configuration in workspace.settings JSONB field
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PitchConfiguration,
  PitchTemplate,
  PitchQuickSettings,
  PitchAdvancedConfig,
  DEFAULT_PITCH_CONFIG,
  BUILT_IN_TEMPLATES,
} from '../types/pitch-config.types';

@Injectable()
export class PitchConfigService {
  private readonly logger = new Logger(PitchConfigService.name);
  private readonly SETTINGS_KEY = 'pitchConfig';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get pitch configuration for workspace
   */
  async getConfig(workspaceId: string): Promise<PitchConfiguration> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const settings = workspace.settings as any;
    const pitchConfig = settings[this.SETTINGS_KEY];

    if (!pitchConfig) {
      // Return default config if not set
      return { ...DEFAULT_PITCH_CONFIG };
    }

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_PITCH_CONFIG,
      ...pitchConfig,
      quickSettings: {
        ...DEFAULT_PITCH_CONFIG.quickSettings,
        ...pitchConfig.quickSettings,
      },
      advancedConfig: {
        ...DEFAULT_PITCH_CONFIG.advancedConfig,
        ...pitchConfig.advancedConfig,
      },
    };
  }

  /**
   * Update quick settings
   */
  async updateQuickSettings(
    workspaceId: string,
    quickSettings: Partial<PitchQuickSettings>,
  ): Promise<PitchConfiguration> {
    const currentConfig = await this.getConfig(workspaceId);

    const updatedConfig: PitchConfiguration = {
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

  /**
   * Select a template
   */
  async selectTemplate(
    workspaceId: string,
    templateId: string,
  ): Promise<PitchConfiguration> {
    const currentConfig = await this.getConfig(workspaceId);

    // Validate template exists
    const templateExists =
      BUILT_IN_TEMPLATES.some((t) => t.id === templateId) ||
      currentConfig.customTemplates.some((t) => t.id === templateId);

    if (!templateExists) {
      throw new NotFoundException('Template not found');
    }

    const updatedConfig: PitchConfiguration = {
      ...currentConfig,
      selectedTemplateId: templateId,
    };

    await this.saveConfig(workspaceId, updatedConfig);

    this.logger.log(`Selected template ${templateId} for workspace ${workspaceId}`);
    return updatedConfig;
  }

  /**
   * Create custom template
   */
  async createCustomTemplate(
    workspaceId: string,
    template: Omit<PitchTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PitchConfiguration> {
    const currentConfig = await this.getConfig(workspaceId);

    const newTemplate: PitchTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      category: 'custom',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedConfig: PitchConfiguration = {
      ...currentConfig,
      customTemplates: [...currentConfig.customTemplates, newTemplate],
    };

    await this.saveConfig(workspaceId, updatedConfig);

    this.logger.log(`Created custom template for workspace ${workspaceId}`);
    return updatedConfig;
  }

  /**
   * Update custom template
   */
  async updateCustomTemplate(
    workspaceId: string,
    templateId: string,
    updates: Partial<PitchTemplate>,
  ): Promise<PitchConfiguration> {
    const currentConfig = await this.getConfig(workspaceId);

    const templateIndex = currentConfig.customTemplates.findIndex(
      (t) => t.id === templateId,
    );

    if (templateIndex === -1) {
      throw new NotFoundException('Custom template not found');
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

  /**
   * Delete custom template
   */
  async deleteCustomTemplate(
    workspaceId: string,
    templateId: string,
  ): Promise<PitchConfiguration> {
    const currentConfig = await this.getConfig(workspaceId);

    const updatedConfig: PitchConfiguration = {
      ...currentConfig,
      customTemplates: currentConfig.customTemplates.filter(
        (t) => t.id !== templateId,
      ),
    };

    // If deleted template was selected, reset to default
    if (currentConfig.selectedTemplateId === templateId) {
      updatedConfig.selectedTemplateId = BUILT_IN_TEMPLATES[0].id;
    }

    await this.saveConfig(workspaceId, updatedConfig);

    this.logger.log(`Deleted custom template ${templateId} for workspace ${workspaceId}`);
    return updatedConfig;
  }

  /**
   * Update advanced config
   */
  async updateAdvancedConfig(
    workspaceId: string,
    advancedConfig: Partial<PitchAdvancedConfig>,
  ): Promise<PitchConfiguration> {
    const currentConfig = await this.getConfig(workspaceId);

    const updatedConfig: PitchConfiguration = {
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

  /**
   * Get all templates (built-in + custom)
   */
  async getAllTemplates(workspaceId: string): Promise<PitchTemplate[]> {
    const config = await this.getConfig(workspaceId);
    return [...BUILT_IN_TEMPLATES, ...config.customTemplates];
  }

  /**
   * Reset to default configuration
   */
  async resetToDefault(workspaceId: string): Promise<PitchConfiguration> {
    const defaultConfig = { ...DEFAULT_PITCH_CONFIG };
    await this.saveConfig(workspaceId, defaultConfig);

    this.logger.log(`Reset pitch config to default for workspace ${workspaceId}`);
    return defaultConfig;
  }

  /**
   * Save configuration to workspace settings
   */
  private async saveConfig(
    workspaceId: string,
    config: PitchConfiguration,
  ): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const settings = workspace.settings as any;
    settings[this.SETTINGS_KEY] = config;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings },
    });
  }
}
