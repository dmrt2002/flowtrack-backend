import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { DashboardOverviewDto, DashboardMetricsDto, WorkflowStatusDto, LeadsListDto } from './types';
import type { DashboardOverviewQueryDto, LeadsListQueryDto, MetricsQueryDto } from './dto';
export declare class DashboardService {
    private prisma;
    private config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    getDashboardOverview(workspaceId: string, query: DashboardOverviewQueryDto): Promise<DashboardOverviewDto>;
    getActiveWorkflow(workspaceId: string): Promise<WorkflowStatusDto | null>;
    getDashboardMetrics(workspaceId: string, query: MetricsQueryDto): Promise<DashboardMetricsDto>;
    getRecentLeads(workspaceId: string, query: LeadsListQueryDto): Promise<LeadsListDto>;
    private getAggregatedStats;
    private calculateAvgTimeToReply;
    private calculateTrend;
    private getPeriodDates;
    private getPreviousPeriodDates;
    private formatHours;
}
