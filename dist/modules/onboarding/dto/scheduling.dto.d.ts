import { z } from 'zod';
export declare const schedulingPreferenceSchema: z.ZodObject<{
    workflowId: z.ZodString;
    schedulingType: z.ZodEnum<{
        CALENDLY: "CALENDLY";
        GOOGLE_MEET: "GOOGLE_MEET";
    }>;
    calendlyLink: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SchedulingPreferenceDto = z.infer<typeof schedulingPreferenceSchema>;
