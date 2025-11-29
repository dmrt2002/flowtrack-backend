import { z } from 'zod';
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
