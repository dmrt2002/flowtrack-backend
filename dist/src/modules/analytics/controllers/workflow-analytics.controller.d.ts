import { WorkflowAnalyticsService } from '../services/workflow-analytics.service';
import { WorkflowAnalyticsDto, WorkflowAnalyticsQueryDto, FormPerformanceMetrics, SubmissionTimeSeriesPoint, LeadSourceBreakdown, RecentSubmissionDto } from '../dto/workflow-analytics.dto';
export declare class WorkflowAnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: WorkflowAnalyticsService);
    getWorkflowAnalytics(workflowId: string, query: WorkflowAnalyticsQueryDto): Promise<WorkflowAnalyticsDto>;
    getFormPerformance(workflowId: string, query: WorkflowAnalyticsQueryDto): Promise<FormPerformanceMetrics>;
    getTimeSeries(workflowId: string, query: WorkflowAnalyticsQueryDto): Promise<SubmissionTimeSeriesPoint[]>;
    getLeadSources(workflowId: string, query: WorkflowAnalyticsQueryDto): Promise<LeadSourceBreakdown[]>;
    getRecentSubmissions(workflowId: string, query: WorkflowAnalyticsQueryDto): Promise<RecentSubmissionDto[]>;
    private getDateRanges;
}
