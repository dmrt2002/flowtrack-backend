import { z } from 'zod';

/**
 * Query params for getting hotbox conversations
 */
export const getHotboxConversationsSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => val > 0 && val <= 100, {
      message: 'Limit must be between 1 and 100',
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .refine((val) => val >= 0, {
      message: 'Offset must be >= 0',
    }),
});

export type GetHotboxConversationsDto = z.infer<
  typeof getHotboxConversationsSchema
>;

/**
 * Response type for hotbox conversations
 */
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
