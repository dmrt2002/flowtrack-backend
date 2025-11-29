import { z } from 'zod';

/**
 * Workflow Configuration DTO
 * For updating email templates and delay settings in workflow canvas
 */
export const workflowConfigurationSchema = z.object({
  workflowId: z.string().uuid(),

  // Welcome Email (sent immediately when lead submits form)
  welcomeSubject: z.string().optional(),
  welcomeBody: z.string().optional(),

  // Thank You Email (sent when lead clicks booking link)
  thankYouSubject: z.string().optional(),
  thankYouBody: z.string().optional(),

  // Follow-up Email (sent after delay if no booking)
  followUpSubject: z.string().optional(),
  followUpBody: z.string().optional(),

  // Delay configurations
  followUpDelayDays: z.number().int().min(1).max(7).optional(), // 1-7 days before follow-up
  deadlineDays: z.number().int().min(1).max(30).optional(),      // 1-30 days total deadline
});

export type WorkflowConfigurationDto = z.infer<typeof workflowConfigurationSchema>;

/**
 * Get Workflow Configuration Response DTO
 */
export const getWorkflowConfigurationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    workflowId: z.string().uuid(),
    welcomeSubject: z.string().nullable(),
    welcomeBody: z.string().nullable(),
    thankYouSubject: z.string().nullable(),
    thankYouBody: z.string().nullable(),
    followUpSubject: z.string().nullable(),
    followUpBody: z.string().nullable(),
    followUpDelayDays: z.number().nullable(),
    deadlineDays: z.number().nullable(),
  }),
});

export type GetWorkflowConfigurationResponseDto = z.infer<typeof getWorkflowConfigurationResponseSchema>;
