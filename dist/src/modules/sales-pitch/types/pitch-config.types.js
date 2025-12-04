"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILT_IN_TEMPLATES = exports.DEFAULT_PITCH_CONFIG = exports.PitchFocus = exports.PitchLength = exports.PitchTone = void 0;
var PitchTone;
(function (PitchTone) {
    PitchTone["PROFESSIONAL"] = "professional";
    PitchTone["CASUAL"] = "casual";
    PitchTone["FRIENDLY"] = "friendly";
    PitchTone["FORMAL"] = "formal";
    PitchTone["CONSULTATIVE"] = "consultative";
})(PitchTone || (exports.PitchTone = PitchTone = {}));
var PitchLength;
(function (PitchLength) {
    PitchLength["CONCISE"] = "concise";
    PitchLength["MEDIUM"] = "medium";
    PitchLength["DETAILED"] = "detailed";
})(PitchLength || (exports.PitchLength = PitchLength = {}));
var PitchFocus;
(function (PitchFocus) {
    PitchFocus["TECHNICAL"] = "technical";
    PitchFocus["ROI"] = "roi";
    PitchFocus["RELATIONSHIP"] = "relationship";
    PitchFocus["COMPETITIVE"] = "competitive";
    PitchFocus["PROBLEM_SOLVING"] = "problem_solving";
})(PitchFocus || (exports.PitchFocus = PitchFocus = {}));
exports.DEFAULT_PITCH_CONFIG = {
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
exports.BUILT_IN_TEMPLATES = [
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
//# sourceMappingURL=pitch-config.types.js.map