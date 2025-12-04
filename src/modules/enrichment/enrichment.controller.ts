import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnrichmentService } from './services/enrichment.service';
import { EnrichmentQueueService } from './services/enrichment-queue.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('api/v1/workspaces/:workspaceId/leads')
// @UseGuards(JwtAuthGuard) // Add authentication when auth guard is available
export class EnrichmentController {
  constructor(
    private enrichmentService: EnrichmentService,
    private enrichmentQueue: EnrichmentQueueService,
    private prisma: PrismaService,
  ) {}

  /**
   * Manually trigger enrichment for a specific lead
   * POST /api/v1/workspaces/:workspaceId/leads/:leadId/enrich
   */
  @Post(':leadId/enrich')
  @HttpCode(HttpStatus.ACCEPTED)
  async enrichLead(
    @Param('workspaceId') workspaceId: string,
    @Param('leadId') leadId: string,
  ) {
    // Verify lead belongs to workspace
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        workspaceId,
      },
    });

    if (!lead) {
      return {
        success: false,
        error: 'Lead not found',
      };
    }

    // Enqueue enrichment job
    await this.enrichmentQueue.enqueueEnrichment({
      leadId: lead.id,
      workspaceId: lead.workspaceId,
      email: lead.email,
      name: lead.name || undefined,
      companyName: lead.companyName || undefined,
    });

    return {
      success: true,
      message: 'Enrichment queued',
      leadId,
    };
  }

  /**
   * Get enrichment data for a lead
   * GET /api/v1/workspaces/:workspaceId/leads/:leadId/enrichment
   */
  @Get(':leadId/enrichment')
  async getEnrichment(
    @Param('workspaceId') workspaceId: string,
    @Param('leadId') leadId: string,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        workspaceId,
      },
      select: {
        enrichmentData: true,
        enrichmentStatus: true,
        enrichedAt: true,
      },
    });

    if (!lead) {
      return {
        success: false,
        error: 'Lead not found',
      };
    }

    return {
      success: true,
      data: lead.enrichmentData,
      status: lead.enrichmentStatus,
      enrichedAt: lead.enrichedAt,
    };
  }

  /**
   * Get enrichment queue status
   * GET /api/v1/workspaces/:workspaceId/leads/enrichment/status
   */
  @Get('enrichment/status')
  async getQueueStatus() {
    const status = await this.enrichmentQueue.getQueueStatus();
    return {
      success: true,
      queue: status,
    };
  }

  /**
   * Bulk enrich all unenriched leads in workspace
   * POST /api/v1/workspaces/:workspaceId/leads/enrich/bulk
   */
  @Post('enrich/bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  async bulkEnrich(@Param('workspaceId') workspaceId: string) {
    // Find all leads without enrichment or with failed status
    const leads = await this.prisma.lead.findMany({
      where: {
        workspaceId,
        OR: [
          { enrichmentStatus: null },
          { enrichmentStatus: 'PENDING' },
          { enrichmentStatus: 'FAILED' },
        ],
      },
      select: {
        id: true,
        workspaceId: true,
        email: true,
        name: true,
        companyName: true,
      },
      take: 100, // Limit to 100 leads per bulk request
    });

    if (leads.length === 0) {
      return {
        success: true,
        message: 'No leads to enrich',
        count: 0,
      };
    }

    // Enqueue all leads
    await this.enrichmentQueue.bulkEnqueueEnrichment(
      leads.map((lead) => ({
        leadId: lead.id,
        workspaceId: lead.workspaceId,
        email: lead.email,
        name: lead.name || undefined,
        companyName: lead.companyName || undefined,
      })),
    );

    return {
      success: true,
      message: `Enrichment queued for ${leads.length} leads`,
      count: leads.length,
    };
  }
}
