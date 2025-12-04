/**
 * Sales Pitch DTOs
 *
 * Data Transfer Objects for API requests/responses
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { SalesPitch } from '../types/pitch.types';

/**
 * Response DTO for sales pitch endpoint
 */
export class SalesPitchResponseDto {
  @ApiProperty({ description: 'Executive summary of the pitch', example: 'Your B2B construction automation platform aligns perfectly with their manual proposal processes. They use similar tech stack and face common scaling challenges.' })
  summary: string;

  @ApiProperty({ description: 'Relevance score 0-100', example: 85, minimum: 0, maximum: 100 })
  relevanceScore: number;

  @ApiProperty({ description: 'Key talking points', type: [String], example: ['Both operate in construction tech space', 'They struggle with manual document generation', 'Your AI can reduce proposal time by 70%'] })
  talkingPoints: string[];

  @ApiProperty({ description: 'Common ground for rapport building', type: [String], example: ['Same industry (Construction)', 'Similar company size (SMB)', 'Both use Google Workspace'] })
  commonGround: string[];

  @ApiProperty({ description: 'Inferred pain points', type: [String], example: ['Manual proposal creation takes too long', 'Poor team collaboration on documents', 'Difficulty tracking proposal status'] })
  painPoints: string[];

  @ApiProperty({ description: 'Value proposition statement', example: 'Your AI-powered platform can automate their proposal generation, improve team collaboration, and provide real-time tracking - reducing cycle time by 70%.' })
  valueProposition: string;

  @ApiProperty({ description: 'Natural conversation starters', type: [String], example: ['I noticed you\'re using Google Workspace - how are you currently handling proposal automation?', 'What\'s your biggest challenge with document collaboration right now?'] })
  conversationStarters: string[];

  @ApiProperty({ description: 'Competitor context if detected', required: false, example: 'They currently use PandaDoc for documents - position your AI intelligence as the differentiator' })
  competitorContext?: string;

  @ApiProperty({ description: 'Generation timestamp', example: '2025-12-04T10:30:00Z' })
  generatedAt: string;

  @ApiProperty({ description: 'Pitch generation version', example: '1.0' })
  version: string;

  static fromDomain(pitch: SalesPitch): SalesPitchResponseDto {
    return {
      summary: pitch.summary,
      relevanceScore: pitch.relevanceScore,
      talkingPoints: pitch.talkingPoints,
      commonGround: pitch.commonGround,
      painPoints: pitch.painPoints,
      valueProposition: pitch.valueProposition,
      conversationStarters: pitch.conversationStarters,
      competitorContext: pitch.competitorContext,
      generatedAt: pitch.generatedAt.toISOString(),
      version: pitch.version,
    };
  }
}

/**
 * Error response for pitch generation failures
 */
export class PitchErrorResponseDto {
  @ApiProperty({ description: 'Error code', example: 'OLLAMA_UNAVAILABLE' })
  code: string;

  @ApiProperty({ description: 'Human-readable error message', example: 'AI pitch generation is currently unavailable. Please try again later.' })
  message: string;

  @ApiProperty({ description: 'Additional error details', required: false })
  details?: any;
}

/**
 * Request DTO for batch pitch generation
 */
export class BatchGeneratePitchesDto {
  @ApiProperty({ description: 'Array of lead IDs to generate pitches for', type: [String], example: ['lead-1', 'lead-2', 'lead-3'] })
  @IsArray()
  @IsString({ each: true })
  leadIds: string[];
}

/**
 * Response DTO for batch pitch generation job
 */
export class BatchGenerationJobResponseDto {
  @ApiProperty({ description: 'Job ID for tracking progress', example: 'job-123' })
  jobId: string;

  @ApiProperty({ description: 'Number of leads queued for generation', example: 25 })
  total: number;

  @ApiProperty({ description: 'Job status message', example: 'Batch pitch generation started' })
  message: string;
}

/**
 * Response DTO for batch generation progress
 */
export class BatchGenerationProgressDto {
  @ApiProperty({ description: 'Total number of leads', example: 25 })
  total: number;

  @ApiProperty({ description: 'Number of pitches completed', example: 10 })
  completed: number;

  @ApiProperty({ description: 'Number of pitches failed', example: 2 })
  failed: number;

  @ApiProperty({ description: 'Whether generation is still in progress', example: true })
  inProgress: boolean;
}
