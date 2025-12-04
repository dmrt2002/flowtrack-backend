/**
 * Sales Pitch Types
 *
 * TypeScript interfaces for AI-generated sales pitch data
 */

/**
 * Generated sales pitch for a lead
 * Combines user's company data + lead enrichment to create personalized talking points
 */
export interface SalesPitch {
  /** Executive summary (2-3 sentences) */
  summary: string;

  /** Relevance score 0-100 indicating fit */
  relevanceScore: number;

  /** Key talking points for the meeting (3-5 bullets) */
  talkingPoints: string[];

  /** Common ground / shared context (industry, tech, size) */
  commonGround: string[];

  /** Inferred pain points based on company profile (3-5 points) */
  painPoints: string[];

  /** Clear value proposition statement */
  valueProposition: string;

  /** Natural conversation starters (3-5 questions) */
  conversationStarters: string[];

  /** Optional competitor context if detected */
  competitorContext?: string;

  /** When this pitch was generated */
  generatedAt: Date;

  /** Pitch generation version for tracking */
  version: string;
}

/**
 * Context data for pitch generation
 * Combines user company + lead company + lead person data
 */
export interface PitchContext {
  /** User's company information (from onboarding) */
  userCompany: {
    name: string;
    industry?: string;
    businessModel?: string;
    companySize?: string;
    summary?: string;
    techStack?: string[];
  };

  /** Lead's company information (from enrichment) */
  leadCompany: {
    name: string;
    domain?: string;
    industry?: string;
    size?: string;
    description?: string;
    techStack?: string[];
    emailProvider?: string;
    location?: string;
  };

  /** Lead's personal information (from enrichment) */
  leadPerson?: {
    name: string;
    jobTitle?: string;
    seniority?: string;
    department?: string;
  };
}

/**
 * Ollama API request/response types
 */
export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Raw LLM response structure (before parsing)
 */
export interface RawPitchResponse {
  summary: string;
  relevanceScore: number;
  talkingPoints: string[];
  commonGround: string[];
  painPoints: string[];
  valueProposition: string;
  conversationStarters: string[];
  competitorContext?: string;
}
