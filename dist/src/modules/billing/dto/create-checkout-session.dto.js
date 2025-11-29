"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckoutSessionSchema = void 0;
const zod_1 = require("zod");
exports.createCheckoutSessionSchema = zod_1.z.object({
    planId: zod_1.z
        .string()
        .uuid('Plan ID must be a valid UUID')
        .min(1, 'Plan ID is required'),
    billingCycle: zod_1.z.enum(['monthly', 'yearly']),
    successUrl: zod_1.z
        .string()
        .url('Success URL must be a valid URL')
        .optional(),
    cancelUrl: zod_1.z
        .string()
        .url('Cancel URL must be a valid URL')
        .optional(),
});
//# sourceMappingURL=create-checkout-session.dto.js.map