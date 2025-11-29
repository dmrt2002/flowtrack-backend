import { z } from 'zod';

/**
 * DTO for public form submission
 * Validates incoming form data from external websites
 */
export const FormSubmissionSchema = z.object({
  // Core fields - these are dynamic based on form configuration
  // but we validate basic structure here
  fields: z.record(z.string(), z.any()).refine(
    (data) => {
      // Must have at least email field
      return 'email' in data;
    },
    {
      message: 'Email field is required',
    },
  ),

  // Optional tracking data
  tracking: z
    .object({
      // Visitor tracking cookie
      utk: z.string().optional(),

      // UTM parameters
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmTerm: z.string().optional(),
      utmContent: z.string().optional(),

      // Referrer and page info
      referrer: z.string().url().optional().or(z.literal('')),
      pageUrl: z.string().url().optional(),
      pagePath: z.string().optional(),

      // Browser/device info
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
    })
    .optional(),

  // Form metadata
  metadata: z
    .object({
      submittedAt: z.string().datetime().optional(),
      formVersion: z.string().optional(),
    })
    .optional(),
});

export type FormSubmissionDto = z.infer<typeof FormSubmissionSchema>;

/**
 * Response DTO for successful form submission
 */
export interface FormSubmissionResponseDto {
  success: boolean;
  leadId: string;
  message: string;
  redirectUrl?: string;
}

/**
 * Response DTO for form validation errors
 */
export interface FormValidationErrorDto {
  success: false;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}
