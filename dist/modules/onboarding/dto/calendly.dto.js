"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendlySchema = void 0;
const zod_1 = require("zod");
exports.calendlySchema = zod_1.z.object({
    workflowId: zod_1.z.string().uuid('Invalid workflow ID'),
    calendlyLink: zod_1.z
        .string()
        .url('Invalid Calendly URL')
        .refine((url) => url.includes('calendly.com'), {
        message: 'Must be a valid Calendly link',
    }),
});
//# sourceMappingURL=calendly.dto.js.map