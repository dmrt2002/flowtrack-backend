import { z } from 'zod';

/**
 * Update Profile DTO Schema
 * For updating user profile information
 */
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .trim()
    .optional(),
  avatarUrl: z
    .string()
    .url('Invalid URL format')
    .max(500, 'Avatar URL must not exceed 500 characters')
    .optional()
    .nullable(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
