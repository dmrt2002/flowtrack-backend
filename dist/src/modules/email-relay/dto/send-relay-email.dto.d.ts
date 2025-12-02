import { z } from 'zod';
export declare const sendRelayEmailSchema: z.ZodObject<{
    subject: z.ZodString;
    htmlBody: z.ZodOptional<z.ZodString>;
    textBody: z.ZodString;
    senderName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SendRelayEmailDto = z.infer<typeof sendRelayEmailSchema>;
