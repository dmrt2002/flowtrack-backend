import { z } from 'zod';
export declare const getMessagesQuerySchema: z.ZodObject<{
    direction: z.ZodOptional<z.ZodEnum<{
        INBOUND: "INBOUND";
        OUTBOUND: "OUTBOUND";
    }>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type GetMessagesQueryDto = z.infer<typeof getMessagesQuerySchema>;
