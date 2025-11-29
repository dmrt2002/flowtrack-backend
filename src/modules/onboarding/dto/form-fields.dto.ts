import { z } from 'zod';

/**
 * Form Field Option Schema
 * For DROPDOWN field type options
 */
const formFieldOptionSchema = z.object({
  value: z.string().min(1, 'Option value is required'),
  label: z.string().min(1, 'Option label is required'),
});

/**
 * Form Field Validation Rules Schema
 */
const validationRulesSchema = z.object({
  minLength: z.number().int().positive().optional(),
  maxLength: z.number().int().positive().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  step: z.number().optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
});

/**
 * Form Field Schema
 */
const formFieldSchema = z.object({
  id: z.string().optional(), // Frontend tracking ID, not stored in DB
  fieldKey: z
    .string()
    .min(1, 'Field key is required')
    .max(50, 'Field key must not exceed 50 characters')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Field key must start with a letter and contain only letters, numbers, and underscores'),
  label: z
    .string()
    .min(1, 'Label is required')
    .max(150, 'Label must not exceed 150 characters'),
  fieldType: z.enum([
    'TEXT',
    'EMAIL',
    'NUMBER',
    'DROPDOWN',
    'TEXTAREA',
    'DATE',
    'CHECKBOX',
  ]),
  placeholder: z.string().max(255, 'Placeholder must not exceed 255 characters').optional(),
  helpText: z.string().optional(),
  isRequired: z.boolean().default(true),
  options: z.array(formFieldOptionSchema).optional(),
  validationRules: validationRulesSchema.optional(),
  displayOrder: z.number().int().min(0, 'Display order must be >= 0'),
  isDefault: z.boolean().optional(), // Frontend metadata, not stored in DB
});

/**
 * TipTap JSON structure validation for rich text content
 */
const richTextJsonSchema = z.object({
  type: z.literal('doc'),
  content: z.array(z.any()).optional(),
});

/**
 * Form Settings Schema
 * For form header, description, submit button text, and success message
 */
const formSettingsSchema = z.object({
  // Form header
  formHeader: z.string().max(500).optional().nullable(),
  formHeaderRich: richTextJsonSchema.optional().nullable(),
  showFormHeader: z.boolean().default(true),
  // Form description
  formDescription: z.string().max(2000).optional().nullable(),
  formDescriptionRich: richTextJsonSchema.optional().nullable(),
  showFormDescription: z.boolean().default(true),
  // Submit button and success message
  submitButtonText: z.string().min(1).max(50).optional(),
  successMessage: z.string().min(1).max(500).optional(),
  redirectUrl: z.string().url().optional().nullable(),
});

/**
 * Form Fields DTO Schema
 * For saving form field configurations
 * Note: Empty array is allowed since default fields (name, email, companyName) are always present
 */
export const formFieldsSchema = z.object({
  workflowId: z.string().uuid('Workflow ID must be a valid UUID'),
  formFields: z
    .array(formFieldSchema)
    .refine(
      (fields) => {
        // If array is empty, validation passes (default fields are always present)
        if (fields.length === 0) return true;
        // Ensure fieldKeys are unique within the array
        const fieldKeys = fields.map((f) => f.fieldKey);
        return new Set(fieldKeys).size === fieldKeys.length;
      },
      {
        message: 'Field keys must be unique',
      },
    )
    .refine(
      (fields) => {
        // If array is empty, validation passes
        if (fields.length === 0) return true;
        // Validate DROPDOWN fields have options
        return fields.every((field) => {
          if (field.fieldType === 'DROPDOWN') {
            return (
              field.options &&
              field.options.length >= 2 &&
              field.options.every((opt) => opt.value && opt.label)
            );
          }
          return true;
        });
      },
      {
        message: 'DROPDOWN fields must have at least 2 options with both value and label',
      },
    ),
  // Form settings (optional, can be saved separately or together)
  settings: formSettingsSchema.optional(),
});

export type FormFieldsDto = z.infer<typeof formFieldsSchema>;
export type FormFieldDto = z.infer<typeof formFieldSchema>;

