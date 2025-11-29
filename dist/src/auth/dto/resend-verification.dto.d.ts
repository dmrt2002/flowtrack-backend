import { z } from 'zod';
export declare const resendVerificationSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
