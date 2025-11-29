import { z } from 'zod';
export declare const calendlySchema: z.ZodObject<{
    workflowId: z.ZodString;
    calendlyLink: z.ZodString;
}, z.core.$strip>;
export type CalendlyDto = z.infer<typeof calendlySchema>;
