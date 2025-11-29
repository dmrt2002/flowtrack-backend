import { z } from 'zod';

export const dashboardOverviewQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).optional().default('7d'),
  limit: z.coerce.number().min(1).max(100).optional().default(5),
});

export type DashboardOverviewQueryDto = z.infer<
  typeof dashboardOverviewQuerySchema
>;

export const leadsListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  offset: z.coerce.number().min(0).optional().default(0),
  status: z.enum(['new', 'qualified', 'rejected', 'contacted']).optional(),
  sortBy: z
    .enum(['createdAt', 'score', 'lastActivityAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type LeadsListQueryDto = z.infer<typeof leadsListQuerySchema>;

export const metricsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).optional().default('7d'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type MetricsQueryDto = z.infer<typeof metricsQuerySchema>;
