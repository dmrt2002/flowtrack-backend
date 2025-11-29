"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsQuerySchema = exports.leadsListQuerySchema = exports.dashboardOverviewQuerySchema = void 0;
const zod_1 = require("zod");
exports.dashboardOverviewQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['7d', '30d', '90d']).optional().default('7d'),
    limit: zod_1.z.coerce.number().min(1).max(100).optional().default(5),
});
exports.leadsListQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().min(1).max(100).optional().default(10),
    offset: zod_1.z.coerce.number().min(0).optional().default(0),
    status: zod_1.z.enum(['new', 'qualified', 'rejected', 'contacted']).optional(),
    sortBy: zod_1.z
        .enum(['createdAt', 'score', 'lastActivityAt'])
        .optional()
        .default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
});
exports.metricsQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['7d', '30d', '90d']).optional().default('7d'),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
//# sourceMappingURL=dashboard-query.dto.js.map