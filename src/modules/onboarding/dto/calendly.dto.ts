import { z } from 'zod';

export const calendlySchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID'),
  calendlyLink: z
    .string()
    .url('Invalid Calendly URL')
    .refine((url) => url.includes('calendly.com'), {
      message: 'Must be a valid Calendly link',
    }),
});

export type CalendlyDto = z.infer<typeof calendlySchema>;
