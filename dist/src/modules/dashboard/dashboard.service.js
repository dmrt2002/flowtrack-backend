"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DashboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DashboardService = DashboardService_1 = class DashboardService {
    prisma;
    config;
    logger = new common_1.Logger(DashboardService_1.name);
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async getDashboardOverview(workspaceId, query) {
        this.logger.log(`Getting dashboard overview for workspace: ${workspaceId}, period: ${query.period}`);
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
    async getActiveWorkflow(workspaceId) {
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
            strategyName: workflow.strategyId,
            publicFormUrl,
            activatedAt: workflow.updatedAt,
            totalExecutions: workflow.totalExecutions || 0,
            successfulExecutions: workflow.successfulExecutions || 0,
            failedExecutions: workflow.failedExecutions || 0,
        };
    }
    async getDashboardMetrics(workspaceId, query) {
        const { startDate, endDate } = this.getPeriodDates(query.period);
        const { startDate: prevStartDate, endDate: prevEndDate } = this.getPreviousPeriodDates(query.period);
        this.logger.log(`Calculating metrics for ${startDate} to ${endDate}, comparing with ${prevStartDate} to ${prevEndDate}`);
        const [currentStats, previousStats, avgReplyTime, prevAvgReplyTime] = await Promise.all([
            this.getAggregatedStats(workspaceId, startDate, endDate),
            this.getAggregatedStats(workspaceId, prevStartDate, prevEndDate),
            this.calculateAvgTimeToReply(workspaceId, startDate, endDate),
            this.calculateAvgTimeToReply(workspaceId, prevStartDate, prevEndDate),
        ]);
        const totalLeads = currentStats.totalLeads;
        const qualifiedLeads = currentStats.qualifiedLeads;
        const rejectedLeads = currentStats.rejectedLeads;
        const pendingLeads = currentStats.pendingLeads;
        const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
        const emailOpenRate = currentStats.emailsSent > 0
            ? (currentStats.emailsOpened / currentStats.emailsSent) * 100
            : 0;
        const executionSuccessRate = currentStats.executionCount > 0
            ? (currentStats.successfulExecutions / currentStats.executionCount) *
                100
            : 0;
        const trends = {
            totalLeads: this.calculateTrend(totalLeads, previousStats.totalLeads, 'leads'),
            qualifiedLeads: this.calculateTrend(qualifiedLeads, previousStats.qualifiedLeads, 'leads'),
            avgTimeToReply: this.calculateTrend(avgReplyTime, prevAvgReplyTime, 'time', true),
            conversionRate: this.calculateTrend(conversionRate, previousStats.totalLeads > 0
                ? (previousStats.qualifiedLeads / previousStats.totalLeads) * 100
                : 0, 'percentage'),
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
    async getRecentLeads(workspaceId, query) {
        const { limit, offset, status, sortBy, sortOrder } = query;
        const statusMap = {
            new: client_1.LeadStatus.NEW,
            qualified: client_1.LeadStatus.RESPONDED,
            rejected: client_1.LeadStatus.LOST,
            contacted: client_1.LeadStatus.EMAIL_SENT,
        };
        const where = {
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
        const data = leads.map((lead) => ({
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
    async getAggregatedStats(workspaceId, startDate, endDate) {
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
        const qualifiedLeads = leadStats.find((s) => s.status === client_1.LeadStatus.RESPONDED)?._count.id || 0;
        const rejectedLeads = leadStats.find((s) => s.status === client_1.LeadStatus.LOST)?._count.id || 0;
        const pendingLeads = leadStats.find((s) => s.status === client_1.LeadStatus.NEW)?._count.id || 0;
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
                successfulExecutions: result._count.id,
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
    async calculateAvgTimeToReply(workspaceId, startDate, endDate) {
        const result = await this.prisma.$queryRaw `
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
    calculateTrend(current, previous, unit, inversed = false) {
        if (previous === 0) {
            return {
                value: 0,
                direction: 'neutral',
                label: 'No previous data',
            };
        }
        const percentChange = ((current - previous) / previous) * 100;
        const roundedChange = Math.round(Math.abs(percentChange));
        let direction = 'neutral';
        if (percentChange > 0) {
            direction = inversed ? 'down' : 'up';
        }
        else if (percentChange < 0) {
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
    getPeriodDates(period) {
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
    getPreviousPeriodDates(period) {
        const { startDate, endDate } = this.getPeriodDates(period);
        const duration = endDate.getTime() - startDate.getTime();
        const prevEndDate = new Date(startDate.getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - duration);
        prevStartDate.setHours(0, 0, 0, 0);
        prevEndDate.setHours(23, 59, 59, 999);
        return { startDate: prevStartDate, endDate: prevEndDate };
    }
    formatHours(hours) {
        if (hours === 0)
            return '0h';
        if (hours < 1)
            return `${Math.round(hours * 60)}m`;
        if (hours < 24)
            return `${Math.round(hours * 10) / 10}h`;
        const days = Math.floor(hours / 24);
        const remainingHours = Math.round((hours % 24) * 10) / 10;
        return `${days}d ${remainingHours}h`;
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = DashboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map