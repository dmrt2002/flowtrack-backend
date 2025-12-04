export interface SalesPitch {
    summary: string;
    relevanceScore: number;
    talkingPoints: string[];
    commonGround: string[];
    painPoints: string[];
    valueProposition: string;
    conversationStarters: string[];
    competitorContext?: string;
    generatedAt: Date;
    version: string;
}
export interface PitchContext {
    userCompany: {
        name: string;
        industry?: string;
        businessModel?: string;
        companySize?: string;
        summary?: string;
        techStack?: string[];
    };
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
    leadPerson?: {
        name: string;
        jobTitle?: string;
        seniority?: string;
        department?: string;
    };
}
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
