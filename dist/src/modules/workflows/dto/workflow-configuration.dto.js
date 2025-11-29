"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkflowConfigurationResponseSchema = exports.workflowConfigurationSchema = void 0;
const zod_1 = require("zod");
exports.workflowConfigurationSchema = zod_1.z.object({
    workflowId: zod_1.z.string().uuid(),
    welcomeSubject: zod_1.z.string().optional(),
    welcomeBody: zod_1.z.string().optional(),
    thankYouSubject: zod_1.z.string().optional(),
    thankYouBody: zod_1.z.string().optional(),
    followUpSubject: zod_1.z.string().optional(),
    followUpBody: zod_1.z.string().optional(),
    followUpDelayDays: zod_1.z.number().int().min(1).max(7).optional(),
    deadlineDays: zod_1.z.number().int().min(1).max(30).optional(),
});
exports.getWorkflowConfigurationResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        workflowId: zod_1.z.string().uuid(),
        welcomeSubject: zod_1.z.string().nullable(),
        welcomeBody: zod_1.z.string().nullable(),
        thankYouSubject: zod_1.z.string().nullable(),
        thankYouBody: zod_1.z.string().nullable(),
        followUpSubject: zod_1.z.string().nullable(),
        followUpBody: zod_1.z.string().nullable(),
        followUpDelayDays: zod_1.z.number().nullable(),
        deadlineDays: zod_1.z.number().nullable(),
    }),
});
//# sourceMappingURL=workflow-configuration.dto.js.map