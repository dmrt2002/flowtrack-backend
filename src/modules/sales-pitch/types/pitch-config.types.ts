/**
 * Pitch Configuration Types
 *
 * TypeScript interfaces for customizable sales pitch generation
 */

/**
 * Tone presets for pitch generation
 */
export enum PitchTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FRIENDLY = 'friendly',
  FORMAL = 'formal',
  CONSULTATIVE = 'consultative',
}

/**
 * Length presets for pitch generation
 */
export enum PitchLength {
  CONCISE = 'concise',
  MEDIUM = 'medium',
  DETAILED = 'detailed',
}

/**
 * Focus areas for pitch generation
 */
export enum PitchFocus {
  TECHNICAL = 'technical',
  ROI = 'roi',
  RELATIONSHIP = 'relationship',
  COMPETITIVE = 'competitive',
  PROBLEM_SOLVING = 'problem_solving',
}

/**
 * Quick settings for pitch customization
 */
export interface PitchQuickSettings {
  tone: PitchTone;
  length: PitchLength;
  focusAreas: PitchFocus[];
}

/**
 * Predefined pitch template
 */
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

/**
 * Advanced custom prompt configuration
 */
export interface PitchAdvancedConfig {
  useCustomPrompt: boolean;
  customPromptTemplate: string;
  systemInstructions?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Complete pitch configuration stored in workspace settings
 */
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

/**
 * Default pitch configuration
 */
export const DEFAULT_PITCH_CONFIG: PitchConfiguration = {
  version: '1.0',
  quickSettings: {
    tone: PitchTone.PROFESSIONAL,
    length: PitchLength.MEDIUM,
    focusAreas: [PitchFocus.PROBLEM_SOLVING, PitchFocus.ROI],
  },
  customTemplates: [],
  advancedConfig: {
    useCustomPrompt: false,
    customPromptTemplate: '',
    temperature: 0.7,
  },
  enabledFeatures: {
    autoGenerate: false,
    batchGeneration: true,
    pdfExport: true,
  },
};

/**
 * Built-in template library
 */
export const BUILT_IN_TEMPLATES: PitchTemplate[] = [
  {
    id: 'default-balanced',
    name: 'Balanced (Default)',
    description: 'Well-rounded pitch covering all aspects',
    category: 'default',
    isDefault: true,
    promptTemplate: `Generate a balanced sales pitch that covers all key aspects: business alignment, pain points, value proposition, and conversation starters.`,
    quickSettings: {
      tone: PitchTone.PROFESSIONAL,
      length: PitchLength.MEDIUM,
      focusAreas: [PitchFocus.PROBLEM_SOLVING, PitchFocus.ROI],
    },
  },
  {
    id: 'technical-deep-dive',
    name: 'Technical Deep Dive',
    description: 'Focus on technical alignment and stack compatibility',
    category: 'default',
    isDefault: false,
    promptTemplate: `Generate a technically-focused sales pitch. Emphasize tech stack compatibility, integration capabilities, and technical problem-solving. Use technical terminology appropriate for engineering decision-makers.`,
    quickSettings: {
      tone: PitchTone.PROFESSIONAL,
      length: PitchLength.DETAILED,
      focusAreas: [PitchFocus.TECHNICAL, PitchFocus.PROBLEM_SOLVING],
    },
  },
  {
    id: 'roi-focused',
    name: 'ROI & Business Value',
    description: 'Emphasize financial impact and business outcomes',
    category: 'default',
    isDefault: false,
    promptTemplate: `Generate an ROI-focused sales pitch. Emphasize cost savings, efficiency gains, revenue impact, and measurable business outcomes. Use concrete numbers and percentages where possible.`,
    quickSettings: {
      tone: PitchTone.PROFESSIONAL,
      length: PitchLength.MEDIUM,
      focusAreas: [PitchFocus.ROI, PitchFocus.PROBLEM_SOLVING],
    },
  },
  {
    id: 'relationship-builder',
    name: 'Relationship Builder',
    description: 'Focus on common ground and rapport building',
    category: 'default',
    isDefault: false,
    promptTemplate: `Generate a relationship-focused sales pitch. Emphasize common ground, shared experiences, industry alignment, and personal connection points. Use a warm, friendly tone.`,
    quickSettings: {
      tone: PitchTone.FRIENDLY,
      length: PitchLength.CONCISE,
      focusAreas: [PitchFocus.RELATIONSHIP],
    },
  },
  {
    id: 'competitive-positioning',
    name: 'Competitive Positioning',
    description: 'Highlight competitive advantages and differentiators',
    category: 'default',
    isDefault: false,
    promptTemplate: `Generate a competitively-focused sales pitch. Identify their current tools/competitors and position our solution as superior. Emphasize unique differentiators and competitive advantages.`,
    quickSettings: {
      tone: PitchTone.CONSULTATIVE,
      length: PitchLength.MEDIUM,
      focusAreas: [PitchFocus.COMPETITIVE, PitchFocus.PROBLEM_SOLVING],
    },
  },
  {
    id: 'concise-elevator',
    name: 'Concise Elevator Pitch',
    description: 'Quick, high-impact pitch for busy executives',
    category: 'default',
    isDefault: false,
    promptTemplate: `Generate a concise, high-impact elevator pitch. Keep it brief and punchy. Focus only on the most critical pain point and value proposition. Perfect for busy C-level executives.`,
    quickSettings: {
      tone: PitchTone.PROFESSIONAL,
      length: PitchLength.CONCISE,
      focusAreas: [PitchFocus.ROI],
    },
  },
];

/**
 * Template variables available in prompts
 */
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
