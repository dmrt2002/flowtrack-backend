import { z } from 'zod';
export interface EmailTrackingPayload {
    leadId: string;
    workflowExecutionId: string;
    emailType: 'welcome' | 'thank_you' | 'follow_up';
    sentAt: number;
}
export declare const emailTrackingPayloadSchema: z.ZodObject<{
    leadId: z.ZodString;
    workflowExecutionId: z.ZodString;
    emailType: z.ZodEnum<{
        welcome: "welcome";
        thank_you: "thank_you";
        follow_up: "follow_up";
    }>;
    sentAt: z.ZodNumber;
}, z.core.$strip>;
export type EmailTrackingPayloadDto = z.infer<typeof emailTrackingPayloadSchema>;
