import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  planId: z
    .string()
    .uuid('Plan ID must be a valid UUID')
    .min(1, 'Plan ID is required'),
  billingCycle: z.enum(['monthly', 'yearly']),
  successUrl: z
    .string()
    .url('Success URL must be a valid URL')
    .optional(),
  cancelUrl: z
    .string()
    .url('Cancel URL must be a valid URL')
    .optional(),
});

export type CreateCheckoutSessionDto = z.infer<typeof createCheckoutSessionSchema>;
