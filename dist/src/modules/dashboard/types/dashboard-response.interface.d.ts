export interface WorkflowStatusDto {
    id: string;
    name: string;
    status: string;
    strategyName: string | null;
    publicFormUrl: string;
    activatedAt: Date | null;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
}
export interface TrendDto {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
}
export interface DashboardMetricsDto {
    totalLeads: number;
    qualifiedLeads: number;
    rejectedLeads: number;
    pendingLeads: number;
    avgTimeToReply: string;
    conversionRate: number;
    emailsSent: number;
    emailsOpened: number;
    emailOpenRate: number;
    executionCount: number;
    executionSuccessRate: number;
    trends: {
        totalLeads: TrendDto;
        qualifiedLeads: TrendDto;
        avgTimeToReply: TrendDto;
        conversionRate: TrendDto;
    };
}
export interface LeadSummaryDto {
    id: string;
    name: string | null;
    email: string;
    company: string | null;
    status: string;
    source: string;
    score: number | null;
    tags: string[];
    createdAt: Date;
}
export interface LeadsListDto {
    data: LeadSummaryDto[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}
export interface DashboardOverviewDto {
    workflow: WorkflowStatusDto | null;
    metrics: DashboardMetricsDto;
    leads: LeadsListDto;
}
