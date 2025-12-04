/**
 * Ollama Pitch Service
 *
 * Handles LLM-powered sales pitch generation using local Ollama API
 * Zero-cost alternative to OpenAI/Anthropic for personalized sales intelligence
 */

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  PitchContext,
  SalesPitch,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  RawPitchResponse,
} from '../types/pitch.types';

@Injectable()
export class OllamaPitchService {
  private readonly logger = new Logger(OllamaPitchService.name);
  private readonly ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
  private readonly model = process.env.OLLAMA_MODEL || 'llama3';

  /**
   * Generate sales pitch using Ollama LLM
   */
  async generatePitch(
    context: PitchContext,
    customPrompt?: string,
    temperature?: number,
  ): Promise<SalesPitch> {
    try {
      this.logger.log(`Generating pitch for lead: ${context.leadCompany.name}`);

      // Build prompt (use custom or default)
      const prompt = customPrompt || this.buildPrompt(context);

      // Call Ollama
      const request: OllamaGenerateRequest = {
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: temperature ?? 0.7, // Creative but grounded
          top_p: 0.9,
          top_k: 40,
        },
      };

      const response = await axios.post<OllamaGenerateResponse>(
        this.ollamaUrl,
        request,
        {
          timeout: 120000, // 2 minutes
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Parse LLM response
      const rawPitch = this.parseResponse(response.data.response);

      // Construct final pitch
      const pitch: SalesPitch = {
        ...rawPitch,
        generatedAt: new Date(),
        version: '1.0',
      };

      this.logger.log(`Successfully generated pitch (relevance: ${pitch.relevanceScore}%)`);

      return pitch;
    } catch (error) {
      this.logger.error(`Failed to generate pitch: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if Ollama is available
   */
  async checkOllamaAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl.replace('/api/generate', '/api/tags')}`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      this.logger.warn(`Ollama health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Build prompt template for sales pitch generation
   */
  private buildPrompt(context: PitchContext): string {
    const { userCompany, leadCompany, leadPerson } = context;

    return `You are an expert B2B sales consultant. Generate a personalized sales pitch for an upcoming meeting.

**CONTEXT:**

**My Company (Seller):**
- Name: ${userCompany.name}
${userCompany.industry ? `- Industry: ${userCompany.industry}` : ''}
${userCompany.businessModel ? `- Business Model: ${userCompany.businessModel}` : ''}
${userCompany.companySize ? `- Company Size: ${userCompany.companySize}` : ''}
${userCompany.summary ? `- What We Do: ${userCompany.summary}` : ''}
${userCompany.techStack && userCompany.techStack.length > 0 ? `- Our Tech Stack: ${userCompany.techStack.join(', ')}` : ''}

**Prospect Company (Buyer):**
- Name: ${leadCompany.name}
${leadCompany.domain ? `- Domain: ${leadCompany.domain}` : ''}
${leadCompany.industry ? `- Industry: ${leadCompany.industry}` : ''}
${leadCompany.size ? `- Company Size: ${leadCompany.size}` : ''}
${leadCompany.description ? `- About Them: ${leadCompany.description}` : ''}
${leadCompany.techStack && leadCompany.techStack.length > 0 ? `- Their Tech Stack: ${leadCompany.techStack.join(', ')}` : ''}
${leadCompany.emailProvider ? `- Email Provider: ${leadCompany.emailProvider}` : ''}
${leadCompany.location ? `- Location: ${leadCompany.location}` : ''}

${leadPerson ? `**Prospect Contact:**
- Name: ${leadPerson.name}
${leadPerson.jobTitle ? `- Job Title: ${leadPerson.jobTitle}` : ''}
${leadPerson.seniority ? `- Seniority: ${leadPerson.seniority}` : ''}
${leadPerson.department ? `- Department: ${leadPerson.department}` : ''}` : ''}

---

**YOUR TASK:**
Generate a structured sales pitch in JSON format with these exact fields:

{
  "summary": "A 2-3 sentence executive summary of why this meeting matters and the potential value",
  "relevanceScore": <number 0-100 indicating how well my company fits their needs>,
  "talkingPoints": [
    "3-5 specific points to discuss in the meeting",
    "Focus on mutual relevance, not generic pitches",
    "Reference their specific company context"
  ],
  "commonGround": [
    "Shared industry, tech stack, or company stage similarities",
    "Things that build rapport and trust"
  ],
  "painPoints": [
    "3-5 likely challenges they face based on their industry/size/tech",
    "Be specific and relevant to their profile",
    "Infer from their tech stack and company stage"
  ],
  "valueProposition": "A clear 1-2 sentence statement of how my company solves their specific problems",
  "conversationStarters": [
    "3-5 open-ended questions to start the conversation naturally",
    "Reference their company specifics (tech stack, industry, size)",
    "Make it feel personal, not templated"
  ],
  "competitorContext": "Optional: If you detect they use competing tools based on tech stack, mention a positioning strategy. Leave empty if not applicable."
}

**RULES:**
- Be specific to THEIR company, not generic
- Use detected tech stack to infer pain points
- Match tone to their seniority level if known
- Focus on business outcomes, not features
- Make relevanceScore realistic (60-90 range typically)
- Output ONLY valid JSON, no markdown code blocks, no explanation text
- Do not wrap JSON in code fences or backticks

Generate the pitch JSON now:`;
  }

  /**
   * Parse and validate LLM response
   */
  private parseResponse(response: string): RawPitchResponse {
    try {
      // Clean response (remove markdown code blocks if present)
      let cleaned = response.trim();

      // Remove markdown code fences
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      // Parse JSON
      const parsed = JSON.parse(cleaned);

      // Validate structure
      if (!parsed.summary || !parsed.relevanceScore || !Array.isArray(parsed.talkingPoints)) {
        throw new Error('Invalid pitch structure from LLM');
      }

      // Ensure relevanceScore is in valid range
      if (parsed.relevanceScore < 0 || parsed.relevanceScore > 100) {
        parsed.relevanceScore = Math.max(0, Math.min(100, parsed.relevanceScore));
      }

      return parsed as RawPitchResponse;
    } catch (error) {
      this.logger.error(`Failed to parse LLM response: ${error.message}`);
      this.logger.debug(`Raw response: ${response.substring(0, 500)}`);
      throw new Error(`Invalid JSON response from Ollama: ${error.message}`);
    }
  }
}
