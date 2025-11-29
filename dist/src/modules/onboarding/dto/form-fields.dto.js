"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formFieldsSchema = void 0;
const zod_1 = require("zod");
const formFieldOptionSchema = zod_1.z.object({
    value: zod_1.z.string().min(1, 'Option value is required'),
    label: zod_1.z.string().min(1, 'Option label is required'),
});
const validationRulesSchema = zod_1.z.object({
    minLength: zod_1.z.number().int().positive().optional(),
    maxLength: zod_1.z.number().int().positive().optional(),
    min: zod_1.z.number().optional(),
    max: zod_1.z.number().optional(),
    pattern: zod_1.z.string().optional(),
    step: zod_1.z.number().optional(),
    minDate: zod_1.z.string().optional(),
    maxDate: zod_1.z.string().optional(),
});
const formFieldSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    fieldKey: zod_1.z
        .string()
        .min(1, 'Field key is required')
        .max(50, 'Field key must not exceed 50 characters')
        .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Field key must start with a letter and contain only letters, numbers, and underscores'),
    label: zod_1.z
        .string()
        .min(1, 'Label is required')
        .max(150, 'Label must not exceed 150 characters'),
    fieldType: zod_1.z.enum([
        'TEXT',
        'EMAIL',
        'NUMBER',
        'DROPDOWN',
        'TEXTAREA',
        'DATE',
        'CHECKBOX',
    ]),
    placeholder: zod_1.z.string().max(255, 'Placeholder must not exceed 255 characters').optional(),
    helpText: zod_1.z.string().optional(),
    isRequired: zod_1.z.boolean().default(true),
    options: zod_1.z.array(formFieldOptionSchema).optional(),
    validationRules: validationRulesSchema.optional(),
    displayOrder: zod_1.z.number().int().min(0, 'Display order must be >= 0'),
    isDefault: zod_1.z.boolean().optional(),
});
const richTextJsonSchema = zod_1.z.object({
    type: zod_1.z.literal('doc'),
    content: zod_1.z.array(zod_1.z.any()).optional(),
});
const formSettingsSchema = zod_1.z.object({
    formHeader: zod_1.z.string().max(500).optional().nullable(),
    formHeaderRich: richTextJsonSchema.optional().nullable(),
    showFormHeader: zod_1.z.boolean().default(true),
    formDescription: zod_1.z.string().max(2000).optional().nullable(),
    formDescriptionRich: richTextJsonSchema.optional().nullable(),
    showFormDescription: zod_1.z.boolean().default(true),
    submitButtonText: zod_1.z.string().min(1).max(50).optional(),
    successMessage: zod_1.z.string().min(1).max(500).optional(),
    redirectUrl: zod_1.z.string().url().optional().nullable(),
});
exports.formFieldsSchema = zod_1.z.object({
    workflowId: zod_1.z.string().uuid('Workflow ID must be a valid UUID'),
    formFields: zod_1.z
        .array(formFieldSchema)
        .refine((fields) => {
        if (fields.length === 0)
            return true;
        const fieldKeys = fields.map((f) => f.fieldKey);
        return new Set(fieldKeys).size === fieldKeys.length;
    }, {
        message: 'Field keys must be unique',
    })
        .refine((fields) => {
        if (fields.length === 0)
            return true;
        return fields.every((field) => {
            if (field.fieldType === 'DROPDOWN') {
                return (field.options &&
                    field.options.length >= 2 &&
                    field.options.every((opt) => opt.value && opt.label));
            }
            return true;
        });
    }, {
        message: 'DROPDOWN fields must have at least 2 options with both value and label',
    }),
    settings: formSettingsSchema.optional(),
});
//# sourceMappingURL=form-fields.dto.js.map