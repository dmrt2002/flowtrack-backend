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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PitchTemplateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PitchTemplateService = void 0;
const common_1 = require("@nestjs/common");
const handlebars_1 = __importDefault(require("handlebars"));
const pitch_config_types_1 = require("../types/pitch-config.types");
let PitchTemplateService = PitchTemplateService_1 = class PitchTemplateService {
    logger = new common_1.Logger(PitchTemplateService_1.name);
    handlebars;
    constructor() {
        this.handlebars = handlebars_1.default.create();
        this.registerHelpers();
    }
    registerHelpers() {
        this.handlebars.registerHelper('join', (array, separator = ', ') => {
            return array?.join(separator) || '';
        });
        this.handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
            return arg1 === arg2 ? options.fn(this) : options.inverse(this);
        });
        this.handlebars.registerHelper('upper', (str) => {
            return str?.toUpperCase() || '';
        });
        this.handlebars.registerHelper('lower', (str) => {
            return str?.toLowerCase() || '';
        });
    }
    buildPromptFromConfig(context, config) {
        this.logger.log('Building prompt from configuration');
        if (config.advancedConfig.useCustomPrompt) {
            return this.processCustomPrompt(config.advancedConfig.customPromptTemplate, context);
        }
        const template = this.getTemplate(config);
        return this.buildPromptFromTemplate(template, config, context);
    }
    getTemplate(config) {
        if (config.selectedTemplateId) {
            const customTemplate = config.customTemplates.find((t) => t.id === config.selectedTemplateId);
            if (customTemplate) {
                return customTemplate;
            }
            const builtInTemplate = pitch_config_types_1.BUILT_IN_TEMPLATES.find((t) => t.id === config.selectedTemplateId);
            if (builtInTemplate) {
                return builtInTemplate;
            }
        }
        return pitch_config_types_1.BUILT_IN_TEMPLATES[0];
    }
    buildPromptFromTemplate(template, config, context) {
        const { tone, length, focusAreas } = config.quickSettings;
        const toneInstruction = this.getToneInstruction(tone);
        const lengthInstruction = this.getLengthInstruction(length);
        const focusInstruction = this.getFocusInstruction(focusAreas);
        const prompt = `You are an expert B2B sales consultant. ${toneInstruction}

${template.promptTemplate}

${lengthInstruction}

${focusInstruction}

**CONTEXT:**

**My Company (Seller):**
- Name: ${context.userCompany.name}
- Industry: ${context.userCompany.industry || 'Not specified'}
- Business Model: ${context.userCompany.businessModel || 'Not specified'}
- Company Size: ${context.userCompany.companySize || 'Not specified'}
- What We Do: ${context.userCompany.summary || 'Not specified'}
- Our Tech Stack: ${context.userCompany.techStack?.join(', ') || 'Not specified'}

**Prospect Company (Buyer):**
- Name: ${context.leadCompany.name}
- Domain: ${context.leadCompany.domain || 'Not specified'}
- Industry: ${context.leadCompany.industry || 'Not specified'}
- Company Size: ${context.leadCompany.size || 'Not specified'}
- Description: ${context.leadCompany.description || 'Not specified'}
- Their Tech Stack: ${context.leadCompany.techStack?.join(', ') || 'Not specified'}
- Email Provider: ${context.leadCompany.emailProvider || 'Not specified'}

${context.leadPerson ? `**Prospect Contact:**
- Name: ${context.leadPerson.name}
- Job Title: ${context.leadPerson.jobTitle || 'Not specified'}
- Seniority: ${context.leadPerson.seniority || 'Not specified'}
- Department: ${context.leadPerson.department || 'Not specified'}` : ''}

---

**YOUR TASK:**
Generate a structured sales pitch in JSON format with the following fields:

{
  "summary": "Executive summary (2-3 sentences)",
  "relevanceScore": 85,
  "talkingPoints": ["Point 1", "Point 2", "Point 3"],
  "commonGround": ["Common ground 1", "Common ground 2"],
  "painPoints": ["Pain point 1", "Pain point 2", "Pain point 3"],
  "valueProposition": "Clear value proposition statement",
  "conversationStarters": ["Starter 1", "Starter 2"],
  "competitorContext": "Optional competitor analysis"
}

**RULES:**
- Output ONLY valid JSON, no markdown formatting
- Be specific to their company and tech stack
- Use actual company names and technologies mentioned
- Match tone to prospect's seniority level
- Focus on business outcomes, not features
- Keep relevanceScore between 0-100`;
        return prompt;
    }
    processCustomPrompt(templateString, context) {
        try {
            const template = this.handlebars.compile(templateString);
            const variables = {
                userCompanyName: context.userCompany.name,
                userIndustry: context.userCompany.industry || '',
                userBusinessModel: context.userCompany.businessModel || '',
                userCompanySize: context.userCompany.companySize || '',
                userTechStack: context.userCompany.techStack || [],
                leadCompanyName: context.leadCompany.name,
                leadDomain: context.leadCompany.domain || '',
                leadIndustry: context.leadCompany.industry || '',
                leadCompanySize: context.leadCompany.size || '',
                leadTechStack: context.leadCompany.techStack || [],
                leadPersonName: context.leadPerson?.name || '',
                leadJobTitle: context.leadPerson?.jobTitle || '',
                leadSeniority: context.leadPerson?.seniority || '',
                leadDepartment: context.leadPerson?.department || '',
            };
            return template(variables);
        }
        catch (error) {
            this.logger.error(`Failed to process custom prompt: ${error.message}`);
            throw new Error('Invalid template syntax');
        }
    }
    getToneInstruction(tone) {
        const instructions = {
            [pitch_config_types_1.PitchTone.PROFESSIONAL]: 'Use a professional, business-appropriate tone.',
            [pitch_config_types_1.PitchTone.CASUAL]: 'Use a relaxed, conversational tone.',
            [pitch_config_types_1.PitchTone.FRIENDLY]: 'Use a warm, approachable tone that builds rapport.',
            [pitch_config_types_1.PitchTone.FORMAL]: 'Use a formal, highly professional tone suitable for executives.',
            [pitch_config_types_1.PitchTone.CONSULTATIVE]: 'Use a consultative, advisory tone that demonstrates expertise.',
        };
        return instructions[tone];
    }
    getLengthInstruction(length) {
        const instructions = {
            [pitch_config_types_1.PitchLength.CONCISE]: '**Length Guideline:** Keep responses brief and high-impact. 3-5 bullet points per section.',
            [pitch_config_types_1.PitchLength.MEDIUM]: '**Length Guideline:** Provide balanced detail. 5-7 bullet points per section.',
            [pitch_config_types_1.PitchLength.DETAILED]: '**Length Guideline:** Provide comprehensive analysis. 7-10 bullet points per section with specific examples.',
        };
        return instructions[length];
    }
    getFocusInstruction(focusAreas) {
        if (!focusAreas || focusAreas.length === 0) {
            return '';
        }
        const focusDescriptions = {
            [pitch_config_types_1.PitchFocus.TECHNICAL]: 'technical alignment, stack compatibility, integration capabilities',
            [pitch_config_types_1.PitchFocus.ROI]: 'cost savings, revenue impact, efficiency gains, measurable business outcomes',
            [pitch_config_types_1.PitchFocus.RELATIONSHIP]: 'common ground, shared experiences, rapport building',
            [pitch_config_types_1.PitchFocus.COMPETITIVE]: 'competitive advantages, differentiators, current tool limitations',
            [pitch_config_types_1.PitchFocus.PROBLEM_SOLVING]: 'specific pain points, root cause analysis, solution fit',
        };
        const focusText = focusAreas
            .map((focus) => focusDescriptions[focus])
            .join(', ');
        return `**Focus Areas:** Emphasize ${focusText}.`;
    }
    getAllTemplates(config) {
        return [...pitch_config_types_1.BUILT_IN_TEMPLATES, ...config.customTemplates];
    }
    getDefaultConfig() {
        return { ...pitch_config_types_1.DEFAULT_PITCH_CONFIG };
    }
    validateTemplate(templateString) {
        try {
            this.handlebars.compile(templateString);
            return { valid: true };
        }
        catch (error) {
            return { valid: false, error: error.message };
        }
    }
};
exports.PitchTemplateService = PitchTemplateService;
exports.PitchTemplateService = PitchTemplateService = PitchTemplateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PitchTemplateService);
//# sourceMappingURL=pitch-template.service.js.map