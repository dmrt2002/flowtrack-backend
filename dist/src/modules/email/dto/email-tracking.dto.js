"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTrackingPayloadSchema = void 0;
const zod_1 = require("zod");
exports.emailTrackingPayloadSchema = zod_1.z.object({
    leadId: zod_1.z.string().uuid(),
    workflowExecutionId: zod_1.z.string().uuid(),
    emailType: zod_1.z.enum(['welcome', 'thank_you', 'follow_up']),
    sentAt: zod_1.z.number(),
});
//# sourceMappingURL=email-tracking.dto.js.map