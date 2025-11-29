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
var WorkflowAnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let WorkflowAnalyticsService = WorkflowAnalyticsService_1 = class WorkflowAnalyticsService {
    prisma;
    logger = new common_1.Logger(WorkflowAnalyticsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getWorkflowAnalytics(workflowId, query) {
        const workflow = await this.prisma.workflow.findUnique({
            where: { id: workflowId },
            select: { id: true, name: true },
        });
        if (!workflow) {
            throw new common_1.NotFoundException(`Workflow not found: ${workflowId}`);
        }
        const { startDate, endDate, previousStartDate, previousEndDate } = this.getDateRanges(query.period || '30d');
        const [formPerformance, submissionsOverTime, topLeadSources, recentSubmissions,] = await Promise.all([
            this.getFormPerformanceMetrics(workflowId, startDate, endDate, previousStartDate, previousEndDate),
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
    async getFormPerformanceMetrics(workflowId, startDate, endDate, previousStartDate, previousEndDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isCurrentPeriodIncludesToday = endDate >= today;
        const [currentStats, previousStats, todayStats] = await Promise.all([
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
            isCurrentPeriodIncludesToday
                ? this.getRealtimeStatsForToday(workflowId)
                : Promise.resolve({ views: 0, submissions: 0 }),
        ]);
        const currentViews = (currentStats._sum.formViews || 0) + todayStats.views;
        const currentSubmissions = (currentStats._sum.formSubmissions || 0) + todayStats.submissions;
        const previousViews = previousStats._sum.formViews || 0;
        const previousSubmissions = previousStats._sum.formSubmissions || 0;
        const currentConversionRate = currentViews > 0 ? (currentSubmissions / currentViews) * 100 : 0;
        const previousConversionRate = previousViews > 0 ? (previousSubmissions / previousViews) * 100 : 0;
        const submissionsChange = this.calculatePercentageChange(currentSubmissions, previousSubmissions);
        const viewsChange = this.calculatePercentageChange(currentViews, previousViews);
        const conversionChange = this.calculatePercentageChange(currentConversionRate, previousConversionRate);
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
    async getRealtimeStatsForToday(workflowId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [viewsResult, submissionsResult] = await Promise.all([
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
    async getSubmissionsTimeSeries(workflowId, startDate, endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const historicalData = await this.prisma.workflowDailyStat.findMany({
            where: {
                workflowId,
                statDate: {
                    gte: startDate,
                    lt: today,
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
        const timeSeries = historicalData.map((stat) => ({
            date: stat.statDate.toISOString().split('T')[0],
            submissions: stat.formSubmissions,
            views: stat.formViews,
        }));
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
    async getTopLeadSources(workflowId, startDate, endDate, limit = 5) {
        const sources = await this.prisma.$queryRaw `
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
        const total = sources.reduce((sum, s) => sum + Number(s.count), 0);
        return sources.map((s) => ({
            source: s.source,
            count: Number(s.count),
            percentage: parseFloat(((Number(s.count) / total) * 100).toFixed(1)),
        }));
    }
    async getRecentSubmissions(workflowId, limit = 10) {
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
            source: sub.sourceMetadata?.utm?.source ||
                sub.sourceMetadata?.utmSource ||
                'direct',
            submittedAt: sub.createdAt,
        }));
    }
    getDateRanges(period) {
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
    calculatePercentageChange(current, previous) {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        const change = ((current - previous) / previous) * 100;
        return parseFloat(change.toFixed(1));
    }
    getChangeDirection(change) {
        if (change > 0)
            return 'up';
        if (change < 0)
            return 'down';
        return 'neutral';
    }
};
exports.WorkflowAnalyticsService = WorkflowAnalyticsService;
exports.WorkflowAnalyticsService = WorkflowAnalyticsService = WorkflowAnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkflowAnalyticsService);
//# sourceMappingURL=workflow-analytics.service.js.map