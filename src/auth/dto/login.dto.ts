import { z } from 'zod';

/**
 * Login DTO Schema
 * For native email/password authentication
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof loginSchema>;
