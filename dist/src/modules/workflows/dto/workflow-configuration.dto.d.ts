import { z } from 'zod';
export declare const workflowConfigurationSchema: z.ZodObject<{
    workflowId: z.ZodString;
    welcomeSubject: z.ZodOptional<z.ZodString>;
    welcomeBody: z.ZodOptional<z.ZodString>;
    thankYouSubject: z.ZodOptional<z.ZodString>;
    thankYouBody: z.ZodOptional<z.ZodString>;
    followUpSubject: z.ZodOptional<z.ZodString>;
    followUpBody: z.ZodOptional<z.ZodString>;
    followUpDelayDays: z.ZodOptional<z.ZodNumber>;
    deadlineDays: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type WorkflowConfigurationDto = z.infer<typeof workflowConfigurationSchema>;
export declare const getWorkflowConfigurationResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        workflowId: z.ZodString;
        welcomeSubject: z.ZodNullable<z.ZodString>;
        welcomeBody: z.ZodNullable<z.ZodString>;
        thankYouSubject: z.ZodNullable<z.ZodString>;
        thankYouBody: z.ZodNullable<z.ZodString>;
        followUpSubject: z.ZodNullable<z.ZodString>;
        followUpBody: z.ZodNullable<z.ZodString>;
        followUpDelayDays: z.ZodNullable<z.ZodNumber>;
        deadlineDays: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type GetWorkflowConfigurationResponseDto = z.infer<typeof getWorkflowConfigurationResponseSchema>;
