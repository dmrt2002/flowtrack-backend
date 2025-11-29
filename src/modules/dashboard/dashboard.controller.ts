import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DashboardService } from './dashboard.service';
import {
  dashboardOverviewQuerySchema,
  leadsListQuerySchema,
  metricsQuerySchema,
  type DashboardOverviewQueryDto,
  type LeadsListQueryDto,
  type MetricsQueryDto,
} from './dto';
import type {
  DashboardOverviewDto,
  DashboardMetricsDto,
  LeadsListDto,
  WorkflowStatusDto,
} from './types';

@Controller('dashboard')
@UseGuards(UnifiedAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private dashboardService: DashboardService) {}

  /**
   * GET /api/v1/dashboard/overview
   * Get complete dashboard data (workflow, metrics, leads)
   */
  @Get('overview')
  async getDashboardOverview(
    @User() user: any,
    @Query(new ZodValidationPipe(dashboardOverviewQuerySchema))
    query: DashboardOverviewQueryDto,
  ): Promise<DashboardOverviewDto> {
    this.logger.log(
      `Dashboard overview requested by user: ${user.email}, workspace: ${user.id}`,
    );

    // Get user's workspace (assuming user has workspaceId or we need to fetch it)
    const workspaceId = await this.getUserWorkspaceId(user.id);

    return this.dashboardService.getDashboardOverview(workspaceId, query);
  }

  /**
   * GET /api/v1/dashboard/workflow
   * Get active workflow status
   */
  @Get('workflow')
  async getActiveWorkflow(
    @User() user: any,
  ): Promise<WorkflowStatusDto | null> {
    this.logger.log(`Active workflow requested by user: ${user.email}`);

    const workspaceId = await this.getUserWorkspaceId(user.id);

    return this.dashboardService.getActiveWorkflow(workspaceId);
  }

  /**
   * GET /api/v1/dashboard/metrics
   * Get dashboard metrics with trends
   */
  @Get('metrics')
  async getDashboardMetrics(
    @User() user: any,
    @Query(new ZodValidationPipe(metricsQuerySchema)) query: MetricsQueryDto,
  ): Promise<DashboardMetricsDto> {
    this.logger.log(`Dashboard metrics requested by user: ${user.email}`);

    const workspaceId = await this.getUserWorkspaceId(user.id);

    return this.dashboardService.getDashboardMetrics(workspaceId, query);
  }

  /**
   * GET /api/v1/dashboard/leads
   * Get leads list with filtering and pagination
   */
  @Get('leads')
  async getLeads(
    @User() user: any,
    @Query(new ZodValidationPipe(leadsListQuerySchema))
    query: LeadsListQueryDto,
  ): Promise<LeadsListDto> {
    this.logger.log(`Leads list requested by user: ${user.email}`);

    const workspaceId = await this.getUserWorkspaceId(user.id);

    return this.dashboardService.getRecentLeads(workspaceId, query);
  }

  /**
   * Helper to get user's workspace ID
   * TODO: This should be optimized - workspace ID could be included in JWT payload
   */
  private async getUserWorkspaceId(userId: string): Promise<string> {
    // For now, get the first workspace the user owns or is a member of
    const user = await this.dashboardService['prisma'].user.findUnique({
      where: { id: userId },
      include: {
        ownedWorkspaces: true,
        workspaceMemberships: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const workspace =
      user.ownedWorkspaces[0] ||
      user.workspaceMemberships[0]?.workspace ||
      null;

    if (!workspace) {
      throw new Error('No workspace found for user');
    }

    return workspace.id;
  }
}
