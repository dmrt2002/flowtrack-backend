import { z } from 'zod';
export declare const updateMemberRoleSchema: z.ZodObject<{
    role: z.ZodEnum<{
        admin: "admin";
        member: "member";
        viewer: "viewer";
    }>;
}, z.core.$strip>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
