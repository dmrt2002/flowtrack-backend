import { z } from 'zod';
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
