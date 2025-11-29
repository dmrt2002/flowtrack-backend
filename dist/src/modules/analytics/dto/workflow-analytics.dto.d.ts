export interface MetricWithChange {
    total: number;
    change: number;
    changeDirection: 'up' | 'down' | 'neutral';
}
export interface FormPerformanceMetrics {
    submissions: MetricWithChange;
    views: MetricWithChange;
    conversionRate: MetricWithChange;
}
export interface SubmissionTimeSeriesPoint {
    date: string;
    submissions: number;
    views: number;
}
export interface LeadSourceBreakdown {
    source: string;
    count: number;
    percentage: number;
}
export interface RecentSubmissionDto {
    id: string;
    name: string | null;
    email: string;
    company: string | null;
    source: string;
    submittedAt: Date;
}
export interface WorkflowAnalyticsDto {
    workflowId: string;
    workflowName: string;
    period: '7d' | '30d' | '90d';
    formPerformance: FormPerformanceMetrics;
    submissionsOverTime: SubmissionTimeSeriesPoint[];
    topLeadSources: LeadSourceBreakdown[];
    recentSubmissions: RecentSubmissionDto[];
}
export declare class WorkflowAnalyticsQueryDto {
    period?: '7d' | '30d' | '90d';
    recentLimit?: number;
}
