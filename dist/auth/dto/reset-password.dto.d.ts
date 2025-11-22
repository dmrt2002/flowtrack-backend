import { z } from 'zod';
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
