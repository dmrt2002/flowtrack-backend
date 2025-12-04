import { SalesPitch } from '../types/pitch.types';
export declare class SalesPitchResponseDto {
    summary: string;
    relevanceScore: number;
    talkingPoints: string[];
    commonGround: string[];
    painPoints: string[];
    valueProposition: string;
    conversationStarters: string[];
    competitorContext?: string;
    generatedAt: string;
    version: string;
    static fromDomain(pitch: SalesPitch): SalesPitchResponseDto;
}
export declare class PitchErrorResponseDto {
    code: string;
    message: string;
    details?: any;
}
export declare class BatchGeneratePitchesDto {
    leadIds: string[];
}
export declare class BatchGenerationJobResponseDto {
    jobId: string;
    total: number;
    message: string;
}
export declare class BatchGenerationProgressDto {
    total: number;
    completed: number;
    failed: number;
    inProgress: boolean;
}
