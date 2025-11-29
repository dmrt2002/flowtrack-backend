import { PrismaService } from '../../../prisma/prisma.service';
import type { WorkflowAnalyticsDto, WorkflowAnalyticsQueryDto, FormPerformanceMetrics, SubmissionTimeSeriesPoint, LeadSourceBreakdown, RecentSubmissionDto } from '../dto/workflow-analytics.dto';
export declare class WorkflowAnalyticsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getWorkflowAnalytics(workflowId: string, query: WorkflowAnalyticsQueryDto): Promise<WorkflowAnalyticsDto>;
    getFormPerformanceMetrics(workflowId: string, startDate: Date, endDate: Date, previousStartDate: Date, previousEndDate: Date): Promise<FormPerformanceMetrics>;
    private getRealtimeStatsForToday;
    getSubmissionsTimeSeries(workflowId: string, startDate: Date, endDate: Date): Promise<SubmissionTimeSeriesPoint[]>;
    getTopLeadSources(workflowId: string, startDate: Date, endDate: Date, limit?: number): Promise<LeadSourceBreakdown[]>;
    getRecentSubmissions(workflowId: string, limit?: number): Promise<RecentSubmissionDto[]>;
    private getDateRanges;
    private calculatePercentageChange;
    private getChangeDirection;
}
