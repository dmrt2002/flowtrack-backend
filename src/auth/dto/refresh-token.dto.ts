import { z } from 'zod';

/**
 * Refresh Token DTO Schema
 * Get new access token using refresh token
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
