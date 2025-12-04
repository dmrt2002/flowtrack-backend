export declare enum PitchTone {
    PROFESSIONAL = "professional",
    CASUAL = "casual",
    FRIENDLY = "friendly",
    FORMAL = "formal",
    CONSULTATIVE = "consultative"
}
export declare enum PitchLength {
    CONCISE = "concise",
    MEDIUM = "medium",
    DETAILED = "detailed"
}
export declare enum PitchFocus {
    TECHNICAL = "technical",
    ROI = "roi",
    RELATIONSHIP = "relationship",
    COMPETITIVE = "competitive",
    PROBLEM_SOLVING = "problem_solving"
}
export interface PitchQuickSettings {
    tone: PitchTone;
    length: PitchLength;
    focusAreas: PitchFocus[];
}
export interface PitchTemplate {
    id: string;
    name: string;
    description: string;
    category: 'default' | 'industry' | 'role' | 'custom';
    promptTemplate: string;
    quickSettings: PitchQuickSettings;
    isDefault: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface PitchAdvancedConfig {
    useCustomPrompt: boolean;
    customPromptTemplate: string;
    systemInstructions?: string;
    temperature?: number;
    maxTokens?: number;
}
export interface PitchConfiguration {
    version: string;
    quickSettings: PitchQuickSettings;
    selectedTemplateId?: string;
    customTemplates: PitchTemplate[];
    advancedConfig: PitchAdvancedConfig;
    enabledFeatures?: {
        autoGenerate?: boolean;
        batchGeneration?: boolean;
        pdfExport?: boolean;
    };
}
export declare const DEFAULT_PITCH_CONFIG: PitchConfiguration;
export declare const BUILT_IN_TEMPLATES: PitchTemplate[];
export interface PromptVariables {
    userCompanyName: string;
    userIndustry: string;
    userBusinessModel: string;
    userCompanySize: string;
    userTechStack: string[];
    leadCompanyName: string;
    leadDomain: string;
    leadIndustry: string;
    leadCompanySize: string;
    leadTechStack: string[];
    leadPersonName: string;
    leadJobTitle: string;
    leadSeniority: string;
    leadDepartment: string;
}
