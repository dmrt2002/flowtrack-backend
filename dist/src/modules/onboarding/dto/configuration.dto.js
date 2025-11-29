"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurationSchema = void 0;
const zod_1 = require("zod");
const conditionSchema = zod_1.z.object({
    field: zod_1.z.string().min(1),
    operator: zod_1.z.enum(['>', '<', '>=', '<=', '==', '!=']),
    value: zod_1.z.number().min(0),
    currency: zod_1.z.enum(['USD', 'INR']),
});
exports.configurationSchema = zod_1.z.object({
    strategyId: zod_1.z.enum(['inbound-leads', 'outbound-sales', 'customer-nurture', 'unified']).optional(),
    configuration: zod_1.z.record(zod_1.z.string(), zod_1.z.union([
        zod_1.z.string(),
        zod_1.z.number(),
        zod_1.z.boolean(),
        conditionSchema,
    ])),
});
//# sourceMappingURL=configuration.dto.js.map