import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, LeadStatus } from '@prisma/client';
import type {
  DashboardOverviewDto,
  DashboardMetricsDto,
  WorkflowStatusDto,
  LeadsListDto,
  LeadSummaryDto,
  TrendDto,
} from './types';
import type {
  DashboardOverviewQueryDto,
  LeadsListQueryDto,
  MetricsQueryDto,
} from './dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Get complete dashboard overview data
   */
  async getDashboardOverview(
    workspaceId: string,
    query: DashboardOverviewQueryDto,
  ): Promise<DashboardOverviewDto> {
    this.logger.log(
      `Getting dashboard overview for workspace: ${workspaceId}, period: ${query.period}`,
    );

    const [workflow, metrics, leads] = await Promise.all([
      this.getActiveWorkflow(workspaceId),
      this.getDashboardMetrics(workspaceId, { period: query.period }),
      this.getRecentLeads(workspaceId, {
        limit: query.limit,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    ]);

    return {
      workflow,
      metrics,
      leads,
    };
  }

  /**
   * Get active workflow with public form URL
   */
  async getActiveWorkflow(
    workspaceId: string,
  ): Promise<WorkflowStatusDto | null> {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        workspaceId,
        status: 'active',
        deletedAt: null,
      },
      include: {
        workspace: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!workflow) {
      this.logger.log(`No active workflow found for workspace: ${workspaceId}`);
      return null;
    }

    const frontendUrl = this.config.get('FRONTEND_URL');
    const publicFormUrl = `${frontendUrl}/p/${workflow.workspace.slug}`;

    return {
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      strategyName: workflow.strategyId, // TODO: Map to strategy name if needed
      publicFormUrl,
      activatedAt: workflow.updatedAt, // Using updatedAt as proxy for activation
      totalExecutions: workflow.totalExecutions || 0,
      successfulExecutions: workflow.successfulExecutions || 0,
      failedExecutions: workflow.failedExecutions || 0,
    };
  }

  /**
   * Get dashboard metrics with trends
   */
  async getDashboardMetrics(
    workspaceId: string,
    query: MetricsQueryDto,
  ): Promise<DashboardMetricsDto> {
    const { startDate, endDate } = this.getPeriodDates(query.period);
    const { startDate: prevStartDate, endDate: prevEndDate } =
      this.getPreviousPeriodDates(query.period);

    this.logger.log(
      `Calculating metrics for ${startDate} to ${endDate}, comparing with ${prevStartDate} to ${prevEndDate}`,
    );

    // Get current period stats
    const [currentStats, previousStats, avgReplyTime, prevAvgReplyTime] =
      await Promise.all([
        this.getAggregatedStats(workspaceId, startDate, endDate),
        this.getAggregatedStats(workspaceId, prevStartDate, prevEndDate),
        this.calculateAvgTimeToReply(workspaceId, startDate, endDate),
        this.calculateAvgTimeToReply(workspaceId, prevStartDate, prevEndDate),
      ]);

    // Calculate metrics
    const totalLeads = currentStats.totalLeads;
    const qualifiedLeads = currentStats.qualifiedLeads;
    const rejectedLeads = currentStats.rejectedLeads;
    const pendingLeads = currentStats.pendingLeads;
    const conversionRate =
      totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
    const emailOpenRate =
      currentStats.emailsSent > 0
        ? (currentStats.emailsOpened / currentStats.emailsSent) * 100
        : 0;
    const executionSuccessRate =
      currentStats.executionCount > 0
        ? (currentStats.successfulExecutions / currentStats.executionCount) *
          100
        : 0;

    // Calculate trends
    const trends = {
      totalLeads: this.calculateTrend(
        totalLeads,
        previousStats.totalLeads,
        'leads',
      ),
      qualifiedLeads: this.calculateTrend(
        qualifiedLeads,
        previousStats.qualifiedLeads,
        'leads',
      ),
      avgTimeToReply: this.calculateTrend(
        avgReplyTime,
        prevAvgReplyTime,
        'time',
        true, // Lower is better for reply time
      ),
      conversionRate: this.calculateTrend(
        conversionRate,
        previousStats.totalLeads > 0
          ? (previousStats.qualifiedLeads / previousStats.totalLeads) * 100
          : 0,
        'percentage',
      ),
    };

    return {
      totalLeads,
      qualifiedLeads,
      rejectedLeads,
      pendingLeads,
      avgTimeToReply: this.formatHours(avgReplyTime),
      conversionRate: Math.round(conversionRate * 10) / 10,
      emailsSent: currentStats.emailsSent,
      emailsOpened: currentStats.emailsOpened,
      emailOpenRate: Math.round(emailOpenRate * 10) / 10,
      executionCount: currentStats.executionCount,
      executionSuccessRate: Math.round(executionSuccessRate * 10) / 10,
      trends,
    };
  }

  /**
   * Get recent leads list with pagination
   */
  async getRecentLeads(
    workspaceId: string,
    query: LeadsListQueryDto,
  ): Promise<LeadsListDto> {
    const { limit, offset, status, sortBy, sortOrder } = query;

    // Map lowercase status to uppercase enum values
    const statusMap: Record<string, LeadStatus> = {
      new: LeadStatus.NEW,
      qualified: LeadStatus.RESPONDED, // Using RESPONDED as closest to qualified
      rejected: LeadStatus.LOST,
      contacted: LeadStatus.EMAIL_SENT,
    };

    const where: Prisma.LeadWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(status && statusMap[status] && { status: statusMap[status] }),
    };

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      this.prisma.lead.count({ where }),
    ]);

    const data: LeadSummaryDto[] = leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.companyName,
      status: lead.status,
      source: lead.source,
      score: lead.score,
      tags: lead.tags || [],
      createdAt: lead.createdAt,
    }));

    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get aggregated statistics for a period
   */
  private async getAggregatedStats(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Get lead counts by status
    const leadStats = await this.prisma.lead.groupBy({
      by: ['status'],
      where: {
        workspaceId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    const totalLeads = leadStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const qualifiedLeads =
      leadStats.find((s) => s.status === LeadStatus.RESPONDED)?._count.id || 0;
    const rejectedLeads =
      leadStats.find((s) => s.status === LeadStatus.LOST)?._count.id || 0;
    const pendingLeads =
      leadStats.find((s) => s.status === LeadStatus.NEW)?._count.id || 0;

    // Try to get from WorkspaceDailyStat first (pre-aggregated)
    const dailyStats = await this.prisma.workspaceDailyStat.aggregate({
      where: {
        workspaceId,
        statDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        emailsSent: true,
        emailsOpened: true,
        totalExecutions: true,
        successfulExecutions: true,
      },
    });

    // Fallback to workflow executions if daily stats not available
    const executionStats = dailyStats._sum.totalExecutions
      ? {
          executionCount: dailyStats._sum.totalExecutions || 0,
          successfulExecutions: dailyStats._sum.successfulExecutions || 0,
        }
      : await this.prisma.workflowExecution
          .aggregate({
            where: {
              workspaceId,
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            _count: {
              id: true,
            },
          })
          .then((result) => ({
            executionCount: result._count.id,
            successfulExecutions: result._count.id, // Simplified, could filter by status
          }));

    return {
      totalLeads,
      qualifiedLeads,
      rejectedLeads,
      pendingLeads,
      emailsSent: dailyStats._sum.emailsSent || 0,
      emailsOpened: dailyStats._sum.emailsOpened || 0,
      executionCount: executionStats.executionCount,
      successfulExecutions: executionStats.successfulExecutions,
    };
  }

  /**
   * Calculate average time to first reply in hours
   */
  private async calculateAvgTimeToReply(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Query to get avg time from lead creation to first email sent
    const result = await this.prisma.$queryRaw<[{ avg_hours: number | null }]>`
      SELECT AVG(EXTRACT(EPOCH FROM (first_email_sent - created_at)) / 3600) as avg_hours
      FROM (
        SELECT l.id, l.created_at, MIN(e.created_at) as first_email_sent
        FROM leads l
        LEFT JOIN lead_events e ON l.id = e.lead_id AND e.event_type = 'email_sent'
        WHERE l.workspace_id = ${workspaceId}::uuid
          AND l.created_at >= ${startDate}::timestamp
          AND l.created_at <= ${endDate}::timestamp
          AND l.deleted_at IS NULL
        GROUP BY l.id, l.created_at
        HAVING MIN(e.created_at) IS NOT NULL
      ) sub;
    `;

    return result[0]?.avg_hours || 0;
  }

  /**
   * Calculate trend between current and previous values
   */
  private calculateTrend(
    current: number,
    previous: number,
    unit: 'leads' | 'percentage' | 'time',
    inversed: boolean = false, // For metrics where lower is better
  ): TrendDto {
    if (previous === 0) {
      return {
        value: 0,
        direction: 'neutral',
        label: 'No previous data',
      };
    }

    const percentChange = ((current - previous) / previous) * 100;
    const roundedChange = Math.round(Math.abs(percentChange));

    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    if (percentChange > 0) {
      direction = inversed ? 'down' : 'up';
    } else if (percentChange < 0) {
      direction = inversed ? 'up' : 'down';
    }

    const sign = percentChange > 0 ? '+' : '';
    const unitLabel = unit === 'time' ? ' faster' : '';
    const label = `${sign}${roundedChange}%${unitLabel} from previous period`;

    return {
      value: roundedChange,
      direction,
      label,
    };
  }

  /**
   * Get date range for a period
   */
  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Get date range for previous period (for comparison)
   */
  private getPreviousPeriodDates(period: string): {
    startDate: Date;
    endDate: Date;
  } {
    const { startDate, endDate } = this.getPeriodDates(period);
    const duration = endDate.getTime() - startDate.getTime();

    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - duration);

    prevStartDate.setHours(0, 0, 0, 0);
    prevEndDate.setHours(23, 59, 59, 999);

    return { startDate: prevStartDate, endDate: prevEndDate };
  }

  /**
   * Format hours to human-readable string
   */
  private formatHours(hours: number): string {
    if (hours === 0) return '0h';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round((hours % 24) * 10) / 10;
    return `${days}d ${remainingHours}h`;
  }
}
