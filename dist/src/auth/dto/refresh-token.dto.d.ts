import { z } from 'zod';
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
