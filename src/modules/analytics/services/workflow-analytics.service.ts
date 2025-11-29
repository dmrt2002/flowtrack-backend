import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  WorkflowAnalyticsDto,
  WorkflowAnalyticsQueryDto,
  FormPerformanceMetrics,
  SubmissionTimeSeriesPoint,
  LeadSourceBreakdown,
  RecentSubmissionDto,
  MetricWithChange,
} from '../dto/workflow-analytics.dto';

@Injectable()
export class WorkflowAnalyticsService {
  private readonly logger = new Logger(WorkflowAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get complete analytics data for a workflow
   */
  async getWorkflowAnalytics(
    workflowId: string,
    query: WorkflowAnalyticsQueryDto,
  ): Promise<WorkflowAnalyticsDto> {
    // Verify workflow exists
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      select: { id: true, name: true },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow not found: ${workflowId}`);
    }

    // Calculate date ranges based on period
    const { startDate, endDate, previousStartDate, previousEndDate } =
      this.getDateRanges(query.period || '30d');

    // Fetch all analytics data in parallel
    const [
      formPerformance,
      submissionsOverTime,
      topLeadSources,
      recentSubmissions,
    ] = await Promise.all([
      this.getFormPerformanceMetrics(
        workflowId,
        startDate,
        endDate,
        previousStartDate,
        previousEndDate,
      ),
      this.getSubmissionsTimeSeries(workflowId, startDate, endDate),
      this.getTopLeadSources(workflowId, startDate, endDate, 5),
      this.getRecentSubmissions(workflowId, query.recentLimit || 10),
    ]);

    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      period: query.period || '30d',
      formPerformance,
      submissionsOverTime,
      topLeadSources,
      recentSubmissions,
    };
  }

  /**
   * Get form performance metrics with period-over-period comparison
   */
  async getFormPerformanceMetrics(
    workflowId: string,
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
    previousEndDate: Date,
  ): Promise<FormPerformanceMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isCurrentPeriodIncludesToday = endDate >= today;

    // Get aggregated stats from workflow_daily_stats
    const [currentStats, previousStats, todayStats] = await Promise.all([
      // Historical stats (exclude today if it's in the range)
      this.prisma.workflowDailyStat.aggregate({
        where: {
          workflowId,
          statDate: {
            gte: startDate,
            lte: isCurrentPeriodIncludesToday
              ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
              : endDate,
          },
        },
        _sum: {
          formViews: true,
          formSubmissions: true,
        },
      }),
      // Previous period for comparison
      this.prisma.workflowDailyStat.aggregate({
        where: {
          workflowId,
          statDate: {
            gte: previousStartDate,
            lte: previousEndDate,
          },
        },
        _sum: {
          formViews: true,
          formSubmissions: true,
        },
      }),
      // Today's real-time stats (if current period includes today)
      isCurrentPeriodIncludesToday
        ? this.getRealtimeStatsForToday(workflowId)
        : Promise.resolve({ views: 0, submissions: 0 }),
    ]);

    // Combine historical + today's data
    const currentViews =
      (currentStats._sum.formViews || 0) + todayStats.views;
    const currentSubmissions =
      (currentStats._sum.formSubmissions || 0) + todayStats.submissions;
    const previousViews = previousStats._sum.formViews || 0;
    const previousSubmissions = previousStats._sum.formSubmissions || 0;

    // Calculate conversion rates
    const currentConversionRate =
      currentViews > 0 ? (currentSubmissions / currentViews) * 100 : 0;
    const previousConversionRate =
      previousViews > 0 ? (previousSubmissions / previousViews) * 100 : 0;

    // Calculate period-over-period changes
    const submissionsChange = this.calculatePercentageChange(
      currentSubmissions,
      previousSubmissions,
    );
    const viewsChange = this.calculatePercentageChange(
      currentViews,
      previousViews,
    );
    const conversionChange = this.calculatePercentageChange(
      currentConversionRate,
      previousConversionRate,
    );

    return {
      submissions: {
        total: currentSubmissions,
        change: submissionsChange,
        changeDirection: this.getChangeDirection(submissionsChange),
      },
      views: {
        total: currentViews,
        change: viewsChange,
        changeDirection: this.getChangeDirection(viewsChange),
      },
      conversionRate: {
        total: parseFloat(currentConversionRate.toFixed(1)),
        change: conversionChange,
        changeDirection: this.getChangeDirection(conversionChange),
      },
    };
  }

  /**
   * Get real-time stats for today (not yet in daily aggregation)
   */
  private async getRealtimeStatsForToday(
    workflowId: string,
  ): Promise<{ views: number; submissions: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [viewsResult, submissionsResult] = await Promise.all([
      // Count form views from usage_events
      this.prisma.usageEvent.aggregate({
        where: {
          eventType: 'form_view',
          relatedResourceId: workflowId,
          createdAt: { gte: today },
        },
        _sum: {
          quantity: true,
        },
      }),
      // Count form submissions from leads
      this.prisma.lead.count({
        where: {
          workflowId,
          source: 'FORM',
          createdAt: { gte: today },
          deletedAt: null,
        },
      }),
    ]);

    return {
      views: viewsResult._sum.quantity || 0,
      submissions: submissionsResult,
    };
  }

  /**
   * Get daily submission data for time-series chart
   */
  async getSubmissionsTimeSeries(
    workflowId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SubmissionTimeSeriesPoint[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get historical data
    const historicalData = await this.prisma.workflowDailyStat.findMany({
      where: {
        workflowId,
        statDate: {
          gte: startDate,
          lt: today, // Exclude today (get from real-time)
        },
      },
      select: {
        statDate: true,
        formSubmissions: true,
        formViews: true,
      },
      orderBy: {
        statDate: 'asc',
      },
    });

    // Convert to time series points
    const timeSeries: SubmissionTimeSeriesPoint[] = historicalData.map(
      (stat) => ({
        date: stat.statDate.toISOString().split('T')[0],
        submissions: stat.formSubmissions,
        views: stat.formViews,
      }),
    );

    // Add today's data if it's in the range
    if (endDate >= today) {
      const todayStats = await this.getRealtimeStatsForToday(workflowId);
      timeSeries.push({
        date: today.toISOString().split('T')[0],
        submissions: todayStats.submissions,
        views: todayStats.views,
      });
    }

    return timeSeries;
  }

  /**
   * Get top lead sources from UTM parameters
   */
  async getTopLeadSources(
    workflowId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 5,
  ): Promise<LeadSourceBreakdown[]> {
    // Query lead sourceMetadata for UTM sources
    const sources = await this.prisma.$queryRaw<
      Array<{ source: string; count: bigint }>
    >`
      SELECT
        COALESCE(
          source_metadata->'utm'->>'source',
          'direct'
        ) as source,
        COUNT(*) as count
      FROM leads
      WHERE workflow_id = ${workflowId}::uuid
        AND created_at >= ${startDate}::timestamp
        AND created_at <= ${endDate}::timestamp
        AND deleted_at IS NULL
        AND source = 'FORM'
      GROUP BY COALESCE(source_metadata->'utm'->>'source', 'direct')
      ORDER BY count DESC
      LIMIT ${limit};
    `;

    if (sources.length === 0) {
      return [];
    }

    // Calculate total and percentages
    const total = sources.reduce((sum, s) => sum + Number(s.count), 0);

    return sources.map((s) => ({
      source: s.source,
      count: Number(s.count),
      percentage: parseFloat(((Number(s.count) / total) * 100).toFixed(1)),
    }));
  }

  /**
   * Get recent form submissions
   */
  async getRecentSubmissions(
    workflowId: string,
    limit: number = 10,
  ): Promise<RecentSubmissionDto[]> {
    const submissions = await this.prisma.lead.findMany({
      where: {
        workflowId,
        source: 'FORM',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        sourceMetadata: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return submissions.map((sub) => ({
      id: sub.id,
      name: sub.name,
      email: sub.email,
      company: sub.companyName,
      source:
        (sub.sourceMetadata as any)?.utm?.source ||
        (sub.sourceMetadata as any)?.utmSource ||
        'direct',
      submittedAt: sub.createdAt,
    }));
  }

  /**
   * Helper: Calculate date ranges based on period
   */
  private getDateRanges(period: '7d' | '30d' | '90d'): {
    startDate: Date;
    endDate: Date;
    previousStartDate: Date;
    previousEndDate: Date;
  } {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Previous period (same length)
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    previousEndDate.setHours(23, 59, 59, 999);

    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - days + 1);
    previousStartDate.setHours(0, 0, 0, 0);

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    };
  }

  /**
   * Helper: Calculate percentage change
   */
  private calculatePercentageChange(
    current: number,
    previous: number,
  ): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    const change = ((current - previous) / previous) * 100;
    return parseFloat(change.toFixed(1));
  }

  /**
   * Helper: Get change direction
   */
  private getChangeDirection(
    change: number,
  ): 'up' | 'down' | 'neutral' {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'neutral';
  }
}
