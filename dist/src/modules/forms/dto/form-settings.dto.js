"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicFormSettingsSchema = exports.updateFormSettingsSchema = void 0;
const zod_1 = require("zod");
const richTextJsonSchema = zod_1.z.object({
    type: zod_1.z.literal('doc'),
    content: zod_1.z.array(zod_1.z.any()).optional(),
});
exports.updateFormSettingsSchema = zod_1.z.object({
    workflowId: zod_1.z.string().uuid(),
    formHeader: zod_1.z.string().max(500).optional().nullable(),
    formHeaderRich: richTextJsonSchema.optional().nullable(),
    showFormHeader: zod_1.z.boolean().default(true),
    formDescription: zod_1.z.string().max(2000).optional().nullable(),
    formDescriptionRich: richTextJsonSchema.optional().nullable(),
    showFormDescription: zod_1.z.boolean().default(true),
    submitButtonText: zod_1.z.string().min(1).max(50).default('Submit'),
    successMessage: zod_1.z.string().min(1).max(500).default('Thank you! We\'ll be in touch soon.'),
    redirectUrl: zod_1.z.string().url().optional().nullable(),
});
exports.publicFormSettingsSchema = zod_1.z.object({
    formHeader: zod_1.z.string().nullable(),
    formHeaderRich: richTextJsonSchema.nullable(),
    showFormHeader: zod_1.z.boolean(),
    formDescription: zod_1.z.string().nullable(),
    formDescriptionRich: richTextJsonSchema.nullable(),
    showFormDescription: zod_1.z.boolean(),
    submitButtonText: zod_1.z.string(),
    successMessage: zod_1.z.string(),
    redirectUrl: zod_1.z.string().nullable(),
    theme: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
//# sourceMappingURL=form-settings.dto.js.map