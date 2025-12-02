import { z } from 'zod';
export declare const getHotboxConversationsSchema: z.ZodObject<{
    limit: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
    offset: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
}, z.core.$strip>;
export type GetHotboxConversationsDto = z.infer<typeof getHotboxConversationsSchema>;
export interface HotboxConversationResponse {
    lead: {
        id: string;
        name: string | null;
        email: string;
        status: string;
        score: number | null;
        lastActivityAt: Date | null;
    };
    messageCount: number;
    latestMessage: {
        preview: string;
        subject: string | null;
        direction: string;
        createdAt: Date | null;
    };
    lastActivityMinutesAgo: number | null;
    hasUnread: boolean;
}
export interface GetHotboxConversationsResponse {
    data: HotboxConversationResponse[];
    total: number;
    limit: number;
    offset: number;
}
