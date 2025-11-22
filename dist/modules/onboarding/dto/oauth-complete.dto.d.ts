import { z } from 'zod';
export declare const oauthCompleteSchema: z.ZodObject<{
    provider: z.ZodEnum<{
        gmail: "gmail";
        outlook: "outlook";
    }>;
    email: z.ZodString;
}, z.core.$strip>;
export type OAuthCompleteDto = z.infer<typeof oauthCompleteSchema>;
