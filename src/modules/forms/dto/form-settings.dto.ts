import { z } from 'zod';

// =============================================================================
// Form Settings DTO - For saving form header, description, and appearance
// =============================================================================

/**
 * TipTap JSON structure validation
 * Validates the rich text editor's JSON output format
 */
const richTextJsonSchema = z.object({
  type: z.literal('doc'),
  content: z.array(z.any()).optional(),
});

/**
 * Schema for updating form settings (header, description, submit button, success message)
 */
export const updateFormSettingsSchema = z.object({
  workflowId: z.string().uuid(),

  // Form header
  formHeader: z.string().max(500).optional().nullable(),
  formHeaderRich: richTextJsonSchema.optional().nullable(),
  showFormHeader: z.boolean().default(true),

  // Form description
  formDescription: z.string().max(2000).optional().nullable(),
  formDescriptionRich: richTextJsonSchema.optional().nullable(),
  showFormDescription: z.boolean().default(true),

  // Submit button and success message (existing fields from workflow.settings)
  submitButtonText: z.string().min(1).max(50).default('Submit'),
  successMessage: z.string().min(1).max(500).default('Thank you! We\'ll be in touch soon.'),
  redirectUrl: z.string().url().optional().nullable(),
});

export type UpdateFormSettingsDto = z.infer<typeof updateFormSettingsSchema>;

/**
 * Response schema for public form configuration
 */
export const publicFormSettingsSchema = z.object({
  // Form header
  formHeader: z.string().nullable(),
  formHeaderRich: richTextJsonSchema.nullable(),
  showFormHeader: z.boolean(),

  // Form description
  formDescription: z.string().nullable(),
  formDescriptionRich: richTextJsonSchema.nullable(),
  showFormDescription: z.boolean(),

  // Submit button and success message
  submitButtonText: z.string(),
  successMessage: z.string(),
  redirectUrl: z.string().nullable(),
  theme: z.record(z.string(), z.any()).optional(),
});

export type PublicFormSettingsDto = z.infer<typeof publicFormSettingsSchema>;
