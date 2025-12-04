/**
 * Onboarding Scraper DTOs (Data Transfer Objects)
 *
 * Request/Response validation schemas for API endpoints
 */

import { IsString, IsOptional, IsNotEmpty, IsUrl, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScrapeCompanyRequestDto {
  @ApiPropertyOptional({
    description: 'Company name to infer website from',
    example: 'Acme Corporation',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Direct website URL provided by user',
    example: 'https://example.com',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({
    description: 'Workflow ID for the onboarding session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  workflowId: string;

  // Validate: At least one of companyName or website must be provided
  @ValidateIf((o) => !o.companyName && !o.website)
  @IsNotEmpty({ message: 'Either companyName or website must be provided' })
  atLeastOne?: string;
}

export class EnrichedCompanyResponseDto {
  @ApiProperty({
    description: 'Generated business summary',
    example: 'A B2B SaaS company that provides construction management software for contractors',
  })
  summary: string;

  @ApiProperty({
    description: 'Detected industry',
    example: 'Technology - Construction Tech',
  })
  industry: string;

  @ApiProperty({
    description: 'Business model type',
    enum: ['B2B', 'B2C', 'B2B2C', 'Marketplace', 'Unknown'],
    example: 'B2B',
  })
  businessModel: string;

  @ApiProperty({
    description: 'Company size classification',
    enum: ['Startup', 'SMB', 'Mid-Market', 'Enterprise', 'Unknown'],
    example: 'SMB',
  })
  companySize: string;

  @ApiProperty({
    description: 'Resolved website domain',
    example: 'example.com',
  })
  website: string;

  @ApiProperty({
    description: 'Extracted or provided company name',
    example: 'Acme Corporation',
  })
  companyName: string;

  @ApiPropertyOptional({
    description: 'Company logo URL (from Clearbit)',
    example: 'https://logo.clearbit.com/example.com',
  })
  logo?: string;

  @ApiProperty({
    description: 'Overall confidence score (0.0 - 1.0)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  confidence: number;

  @ApiProperty({
    description: 'Timestamp when data was scraped',
    example: '2025-12-04T10:30:00.000Z',
  })
  scrapedAt: Date;

  @ApiProperty({
    description: 'Source of the domain',
    enum: ['user_provided', 'inferred', 'fallback'],
    example: 'inferred',
  })
  source: string;
}

export class ScraperErrorResponseDto {
  @ApiProperty({
    description: 'Error code',
    enum: [
      'INVALID_INPUT',
      'DOMAIN_NOT_FOUND',
      'WEBSITE_INACCESSIBLE',
      'SCRAPING_FAILED',
      'TIMEOUT',
      'NETWORK_ERROR',
      'PARSING_ERROR',
      'LOW_CONFIDENCE',
      'UNKNOWN_ERROR',
    ],
    example: 'DOMAIN_NOT_FOUND',
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Could not find a valid website for this company',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Additional error details',
  })
  details?: any;
}

export class ScrapeCompanyResponseDto {
  @ApiProperty({
    description: 'Indicates if scraping was successful',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Enriched company data (if successful)',
    type: EnrichedCompanyResponseDto,
  })
  data?: EnrichedCompanyResponseDto;

  @ApiPropertyOptional({
    description: 'Error information (if failed)',
    type: ScraperErrorResponseDto,
  })
  error?: ScraperErrorResponseDto;
}

export class GetEnrichmentStatusResponseDto {
  @ApiProperty({
    description: 'Indicates if enrichment data exists',
    example: true,
  })
  exists: boolean;

  @ApiPropertyOptional({
    description: 'Enriched company data (if exists)',
    type: EnrichedCompanyResponseDto,
  })
  data?: EnrichedCompanyResponseDto;
}
