import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Analytics Aggregation Service
 * Runs daily cron jobs to aggregate workflow analytics data
 */
@Injectable()
export class AnalyticsAggregationService {
  private readonly logger = new Logger(AnalyticsAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily cron job to aggregate previous day's analytics
   * Runs at 1:00 AM every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async aggregateDailyStats() {
    this.logger.log('🔄 Starting daily analytics aggregation...');

    try {
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const startTime = Date.now();

      // Run aggregations in sequence
      await this.aggregateFormViews(yesterday);
      await this.aggregateFormSubmissions(yesterday);
      await this.updateConversionRates(yesterday);
      await this.aggregateLeadSources(yesterday);

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Daily analytics aggregation completed in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('❌ Daily analytics aggregation failed:', error);
      throw error;
    }
  }

  /**
   * Aggregate form views from usage_events
   */
  private async aggregateFormViews(date: Date): Promise<void> {
    this.logger.log(`📊 Aggregating form views for ${date.toISOString().split('T')[0]}...`);

    const result = await this.prisma.$executeRaw`
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

  /**
   * Aggregate form submissions from leads table
   */
  private async aggregateFormSubmissions(date: Date): Promise<void> {
    this.logger.log(`📊 Aggregating form submissions for ${date.toISOString().split('T')[0]}...`);

    const result = await this.prisma.$executeRaw`
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

  /**
   * Calculate and update conversion rates
   */
  private async updateConversionRates(date: Date): Promise<void> {
    this.logger.log(`📊 Updating conversion rates for ${date.toISOString().split('T')[0]}...`);

    const result = await this.prisma.$executeRaw`
      UPDATE workflow_daily_stats
      SET conversion_rate = CASE
        WHEN form_views > 0 THEN (form_submissions::DECIMAL / form_views * 100)
        ELSE NULL
      END
      WHERE stat_date = ${date}::date;
    `;

    this.logger.log(`✓ Updated conversion rates: ${result} rows affected`);
  }

  /**
   * Aggregate top lead sources for each workflow
   */
  private async aggregateLeadSources(date: Date): Promise<void> {
    this.logger.log(`📊 Aggregating lead sources for ${date.toISOString().split('T')[0]}...`);

    // Get all workflows that had submissions on this date
    const workflowsWithSubmissions = await this.prisma.$queryRaw<
      Array<{ workflow_id: string }>
    >`
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

    // For each workflow, calculate top sources
    let updatedCount = 0;
    for (const { workflow_id } of workflowsWithSubmissions) {
      const topSources = await this.prisma.$queryRaw<
        Array<{ source: string; count: bigint }>
      >`
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
        // Format sources as JSON array
        const sourcesJson = topSources.map((s) => ({
          source: s.source,
          count: Number(s.count),
        }));

        // Update the daily stat record
        await this.prisma.workflowDailyStat.updateMany({
          where: {
            workflowId: workflow_id,
            statDate: date,
          },
          data: {
            topLeadSources: sourcesJson as any,
          },
        });

        updatedCount++;
      }
    }

    this.logger.log(`✓ Aggregated lead sources for ${updatedCount} workflows`);
  }

  /**
   * Manual trigger for backfilling historical data
   * Can be called via API endpoint for admin use
   */
  async backfillHistoricalData(startDate: Date, endDate: Date): Promise<void> {
    this.logger.log(
      `🔄 Backfilling analytics from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`,
    );

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      await this.aggregateFormViews(currentDate);
      await this.aggregateFormSubmissions(currentDate);
      await this.updateConversionRates(currentDate);
      await this.aggregateLeadSources(currentDate);

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.logger.log('✅ Historical data backfill completed');
  }
}
