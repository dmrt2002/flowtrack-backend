import { DashboardService } from './dashboard.service';
import { type DashboardOverviewQueryDto, type LeadsListQueryDto, type MetricsQueryDto } from './dto';
import type { DashboardOverviewDto, DashboardMetricsDto, LeadsListDto, WorkflowStatusDto } from './types';
export declare class DashboardController {
    private dashboardService;
    private readonly logger;
    constructor(dashboardService: DashboardService);
    getDashboardOverview(user: any, query: DashboardOverviewQueryDto): Promise<DashboardOverviewDto>;
    getActiveWorkflow(user: any): Promise<WorkflowStatusDto | null>;
    getDashboardMetrics(user: any, query: MetricsQueryDto): Promise<DashboardMetricsDto>;
    getLeads(user: any, query: LeadsListQueryDto): Promise<LeadsListDto>;
    private getUserWorkspaceId;
}
