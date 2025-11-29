import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Form Performance Metrics DTO
 * Contains current and period-over-period comparison data
 */
export interface MetricWithChange {
  total: number;
  change: number; // percentage
  changeDirection: 'up' | 'down' | 'neutral';
}

export interface FormPerformanceMetrics {
  submissions: MetricWithChange;
  views: MetricWithChange;
  conversionRate: MetricWithChange;
}

/**
 * Time Series Data Point
 * Single data point for submissions over time chart
 */
export interface SubmissionTimeSeriesPoint {
  date: string; // ISO date format (YYYY-MM-DD)
  submissions: number;
  views: number;
}

/**
 * Lead Source Breakdown
 * Shows top UTM sources with their counts and percentages
 */
export interface LeadSourceBreakdown {
  source: string;
  count: number;
  percentage: number;
}

/**
 * Recent Submission DTO
 * Individual submission in recent submissions list
 */
export interface RecentSubmissionDto {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  source: string; // UTM source or 'direct'
  submittedAt: Date;
}

/**
 * Main Workflow Analytics Response
 * Complete analytics data for a workflow
 */
export interface WorkflowAnalyticsDto {
  workflowId: string;
  workflowName: string;
  period: '7d' | '30d' | '90d';
  formPerformance: FormPerformanceMetrics;
  submissionsOverTime: SubmissionTimeSeriesPoint[];
  topLeadSources: LeadSourceBreakdown[];
  recentSubmissions: RecentSubmissionDto[];
}

/**
 * Query DTO for workflow analytics endpoints
 */
export class WorkflowAnalyticsQueryDto {
  @IsEnum(['7d', '30d', '90d'])
  @IsOptional()
  period?: '7d' | '30d' | '90d' = '30d';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  recentLimit?: number = 10;
}
