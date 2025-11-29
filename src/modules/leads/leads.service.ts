import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetLeadsQueryDto, UpdateLeadDto, BulkUpdateLeadsDto, GetLeadMetricsQueryDto, UpdateLeadStatusDto } from './dto/leads.dto';
import { Prisma, LeadStatus, LeadEventCategory } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeads(workspaceId: string, query: GetLeadsQueryDto) {
    const {
      search,
      workflowId,
      source,
      status,
      statuses,
      tags,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 25,
      view = 'table',
    } = query;

    // Build where clause
    const where: Prisma.LeadWhereInput = {
      workspaceId,
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          { companyName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          { phone: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      }),
      ...(workflowId && { workflowId }),
      ...(source && { source }),
      ...(status && { status }),
      ...(statuses && statuses.length > 0 && { status: { in: statuses } }),
      ...(tags && tags.length > 0 && {
        tags: { hasSome: tags },
      }),
      ...(dateFrom && {
        createdAt: { gte: new Date(dateFrom) },
      }),
      ...(dateTo && {
        createdAt: { lte: new Date(dateTo) },
      }),
    };

    // Return kanban view if requested
    if (view === 'kanban') {
      return this.getLeadsKanban(where);
    }

    // Get total count and paginated leads in parallel
    const [total, leads] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              events: true,
              bookings: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      view: 'table',
    };
  }

  private async getLeadsKanban(where: Prisma.LeadWhereInput) {
    // Always show the 6 main statuses in kanban view for drag-and-drop functionality
    const kanbanStatuses = [
      LeadStatus.EMAIL_SENT,
      LeadStatus.FOLLOW_UP_PENDING,
      LeadStatus.FOLLOW_UP_SENT,
      LeadStatus.BOOKED,
      LeadStatus.WON,
      LeadStatus.LOST,
    ];

    // Fetch leads grouped by status
    const leadsByStatus = await Promise.all(
      kanbanStatuses.map(async (status) => {
        const statusWhere: Prisma.LeadWhereInput = { ...where, status };

        const [leads, count] = await Promise.all([
          this.prisma.lead.findMany({
            where: statusWhere,
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit per column for performance
            include: {
              workflow: {
                select: {
                  id: true,
                  name: true,
                },
              },
              _count: {
                select: {
                  events: true,
                  bookings: true,
                },
              },
            },
          }),
          this.prisma.lead.count({ where: statusWhere }),
        ]);

        return {
          status,
          leads,
          count,
        };
      }),
    );

    return {
      columns: leadsByStatus,
      view: 'kanban',
    };
  }

  async getLeadById(workspaceId: string, leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        fieldData: {
          orderBy: { createdAt: 'asc' },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            triggeredBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.workspaceId !== workspaceId) {
      throw new ForbiddenException('Access denied to this lead');
    }

    return lead;
  }

  async getLeadMetrics(workspaceId: string, query: GetLeadMetricsQueryDto) {
    const { period = '30d' } = query;

    // Calculate date range
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[period];
    const currentPeriodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - days * 24 * 60 * 60 * 1000);

    // Get current period stats
    const [totalLeads, newToday, qualified, currentLeads, previousLeads] = await Promise.all([
      // Total leads
      this.prisma.lead.count({
        where: { workspaceId },
      }),
      // New today
      this.prisma.lead.count({
        where: {
          workspaceId,
          createdAt: {
            gte: new Date(now.setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Qualified (RESPONDED, BOOKED, or WON statuses)
      this.prisma.lead.count({
        where: {
          workspaceId,
          status: { in: [LeadStatus.RESPONDED, LeadStatus.BOOKED, LeadStatus.WON] },
        },
      }),
      // Current period leads
      this.prisma.lead.findMany({
        where: {
          workspaceId,
          createdAt: { gte: currentPeriodStart },
        },
        select: { score: true, createdAt: true },
      }),
      // Previous period leads
      this.prisma.lead.findMany({
        where: {
          workspaceId,
          createdAt: {
            gte: previousPeriodStart,
            lt: currentPeriodStart,
          },
        },
        select: { score: true, createdAt: true },
      }),
    ]);

    // Calculate average scores
    const currentAvgScore =
      currentLeads.length > 0
        ? currentLeads.reduce((sum: number, lead) => sum + lead.score, 0) / currentLeads.length
        : 0;
    const previousAvgScore =
      previousLeads.length > 0
        ? previousLeads.reduce((sum: number, lead) => sum + lead.score, 0) / previousLeads.length
        : 0;

    // Calculate changes
    const totalLeadsChange =
      previousLeads.length > 0
        ? ((currentLeads.length - previousLeads.length) / previousLeads.length) * 100
        : currentLeads.length > 0
        ? 100
        : 0;

    // Get yesterday's new leads count for comparison
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const newYesterday = await this.prisma.lead.count({
      where: {
        workspaceId,
        createdAt: {
          gte: new Date(yesterday.setHours(0, 0, 0, 0)),
          lt: new Date(now.setHours(0, 0, 0, 0)),
        },
      },
    });

    const newTodayChange = newToday - newYesterday;

    // Get qualified count from previous period
    const qualifiedPrevious = await this.prisma.lead.count({
      where: {
        workspaceId,
        status: { in: [LeadStatus.RESPONDED, LeadStatus.BOOKED, LeadStatus.WON] },
        createdAt: {
          gte: previousPeriodStart,
          lt: currentPeriodStart,
        },
      },
    });

    const qualifiedCurrent = await this.prisma.lead.count({
      where: {
        workspaceId,
        status: { in: [LeadStatus.RESPONDED, LeadStatus.BOOKED, LeadStatus.WON] },
        createdAt: { gte: currentPeriodStart },
      },
    });

    const qualifiedChange =
      qualifiedPrevious > 0
        ? ((qualifiedCurrent - qualifiedPrevious) / qualifiedPrevious) * 100
        : qualifiedCurrent > 0
        ? 100
        : 0;

    const averageScoreChange = currentAvgScore - previousAvgScore;

    return {
      totalLeads,
      totalLeadsChange: Math.round(totalLeadsChange * 10) / 10,
      newToday,
      newTodayChange,
      qualified,
      qualifiedChange: Math.round(qualifiedChange * 10) / 10,
      averageScore: Math.round(currentAvgScore * 10) / 10,
      averageScoreChange: Math.round(averageScoreChange * 10) / 10,
    };
  }

  async updateLead(workspaceId: string, leadId: string, dto: UpdateLeadDto, userId?: string) {
    // Verify lead belongs to workspace
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.workspaceId !== workspaceId) {
      throw new ForbiddenException('Access denied to this lead');
    }

    // Track changes for events
    const changes: string[] = [];
    if (dto.status && dto.status !== lead.status) {
      changes.push(`Status changed from ${lead.status} to ${dto.status}`);
    }
    if (dto.score !== undefined && dto.score !== lead.score) {
      changes.push(`Score updated from ${lead.score} to ${dto.score}`);
    }

    // Update lead
    const updateData: Prisma.LeadUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.companyName !== undefined && { companyName: dto.companyName }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.score !== undefined && { score: dto.score }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
      ...(dto.sourceMetadata !== undefined
        ? dto.sourceMetadata === null
          ? { sourceMetadata: Prisma.JsonNull }
          : { sourceMetadata: dto.sourceMetadata as Prisma.InputJsonValue }
        : {}),
      lastActivityAt: new Date(),
    };

    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: updateData,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        fieldData: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    // Create lead events for significant changes
    if (changes.length > 0) {
      await this.prisma.leadEvent.createMany({
        data: changes.map((description) => ({
          leadId,
          eventType: dto.status ? 'STATUS_CHANGED' : 'SCORE_UPDATED',
          description,
          triggeredByUserId: userId || null,
        })),
      });
    }

    return updatedLead;
  }

  async bulkUpdateLeads(workspaceId: string, dto: BulkUpdateLeadsDto, userId?: string) {
    const { leadIds, status, tags, addTags, removeTags } = dto;

    // Verify all leads belong to workspace
    const leads = await this.prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        workspaceId,
      },
    });

    if (leads.length !== leadIds.length) {
      throw new ForbiddenException('Some leads do not belong to this workspace');
    }

    // Build update data
    const updateData: Prisma.LeadUpdateInput = {
      lastActivityAt: new Date(),
      ...(status && { status }),
    };

    // Handle tags
    if (tags) {
      updateData.tags = tags;
    } else if (addTags || removeTags) {
      // For add/remove tags, we need to update each lead individually
      for (const lead of leads) {
        let newTags = [...lead.tags];
        if (addTags) {
          newTags = [...new Set([...newTags, ...addTags])];
        }
        if (removeTags) {
          newTags = newTags.filter((tag) => !removeTags.includes(tag));
        }
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: { tags: newTags, lastActivityAt: new Date() },
        });
      }
    }

    // Bulk update (if not handling tags individually)
    if (!addTags && !removeTags) {
      await this.prisma.lead.updateMany({
        where: { id: { in: leadIds } },
        data: updateData as Prisma.LeadUpdateManyMutationInput,
      });
    }

    // Create bulk event
    if (status) {
      const description = `Status changed to ${status}`;

      await this.prisma.leadEvent.createMany({
        data: leadIds.map((leadId) => ({
          leadId,
          eventType: 'STATUS_CHANGED',
          description,
          triggeredByUserId: userId || null,
        })),
      });
    }

    return {
      success: true,
      updatedCount: leadIds.length,
    };
  }

  async deleteLead(workspaceId: string, leadId: string) {
    // Verify lead belongs to workspace
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.workspaceId !== workspaceId) {
      throw new ForbiddenException('Access denied to this lead');
    }

    // Delete lead (cascade will handle related records)
    await this.prisma.lead.delete({
      where: { id: leadId },
    });

    return { success: true };
  }

  async updateLeadStatus(
    workspaceId: string,
    leadId: string,
    dto: UpdateLeadStatusDto,
    userId?: string,
  ) {
    // Verify lead belongs to workspace
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.workspaceId !== workspaceId) {
      throw new ForbiddenException('Access denied to this lead');
    }

    const oldStatus = lead.status;
    const newStatus = dto.status;

    // Update lead status
    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        lastActivityAt: new Date(),
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            events: true,
            bookings: true,
          },
        },
      },
    });

    // Create lead event for status change
    await this.prisma.leadEvent.create({
      data: {
        leadId,
        eventType: 'status_changed',
        eventCategory: LeadEventCategory.system,
        description: `Status changed from ${oldStatus} to ${newStatus}`,
        metadata: {
          oldStatus,
          newStatus,
          changedBy: userId || 'system',
          changedAt: new Date().toISOString(),
        },
        triggeredByUserId: userId || null,
      },
    });

    return updatedLead;
  }
}
