import { z } from 'zod';
export declare const dashboardOverviewQuerySchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        "7d": "7d";
        "30d": "30d";
        "90d": "90d";
    }>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export type DashboardOverviewQueryDto = z.infer<typeof dashboardOverviewQuerySchema>;
export declare const leadsListQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    status: z.ZodOptional<z.ZodEnum<{
        new: "new";
        qualified: "qualified";
        rejected: "rejected";
        contacted: "contacted";
    }>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        createdAt: "createdAt";
        score: "score";
        lastActivityAt: "lastActivityAt";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
}, z.core.$strip>;
export type LeadsListQueryDto = z.infer<typeof leadsListQuerySchema>;
export declare const metricsQuerySchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        "7d": "7d";
        "30d": "30d";
        "90d": "90d";
    }>>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type MetricsQueryDto = z.infer<typeof metricsQuerySchema>;
