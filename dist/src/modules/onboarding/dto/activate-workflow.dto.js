"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateWorkflowSchema = void 0;
const zod_1 = require("zod");
exports.activateWorkflowSchema = zod_1.z.object({
    strategyId: zod_1.z.enum(['inbound-leads', 'outbound-sales', 'customer-nurture', 'unified']).optional(),
    configurationId: zod_1.z.string().uuid('Invalid configuration ID'),
});
//# sourceMappingURL=activate-workflow.dto.js.map