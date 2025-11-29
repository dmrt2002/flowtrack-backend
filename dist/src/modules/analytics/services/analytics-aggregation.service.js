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
var AnalyticsAggregationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsAggregationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../prisma/prisma.service");
let AnalyticsAggregationService = AnalyticsAggregationService_1 = class AnalyticsAggregationService {
    prisma;
    logger = new common_1.Logger(AnalyticsAggregationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async aggregateDailyStats() {
        this.logger.log('🔄 Starting daily analytics aggregation...');
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const startTime = Date.now();
            await this.aggregateFormViews(yesterday);
            await this.aggregateFormSubmissions(yesterday);
            await this.updateConversionRates(yesterday);
            await this.aggregateLeadSources(yesterday);
            const duration = Date.now() - startTime;
            this.logger.log(`✅ Daily analytics aggregation completed in ${duration}ms`);
        }
        catch (error) {
            this.logger.error('❌ Daily analytics aggregation failed:', error);
            throw error;
        }
    }
    async aggregateFormViews(date) {
        this.logger.log(`📊 Aggregating form views for ${date.toISOString().split('T')[0]}...`);
        const result = await this.prisma.$executeRaw `
      INSERT INTO workflow_daily_stats (workflow_id, workspace_id, stat_date, form_views, created_at)
      SELECT
        (related_resource_id)::uuid as workflow_id,
        workspace_id,
        ${date}::date as stat_date,
        SUM(quantity) as form_views,
        NOW() as created_at
      FROM usage_events
      WHERE event_type = 'form_view'
        AND related_resource_type = 'workflow'
        AND DATE(created_at) = ${date}::date
      GROUP BY related_resource_id, workspace_id
      ON CONFLICT (workflow_id, stat_date)
      DO UPDATE SET
        form_views = EXCLUDED.form_views;
    `;
        this.logger.log(`✓ Aggregated form views: ${result} rows affected`);
    }
    async aggregateFormSubmissions(date) {
        this.logger.log(`📊 Aggregating form submissions for ${date.toISOString().split('T')[0]}...`);
        const result = await this.prisma.$executeRaw `
      INSERT INTO workflow_daily_stats (workflow_id, workspace_id, stat_date, form_submissions, created_at)
      SELECT
        workflow_id,
        workspace_id,
        ${date}::date as stat_date,
        COUNT(*) as form_submissions,
        NOW() as created_at
      FROM leads
      WHERE source = 'FORM'
        AND DATE(created_at) = ${date}::date
        AND deleted_at IS NULL
      GROUP BY workflow_id, workspace_id
      ON CONFLICT (workflow_id, stat_date)
      DO UPDATE SET
        form_submissions = EXCLUDED.form_submissions;
    `;
        this.logger.log(`✓ Aggregated form submissions: ${result} rows affected`);
    }
    async updateConversionRates(date) {
        this.logger.log(`📊 Updating conversion rates for ${date.toISOString().split('T')[0]}...`);
        const result = await this.prisma.$executeRaw `
      UPDATE workflow_daily_stats
      SET conversion_rate = CASE
        WHEN form_views > 0 THEN (form_submissions::DECIMAL / form_views * 100)
        ELSE NULL
      END
      WHERE stat_date = ${date}::date;
    `;
        this.logger.log(`✓ Updated conversion rates: ${result} rows affected`);
    }
    async aggregateLeadSources(date) {
        this.logger.log(`📊 Aggregating lead sources for ${date.toISOString().split('T')[0]}...`);
        const workflowsWithSubmissions = await this.prisma.$queryRaw `
      SELECT DISTINCT workflow_id
      FROM leads
      WHERE source = 'FORM'
        AND DATE(created_at) = ${date}::date
        AND deleted_at IS NULL;
    `;
        if (workflowsWithSubmissions.length === 0) {
            this.logger.log('✓ No submissions to aggregate');
            return;
        }
        let updatedCount = 0;
        for (const { workflow_id } of workflowsWithSubmissions) {
            const topSources = await this.prisma.$queryRaw `
        SELECT
          COALESCE(
            source_metadata->'utm'->>'source',
            'direct'
          ) as source,
          COUNT(*) as count
        FROM leads
        WHERE workflow_id = ${workflow_id}::uuid
          AND DATE(created_at) = ${date}::date
          AND deleted_at IS NULL
          AND source = 'FORM'
        GROUP BY COALESCE(source_metadata->'utm'->>'source', 'direct')
        ORDER BY count DESC
        LIMIT 5;
      `;
            if (topSources.length > 0) {
                const sourcesJson = topSources.map((s) => ({
                    source: s.source,
                    count: Number(s.count),
                }));
                await this.prisma.workflowDailyStat.updateMany({
                    where: {
                        workflowId: workflow_id,
                        statDate: date,
                    },
                    data: {
                        topLeadSources: sourcesJson,
                    },
                });
                updatedCount++;
            }
        }
        this.logger.log(`✓ Aggregated lead sources for ${updatedCount} workflows`);
    }
    async backfillHistoricalData(startDate, endDate) {
        this.logger.log(`🔄 Backfilling analytics from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            await this.aggregateFormViews(currentDate);
            await this.aggregateFormSubmissions(currentDate);
            await this.updateConversionRates(currentDate);
            await this.aggregateLeadSources(currentDate);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        this.logger.log('✅ Historical data backfill completed');
    }
};
exports.AnalyticsAggregationService = AnalyticsAggregationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_1AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsAggregationService.prototype, "aggregateDailyStats", null);
exports.AnalyticsAggregationService = AnalyticsAggregationService = AnalyticsAggregationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsAggregationService);
//# sourceMappingURL=analytics-aggregation.service.js.map