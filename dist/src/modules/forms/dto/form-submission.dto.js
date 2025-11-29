"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSubmissionSchema = void 0;
const zod_1 = require("zod");
exports.FormSubmissionSchema = zod_1.z.object({
    fields: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).refine((data) => {
        return 'email' in data;
    }, {
        message: 'Email field is required',
    }),
    tracking: zod_1.z
        .object({
        utk: zod_1.z.string().optional(),
        utmSource: zod_1.z.string().optional(),
        utmMedium: zod_1.z.string().optional(),
        utmCampaign: zod_1.z.string().optional(),
        utmTerm: zod_1.z.string().optional(),
        utmContent: zod_1.z.string().optional(),
        referrer: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
        pageUrl: zod_1.z.string().url().optional(),
        pagePath: zod_1.z.string().optional(),
        userAgent: zod_1.z.string().optional(),
        ipAddress: zod_1.z.string().optional(),
    })
        .optional(),
    metadata: zod_1.z
        .object({
        submittedAt: zod_1.z.string().datetime().optional(),
        formVersion: zod_1.z.string().optional(),
    })
        .optional(),
});
//# sourceMappingURL=form-submission.dto.js.map