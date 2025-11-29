import { z } from 'zod';

export const transferOwnershipSchema = z.object({
  newOwnerId: z
    .string()
    .uuid('New owner ID must be a valid UUID')
    .min(1, 'New owner ID is required'),
});

export type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>;
