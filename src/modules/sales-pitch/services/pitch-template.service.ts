/**
 * Pitch Template Service
 *
 * Handles template processing and prompt customization using Handlebars
 */

import { Injectable, Logger } from '@nestjs/common';
import Handlebars from 'handlebars';
import {
  PitchConfiguration,
  PitchTemplate,
  PitchTone,
  PitchLength,
  PitchFocus,
  PromptVariables,
  BUILT_IN_TEMPLATES,
  DEFAULT_PITCH_CONFIG,
} from '../types/pitch-config.types';
import type { PitchContext } from '../types/pitch.types';

@Injectable()
export class PitchTemplateService {
  private readonly logger = new Logger(PitchTemplateService.name);
  private readonly handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers for template processing
   */
  private registerHelpers(): void {
    // Join array with comma
    this.handlebars.registerHelper('join', (array: string[], separator = ', ') => {
      return array?.join(separator) || '';
    });

    // Conditional helper
    this.handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // Uppercase helper
    this.handlebars.registerHelper('upper', (str: string) => {
      return str?.toUpperCase() || '';
    });

    // Lowercase helper
    this.handlebars.registerHelper('lower', (str: string) => {
      return str?.toLowerCase() || '';
    });
  }

  /**
   * Build prompt from configuration and context
   */
  buildPromptFromConfig(
    context: PitchContext,
    config: PitchConfiguration,
  ): string {
    this.logger.log('Building prompt from configuration');

    // Use custom prompt if enabled
    if (config.advancedConfig.useCustomPrompt) {
      return this.processCustomPrompt(
        config.advancedConfig.customPromptTemplate,
        context,
      );
    }

    // Use selected template
    const template = this.getTemplate(config);
    return this.buildPromptFromTemplate(template, config, context);
  }

  /**
   * Get active template (selected or default)
   */
  private getTemplate(config: PitchConfiguration): PitchTemplate {
    if (config.selectedTemplateId) {
      // Check custom templates first
      const customTemplate = config.customTemplates.find(
        (t) => t.id === config.selectedTemplateId,
      );
      if (customTemplate) {
        return customTemplate;
      }

      // Check built-in templates
      const builtInTemplate = BUILT_IN_TEMPLATES.find(
        (t) => t.id === config.selectedTemplateId,
      );
      if (builtInTemplate) {
        return builtInTemplate;
      }
    }

    // Default template
    return BUILT_IN_TEMPLATES[0];
  }

  /**
   * Build prompt from template and quick settings
   */
  private buildPromptFromTemplate(
    template: PitchTemplate,
    config: PitchConfiguration,
    context: PitchContext,
  ): string {
    const { tone, length, focusAreas } = config.quickSettings;

    // Build persona instructions
    const toneInstruction = this.getToneInstruction(tone);
    const lengthInstruction = this.getLengthInstruction(length);
    const focusInstruction = this.getFocusInstruction(focusAreas);

    // Build full prompt
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

  /**
   * Process custom prompt with Handlebars
   */
  private processCustomPrompt(
    templateString: string,
    context: PitchContext,
  ): string {
    try {
      const template = this.handlebars.compile(templateString);
      const variables: PromptVariables = {
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
    } catch (error) {
      this.logger.error(`Failed to process custom prompt: ${error.message}`);
      throw new Error('Invalid template syntax');
    }
  }

  /**
   * Get tone instruction based on selected tone
   */
  private getToneInstruction(tone: PitchTone): string {
    const instructions = {
      [PitchTone.PROFESSIONAL]:
        'Use a professional, business-appropriate tone.',
      [PitchTone.CASUAL]: 'Use a relaxed, conversational tone.',
      [PitchTone.FRIENDLY]:
        'Use a warm, approachable tone that builds rapport.',
      [PitchTone.FORMAL]:
        'Use a formal, highly professional tone suitable for executives.',
      [PitchTone.CONSULTATIVE]:
        'Use a consultative, advisory tone that demonstrates expertise.',
    };

    return instructions[tone];
  }

  /**
   * Get length instruction based on selected length
   */
  private getLengthInstruction(length: PitchLength): string {
    const instructions = {
      [PitchLength.CONCISE]:
        '**Length Guideline:** Keep responses brief and high-impact. 3-5 bullet points per section.',
      [PitchLength.MEDIUM]:
        '**Length Guideline:** Provide balanced detail. 5-7 bullet points per section.',
      [PitchLength.DETAILED]:
        '**Length Guideline:** Provide comprehensive analysis. 7-10 bullet points per section with specific examples.',
    };

    return instructions[length];
  }

  /**
   * Get focus instruction based on selected focus areas
   */
  private getFocusInstruction(focusAreas: PitchFocus[]): string {
    if (!focusAreas || focusAreas.length === 0) {
      return '';
    }

    const focusDescriptions = {
      [PitchFocus.TECHNICAL]:
        'technical alignment, stack compatibility, integration capabilities',
      [PitchFocus.ROI]:
        'cost savings, revenue impact, efficiency gains, measurable business outcomes',
      [PitchFocus.RELATIONSHIP]:
        'common ground, shared experiences, rapport building',
      [PitchFocus.COMPETITIVE]:
        'competitive advantages, differentiators, current tool limitations',
      [PitchFocus.PROBLEM_SOLVING]:
        'specific pain points, root cause analysis, solution fit',
    };

    const focusText = focusAreas
      .map((focus) => focusDescriptions[focus])
      .join(', ');

    return `**Focus Areas:** Emphasize ${focusText}.`;
  }

  /**
   * Get all available templates (built-in + custom)
   */
  getAllTemplates(config: PitchConfiguration): PitchTemplate[] {
    return [...BUILT_IN_TEMPLATES, ...config.customTemplates];
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): PitchConfiguration {
    return { ...DEFAULT_PITCH_CONFIG };
  }

  /**
   * Validate custom template syntax
   */
  validateTemplate(templateString: string): { valid: boolean; error?: string } {
    try {
      this.handlebars.compile(templateString);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}
