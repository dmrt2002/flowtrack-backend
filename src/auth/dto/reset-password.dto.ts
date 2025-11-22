import { z } from 'zod';

/**
 * Reset Password DTO Schema
 * Reset password using token from email
 */
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
