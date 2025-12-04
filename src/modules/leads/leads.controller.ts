import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { LeadsService } from './leads.service';
import {
  GetLeadsQueryDto,
  UpdateLeadDto,
  BulkUpdateLeadsDto,
  GetLeadMetricsQueryDto,
  UpdateLeadStatusDto,
} from './dto/leads.dto';
import { EnrichmentQueueService } from '../enrichment/services/enrichment-queue.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('workspaces/:workspaceId/leads')
@UseGuards(UnifiedAuthGuard)
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly enrichmentQueue: EnrichmentQueueService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getLeads(
    @Param('workspaceId') workspaceId: string,
    @Query() query: GetLeadsQueryDto,
  ) {
    return this.leadsService.getLeads(workspaceId, query);
  }

  @Get('metrics')
  async getLeadMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query() query: GetLeadMetricsQueryDto,
  ) {
    return this.leadsService.getLeadMetrics(workspaceId, query);
  }

  @Get(':leadId')
  async getLeadById(
    @Param('workspaceId') workspaceId: string,
    @Param('leadId') leadId: string,
  ) {
    return this.leadsService.getLeadById(workspaceId, leadId);
  }

  @Patch(':leadId')
  async updateLead(
    @Param('workspaceId') workspaceId: string,
    @Param('leadId') leadId: string,
    @Body() dto: UpdateLeadDto,
    @Req() req: any,
  ) {
    return this.leadsService.updateLead(workspaceId, leadId, dto, req.user?.id);
  }

  @Patch(':leadId/status')
  async updateLeadStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('leadId') leadId: string,
    @Body() dto: UpdateLeadStatusDto,
    @Req() req: any,
  ) {
    return this.leadsService.updateLeadStatus(
      workspaceId,
      leadId,
      dto,
      req.user?.id,
    );
  }

  @Patch('bulk')
  async bulkUpdateLeads(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: BulkUpdateLeadsDto,
    @Req() req: any,
  ) {
    return this.leadsService.bulkUpdateLeads(workspaceId, dto, req.user?.id);
  }

  @Delete(':leadId')
  async deleteLead(
    @Param('workspaceId') workspaceId: string,
    @Param('leadId') leadId: string,
  ) {
    return this.leadsService.deleteLead(workspaceId, leadId);
  }

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
}
