import { z } from 'zod';

export const getMessagesQuerySchema = z.object({
  direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type GetMessagesQueryDto = z.infer<typeof getMessagesQuerySchema>;
