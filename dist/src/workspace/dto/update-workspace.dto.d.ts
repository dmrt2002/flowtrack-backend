import { z } from 'zod';
export declare const updateWorkspaceSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
