import { UserPayload } from '../../../auth/decorators/user.decorator';
import { PitchConfigService } from '../services/pitch-config.service';
import { PitchTemplateService } from '../services/pitch-template.service';
import { PitchConfiguration, PitchQuickSettings, PitchTemplate, PitchAdvancedConfig } from '../types/pitch-config.types';
export declare class PitchConfigController {
    private readonly configService;
    private readonly templateService;
    private readonly logger;
    constructor(configService: PitchConfigService, templateService: PitchTemplateService);
    getConfig(user: UserPayload & {
        workspaces: any[];
    }): Promise<PitchConfiguration>;
    getAllTemplates(user: UserPayload & {
        workspaces: any[];
    }): Promise<PitchTemplate[]>;
    updateQuickSettings(user: UserPayload & {
        workspaces: any[];
    }, quickSettings: Partial<PitchQuickSettings>): Promise<PitchConfiguration>;
    selectTemplate(user: UserPayload & {
        workspaces: any[];
    }, body: {
        templateId: string;
    }): Promise<PitchConfiguration>;
    createTemplate(user: UserPayload & {
        workspaces: any[];
    }, template: Omit<PitchTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PitchConfiguration>;
    updateTemplate(user: UserPayload & {
        workspaces: any[];
    }, templateId: string, updates: Partial<PitchTemplate>): Promise<PitchConfiguration>;
    deleteTemplate(user: UserPayload & {
        workspaces: any[];
    }, templateId: string): Promise<PitchConfiguration>;
    updateAdvancedConfig(user: UserPayload & {
        workspaces: any[];
    }, advancedConfig: Partial<PitchAdvancedConfig>): Promise<PitchConfiguration>;
    validateTemplate(body: {
        template: string;
    }): Promise<{
        valid: boolean;
        error?: string;
    }>;
    resetToDefault(user: UserPayload & {
        workspaces: any[];
    }): Promise<PitchConfiguration>;
}
