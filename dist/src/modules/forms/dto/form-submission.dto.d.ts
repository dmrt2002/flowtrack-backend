import { z } from 'zod';
export declare const FormSubmissionSchema: z.ZodObject<{
    fields: z.ZodRecord<z.ZodString, z.ZodAny>;
    tracking: z.ZodOptional<z.ZodObject<{
        utk: z.ZodOptional<z.ZodString>;
        utmSource: z.ZodOptional<z.ZodString>;
        utmMedium: z.ZodOptional<z.ZodString>;
        utmCampaign: z.ZodOptional<z.ZodString>;
        utmTerm: z.ZodOptional<z.ZodString>;
        utmContent: z.ZodOptional<z.ZodString>;
        referrer: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        pageUrl: z.ZodOptional<z.ZodString>;
        pagePath: z.ZodOptional<z.ZodString>;
        userAgent: z.ZodOptional<z.ZodString>;
        ipAddress: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        submittedAt: z.ZodOptional<z.ZodString>;
        formVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type FormSubmissionDto = z.infer<typeof FormSubmissionSchema>;
export interface FormSubmissionResponseDto {
    success: boolean;
    leadId: string;
    message: string;
    redirectUrl?: string;
}
export interface FormValidationErrorDto {
    success: false;
    errors: Array<{
        field: string;
        message: string;
        code: string;
    }>;
}
