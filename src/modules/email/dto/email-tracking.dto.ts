import { z } from 'zod';

/**
 * Payload embedded in the tracking token (JWT)
 */
export interface EmailTrackingPayload {
  leadId: string;
  workflowExecutionId: string;
  emailType: 'welcome' | 'thank_you' | 'follow_up';
  sentAt: number; // Unix timestamp
}

/**
 * Schema for validating tracking token payload
 */
export const emailTrackingPayloadSchema = z.object({
  leadId: z.string().uuid(),
  workflowExecutionId: z.string().uuid(),
  emailType: z.enum(['welcome', 'thank_you', 'follow_up']),
  sentAt: z.number(),
});

export type EmailTrackingPayloadDto = z.infer<typeof emailTrackingPayloadSchema>;
