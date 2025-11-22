import { z } from 'zod';

/**
 * Verify Email DTO Schema
 * Verify email address using token from email
 */
export const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required'),
});

export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
