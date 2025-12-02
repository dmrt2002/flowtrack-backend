import { z } from 'zod';

export const sendRelayEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject is too long'),
  htmlBody: z.string().optional(),
  textBody: z.string().min(1, 'Text body is required'),
  senderName: z.string().optional(),
});

export type SendRelayEmailDto = z.infer<typeof sendRelayEmailSchema>;
