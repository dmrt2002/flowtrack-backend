import { z } from 'zod';

/**
 * Resend Verification DTO Schema
 * Resend email verification email
 */
export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
});

export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
