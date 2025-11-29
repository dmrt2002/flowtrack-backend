import { z } from 'zod';
export declare const updateFormSettingsSchema: z.ZodObject<{
    workflowId: z.ZodString;
    formHeader: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    formHeaderRich: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"doc">;
        content: z.ZodOptional<z.ZodArray<z.ZodAny>>;
    }, z.core.$strip>>>;
    showFormHeader: z.ZodDefault<z.ZodBoolean>;
    formDescription: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    formDescriptionRich: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"doc">;
        content: z.ZodOptional<z.ZodArray<z.ZodAny>>;
    }, z.core.$strip>>>;
    showFormDescription: z.ZodDefault<z.ZodBoolean>;
    submitButtonText: z.ZodDefault<z.ZodString>;
    successMessage: z.ZodDefault<z.ZodString>;
    redirectUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type UpdateFormSettingsDto = z.infer<typeof updateFormSettingsSchema>;
export declare const publicFormSettingsSchema: z.ZodObject<{
    formHeader: z.ZodNullable<z.ZodString>;
    formHeaderRich: z.ZodNullable<z.ZodObject<{
        type: z.ZodLiteral<"doc">;
        content: z.ZodOptional<z.ZodArray<z.ZodAny>>;
    }, z.core.$strip>>;
    showFormHeader: z.ZodBoolean;
    formDescription: z.ZodNullable<z.ZodString>;
    formDescriptionRich: z.ZodNullable<z.ZodObject<{
        type: z.ZodLiteral<"doc">;
        content: z.ZodOptional<z.ZodArray<z.ZodAny>>;
    }, z.core.$strip>>;
    showFormDescription: z.ZodBoolean;
    submitButtonText: z.ZodString;
    successMessage: z.ZodString;
    redirectUrl: z.ZodNullable<z.ZodString>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export type PublicFormSettingsDto = z.infer<typeof publicFormSettingsSchema>;
