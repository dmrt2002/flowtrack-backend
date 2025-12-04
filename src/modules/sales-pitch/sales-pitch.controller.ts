/**
 * Sales Pitch Controller
 *
 * REST API endpoints for AI-powered sales pitch generation
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { User, UserPayload } from '../../auth/decorators/user.decorator';
import { SalesPitchService } from './services/sales-pitch.service';
import { PitchQueueService } from './services/pitch-queue.service';
import {
  SalesPitchResponseDto,
  PitchErrorResponseDto,
  BatchGeneratePitchesDto,
  BatchGenerationJobResponseDto,
  BatchGenerationProgressDto,
} from './dto/pitch.dto';

@ApiTags('Sales Pitch')
@Controller('leads')
@UseGuards(UnifiedAuthGuard)
@ApiBearerAuth()
export class SalesPitchController {
  private readonly logger = new Logger(SalesPitchController.name);

  constructor(
    private readonly pitchService: SalesPitchService,
    private readonly queueService: PitchQueueService,
  ) {}

  /**
   * Get or generate sales pitch for a lead
   * GET /api/v1/leads/:id/sales-pitch
   */
  @Get(':id/sales-pitch')
  @ApiOperation({
    summary: 'Get AI-generated sales pitch for lead',
    description:
      'Generates personalized sales talking points by combining user company data with lead enrichment. ' +
      'Uses local Ollama LLM for zero-cost intelligence. Results are cached for 7 days.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales pitch generated successfully',
    type: SalesPitchResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
    type: PitchErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Ollama service unavailable',
    type: PitchErrorResponseDto,
  })
  async getSalesPitch(
    @Param('id') leadId: string,
    @User() user: UserPayload & { workspaces: any[] },
  ): Promise<SalesPitchResponseDto> {
    try {
      const workspaceId = user.workspaces[0]?.id;
      if (!workspaceId) {
        throw new Error('No workspace found for user');
      }
      this.logger.log(`Getting sales pitch for lead ${leadId}`);

      const pitch = await this.pitchService.generateOrGetCachedPitch(leadId, workspaceId);

      return SalesPitchResponseDto.fromDomain(pitch);
    } catch (error) {
      this.logger.error(`Failed to get sales pitch: ${error.message}`, error.stack);

      // Re-throw HTTP exceptions as-is
      if (error instanceof HttpException) {
        throw error;
      }

      // Wrap other errors
      throw new HttpException(
        {
          code: 'PITCH_GENERATION_FAILED',
          message: 'Failed to generate sales pitch',
          details: { error: error.message },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Force regenerate sales pitch (bypass cache)
   * POST /api/v1/leads/:id/sales-pitch/regenerate
   */
  @Post(':id/sales-pitch/regenerate')
  @ApiOperation({
    summary: 'Force regenerate sales pitch',
    description:
      'Bypasses cache and generates a fresh sales pitch. ' +
      'Useful when lead enrichment data has been updated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales pitch regenerated successfully',
    type: SalesPitchResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
    type: PitchErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Ollama service unavailable',
    type: PitchErrorResponseDto,
  })
  async regeneratePitch(
    @Param('id') leadId: string,
    @User() user: UserPayload & { workspaces: any[] },
  ): Promise<SalesPitchResponseDto> {
    try {
      const workspaceId = user.workspaces[0]?.id;
      if (!workspaceId) {
        throw new Error('No workspace found for user');
      }
      this.logger.log(`Regenerating sales pitch for lead ${leadId}`);

      const pitch = await this.pitchService.regeneratePitch(leadId, workspaceId);

      return SalesPitchResponseDto.fromDomain(pitch);
    } catch (error) {
      this.logger.error(`Failed to regenerate sales pitch: ${error.message}`, error.stack);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          code: 'PITCH_REGENERATION_FAILED',
          message: 'Failed to regenerate sales pitch',
          details: { error: error.message },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if pitch exists in cache
   * GET /api/v1/leads/:id/sales-pitch/status
   */
  @Get(':id/sales-pitch/status')
  @ApiOperation({
    summary: 'Check if sales pitch is cached',
    description: 'Returns whether a cached pitch exists for this lead without generating a new one',
  })
  @ApiResponse({
    status: 200,
    description: 'Pitch status',
    schema: {
      properties: {
        exists: { type: 'boolean', example: true },
        generatedAt: { type: 'string', format: 'date-time', example: '2025-12-04T10:30:00Z' },
      },
    },
  })
  async getPitchStatus(
    @Param('id') leadId: string,
    @User() user: UserPayload & { workspaces: any[] },
  ): Promise<{ exists: boolean; generatedAt?: string }> {
    const workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('No workspace found for user');
    }
    const cached = await this.pitchService.getCachedPitch(leadId, workspaceId);

    if (cached) {
      return {
        exists: true,
        generatedAt: cached.generatedAt.toISOString(),
      };
    }

    return { exists: false };
  }

  /**
   * Batch generate pitches for multiple leads
   * POST /api/v1/leads/batch/generate-pitches
   */
  @Post('batch/generate-pitches')
  @ApiOperation({
    summary: 'Generate sales pitches for multiple leads in batch',
    description:
      'Queues batch pitch generation job for multiple leads. ' +
      'Returns job ID for tracking progress. Processes 3 leads concurrently.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch generation job started',
    type: BatchGenerationJobResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (empty lead IDs)',
    type: PitchErrorResponseDto,
  })
  async batchGeneratePitches(
    @Body() dto: BatchGeneratePitchesDto,
    @User() user: UserPayload & { workspaces: any[] },
  ): Promise<BatchGenerationJobResponseDto> {
    try {
      const workspaceId = user.workspaces[0]?.id;
      if (!workspaceId) {
        throw new Error('No workspace found for user');
      }

      if (!dto.leadIds || dto.leadIds.length === 0) {
        throw new HttpException(
          {
            code: 'INVALID_REQUEST',
            message: 'Lead IDs array cannot be empty',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `Starting batch pitch generation for ${dto.leadIds.length} leads`,
      );

      const jobId = await this.queueService.addBatchGenerationJob(
        workspaceId,
        dto.leadIds,
        user.id,
      );

      return {
        jobId,
        total: dto.leadIds.length,
        message: 'Batch pitch generation started',
      };
    } catch (error) {
      this.logger.error(
        `Failed to start batch generation: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          code: 'BATCH_GENERATION_FAILED',
          message: 'Failed to start batch pitch generation',
          details: { error: error.message },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get batch generation job progress
   * GET /api/v1/leads/batch/generate-pitches/:jobId/progress
   */
  @Get('batch/generate-pitches/:jobId/progress')
  @ApiOperation({
    summary: 'Get progress of batch pitch generation job',
    description: 'Returns current progress of a batch generation job',
  })
  @ApiResponse({
    status: 200,
    description: 'Job progress',
    type: BatchGenerationProgressDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
    type: PitchErrorResponseDto,
  })
  async getBatchProgress(
    @Param('jobId') jobId: string,
  ): Promise<BatchGenerationProgressDto> {
    const progress = await this.queueService.getJobProgress(jobId);

    if (!progress) {
      throw new HttpException(
        {
          code: 'JOB_NOT_FOUND',
          message: 'Batch generation job not found',
          details: { jobId },
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return progress;
  }
}
