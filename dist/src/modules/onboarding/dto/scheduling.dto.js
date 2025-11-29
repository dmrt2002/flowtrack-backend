"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulingPreferenceSchema = void 0;
const zod_1 = require("zod");
exports.schedulingPreferenceSchema = zod_1.z.object({
    workflowId: zod_1.z.string().uuid('Invalid workflow ID'),
    schedulingType: zod_1.z.enum(['CALENDLY', 'GOOGLE_MEET'], {
        message: 'Scheduling type must be CALENDLY or GOOGLE_MEET',
    }),
    calendlyLink: zod_1.z
        .string()
        .url('Invalid Calendly URL')
        .refine((url) => url.includes('calendly.com'), {
        message: 'Must be a valid Calendly link',
    })
        .optional(),
});
//# sourceMappingURL=scheduling.dto.js.map