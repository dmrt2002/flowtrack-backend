import { z } from 'zod';
export declare const transferOwnershipSchema: z.ZodObject<{
    newOwnerId: z.ZodString;
}, z.core.$strip>;
export type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>;
