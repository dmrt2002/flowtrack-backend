import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UnifiedAuthGuard } from '../../../auth/guards/unified-auth.guard';
import { WorkflowAnalyticsService } from '../services/workflow-analytics.service';
import {
  WorkflowAnalyticsDto,
  WorkflowAnalyticsQueryDto,
  FormPerformanceMetrics,
  SubmissionTimeSeriesPoint,
  LeadSourceBreakdown,
  RecentSubmissionDto,
} from '../dto/workflow-analytics.dto';

/**
 * Workflow Analytics Controller
 * Provides analytics endpoints for workflow form performance
 */
@Controller('analytics/workflows')
@UseGuards(UnifiedAuthGuard)
export class WorkflowAnalyticsController {
  constructor(
    private readonly analyticsService: WorkflowAnalyticsService,
  ) {}

  /**
   * Get complete analytics for a workflow
   * @example GET /api/v1/analytics/workflows/:workflowId?period=30d
   */
  @Get(':workflowId')
  @HttpCode(HttpStatus.OK)
  async getWorkflowAnalytics(
    @Param('workflowId') workflowId: string,
    @Query() query: WorkflowAnalyticsQueryDto,
  ): Promise<WorkflowAnalyticsDto> {
    return this.analyticsService.getWorkflowAnalytics(workflowId, query);
  }

  /**
   * Get form performance metrics only
   * @example GET /api/v1/analytics/workflows/:workflowId/performance?period=30d
   */
  @Get(':workflowId/performance')
  @HttpCode(HttpStatus.OK)
  async getFormPerformance(
    @Param('workflowId') workflowId: string,
    @Query() query: WorkflowAnalyticsQueryDto,
  ): Promise<FormPerformanceMetrics> {
    const { startDate, endDate, previousStartDate, previousEndDate } =
      this.getDateRanges(query.period || '30d');

    return this.analyticsService.getFormPerformanceMetrics(
      workflowId,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    );
  }

  /**
   * Get time series data for submissions chart
   * @example GET /api/v1/analytics/workflows/:workflowId/time-series?period=30d
   */
  @Get(':workflowId/time-series')
  @HttpCode(HttpStatus.OK)
  async getTimeSeries(
    @Param('workflowId') workflowId: string,
    @Query() query: WorkflowAnalyticsQueryDto,
  ): Promise<SubmissionTimeSeriesPoint[]> {
    const { startDate, endDate } = this.getDateRanges(query.period || '30d');
    return this.analyticsService.getSubmissionsTimeSeries(
      workflowId,
      startDate,
      endDate,
    );
  }

  /**
   * Get top lead sources
   * @example GET /api/v1/analytics/workflows/:workflowId/sources?period=30d
   */
  @Get(':workflowId/sources')
  @HttpCode(HttpStatus.OK)
  async getLeadSources(
    @Param('workflowId') workflowId: string,
    @Query() query: WorkflowAnalyticsQueryDto,
  ): Promise<LeadSourceBreakdown[]> {
    const { startDate, endDate } = this.getDateRanges(query.period || '30d');
    return this.analyticsService.getTopLeadSources(
      workflowId,
      startDate,
      endDate,
      5,
    );
  }

  /**
   * Get recent submissions
   * @example GET /api/v1/analytics/workflows/:workflowId/recent?recentLimit=10
   */
  @Get(':workflowId/recent')
  @HttpCode(HttpStatus.OK)
  async getRecentSubmissions(
    @Param('workflowId') workflowId: string,
    @Query() query: WorkflowAnalyticsQueryDto,
  ): Promise<RecentSubmissionDto[]> {
    return this.analyticsService.getRecentSubmissions(
      workflowId,
      query.recentLimit || 10,
    );
  }

  /**
   * Helper: Calculate date ranges (duplicate from service for controller use)
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
}
