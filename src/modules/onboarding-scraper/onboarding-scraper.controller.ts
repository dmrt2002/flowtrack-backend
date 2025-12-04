/**
 * Onboarding Scraper Controller
 *
 * REST API endpoints for company website scraping during onboarding
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OnboardingScraperService } from './services/onboarding-scraper.service';
import {
  ScrapeCompanyRequestDto,
  ScrapeCompanyResponseDto,
  GetEnrichmentStatusResponseDto,
} from './dto/scraper.dto';

// TODO: Add authentication guard when auth module is ready
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Onboarding Scraper')
@Controller('onboarding')
// @UseGuards(JwtAuthGuard) // TODO: Uncomment when auth is ready
// @ApiBearerAuth()
export class OnboardingScraperController {
  private readonly logger = new Logger(OnboardingScraperController.name);

  constructor(private readonly scraperService: OnboardingScraperService) {}

  /**
   * Scrape and analyze company website
   * POST /api/v1/onboarding/scrape-company (global prefix applied)
   */
  @Post('scrape-company')
  @ApiOperation({
    summary: 'Scrape company website and extract business intelligence',
    description:
      'Analyzes a company website to extract business model, industry, company size, and generate a summary. ' +
      'Accepts either a company name (will infer domain) or direct website URL.',
  })
  @ApiResponse({
    status: 200,
    description: 'Company data successfully scraped and analyzed',
    type: ScrapeCompanyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or scraping failed',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async scrapeCompany(
    @Body() dto: ScrapeCompanyRequestDto,
  ): Promise<ScrapeCompanyResponseDto> {
    try {
      this.logger.log(`Scraping company: ${dto.companyName || dto.website}`);

      // Validate input
      if (!dto.companyName && !dto.website) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Either companyName or website must be provided',
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get workspaceId from workflow
      const workflow = await this.scraperService['prisma'].workflow.findUnique({
        where: { id: dto.workflowId },
        select: { workspaceId: true },
      });

      if (!workflow) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Workflow not found',
            },
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Execute scraping
      const result = await this.scraperService.scrapeCompany({
        companyName: dto.companyName,
        website: dto.website,
        workflowId: dto.workflowId,
        workspaceId: workflow.workspaceId,
      });

      // If scraping failed, return 400
      if (!result.success) {
        throw new HttpException(result, HttpStatus.BAD_REQUEST);
      }

      return result;
    } catch (error) {
      // If already an HttpException, re-throw
      if (error instanceof HttpException) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error(`Unexpected error in scrapeCompany: ${error.message}`, error.stack);

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred',
            details: { message: error.message },
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get enrichment status for a workflow
   * GET /api/v1/onboarding/enrichment-status/:workflowId
   */
  @Get('enrichment-status/:workflowId')
  @ApiOperation({
    summary: 'Check if enrichment data exists for a workflow',
    description: 'Returns enriched company data if it exists, otherwise returns exists: false',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrichment status retrieved',
    type: GetEnrichmentStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow not found',
  })
  async getEnrichmentStatus(
    @Param('workflowId') workflowId: string,
  ): Promise<GetEnrichmentStatusResponseDto> {
    try {
      this.logger.log(`Getting enrichment status for workflow: ${workflowId}`);

      // Verify workflow exists
      const workflow = await this.scraperService['prisma'].workflow.findUnique({
        where: { id: workflowId },
      });

      if (!workflow) {
        throw new HttpException('Workflow not found', HttpStatus.NOT_FOUND);
      }

      // Get enriched data
      const data = await this.scraperService.getEnrichedData(workflowId);

      if (data) {
        return {
          exists: true,
          data,
        };
      }

      return {
        exists: false,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error getting enrichment status: ${error.message}`, error.stack);

      throw new HttpException(
        'Failed to get enrichment status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check endpoint
   * GET /api/v1/onboarding/scraper-health
   */
  @Get('scraper-health')
  @ApiOperation({
    summary: 'Health check for scraper service',
    description: 'Returns service status and version',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
  })
  async healthCheck(): Promise<{ status: string; version: string; timestamp: Date }> {
    return {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date(),
    };
  }
}
