import { z } from 'zod';
export declare const verifyEmailSchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
