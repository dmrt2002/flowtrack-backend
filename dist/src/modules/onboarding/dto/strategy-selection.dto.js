"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategySelectionSchema = void 0;
const zod_1 = require("zod");
exports.strategySelectionSchema = zod_1.z.object({
    strategyId: zod_1.z.enum(['inbound-leads', 'outbound-sales', 'customer-nurture']),
    templateId: zod_1.z
        .string()
        .min(1, 'Template ID is required')
        .max(100, 'Template ID must not exceed 100 characters'),
});
//# sourceMappingURL=strategy-selection.dto.js.map