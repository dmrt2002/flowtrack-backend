"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulationSchema = void 0;
const zod_1 = require("zod");
exports.simulationSchema = zod_1.z.object({
    strategyId: zod_1.z.enum(['inbound-leads', 'outbound-sales', 'customer-nurture', 'unified']).optional(),
    configurationId: zod_1.z.string().uuid('Invalid configuration ID'),
});
//# sourceMappingURL=simulation.dto.js.map