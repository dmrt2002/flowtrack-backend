import { z } from 'zod';
export declare const createCheckoutSessionSchema: z.ZodObject<{
    planId: z.ZodString;
    billingCycle: z.ZodEnum<{
        monthly: "monthly";
        yearly: "yearly";
    }>;
    successUrl: z.ZodOptional<z.ZodString>;
    cancelUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateCheckoutSessionDto = z.infer<typeof createCheckoutSessionSchema>;
