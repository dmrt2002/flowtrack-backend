import { z } from 'zod';

export const schedulingPreferenceSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID'),
  schedulingType: z.enum(['CALENDLY', 'GOOGLE_MEET'], {
    message: 'Scheduling type must be CALENDLY or GOOGLE_MEET',
  }),
  calendlyLink: z
    .string()
    .url('Invalid Calendly URL')
    .refine((url) => url.includes('calendly.com'), {
      message: 'Must be a valid Calendly link',
    })
    .optional(),
});

export type SchedulingPreferenceDto = z.infer<typeof schedulingPreferenceSchema>;

