import { PitchConfiguration, PitchTemplate } from '../types/pitch-config.types';
import type { PitchContext } from '../types/pitch.types';
export declare class PitchTemplateService {
    private readonly logger;
    private readonly handlebars;
    constructor();
    private registerHelpers;
    buildPromptFromConfig(context: PitchContext, config: PitchConfiguration): string;
    private getTemplate;
    private buildPromptFromTemplate;
    private processCustomPrompt;
    private getToneInstruction;
    private getLengthInstruction;
    private getFocusInstruction;
    getAllTemplates(config: PitchConfiguration): PitchTemplate[];
    getDefaultConfig(): PitchConfiguration;
    validateTemplate(templateString: string): {
        valid: boolean;
        error?: string;
    };
}
