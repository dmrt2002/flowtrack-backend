import { z } from 'zod';

/**
 * Forgot Password DTO Schema
 * Request password reset email
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
