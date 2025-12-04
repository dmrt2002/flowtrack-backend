import { PrismaService } from '../../../prisma/prisma.service';
import { PitchConfiguration, PitchTemplate, PitchQuickSettings, PitchAdvancedConfig } from '../types/pitch-config.types';
export declare class PitchConfigService {
    private readonly prisma;
    private readonly logger;
    private readonly SETTINGS_KEY;
    constructor(prisma: PrismaService);
    getConfig(workspaceId: string): Promise<PitchConfiguration>;
    updateQuickSettings(workspaceId: string, quickSettings: Partial<PitchQuickSettings>): Promise<PitchConfiguration>;
    selectTemplate(workspaceId: string, templateId: string): Promise<PitchConfiguration>;
    createCustomTemplate(workspaceId: string, template: Omit<PitchTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PitchConfiguration>;
    updateCustomTemplate(workspaceId: string, templateId: string, updates: Partial<PitchTemplate>): Promise<PitchConfiguration>;
    deleteCustomTemplate(workspaceId: string, templateId: string): Promise<PitchConfiguration>;
    updateAdvancedConfig(workspaceId: string, advancedConfig: Partial<PitchAdvancedConfig>): Promise<PitchConfiguration>;
    getAllTemplates(workspaceId: string): Promise<PitchTemplate[]>;
    resetToDefault(workspaceId: string): Promise<PitchConfiguration>;
    private saveConfig;
}
