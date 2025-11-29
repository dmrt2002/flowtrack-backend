import { z } from 'zod';
export declare const configurationSchema: z.ZodObject<{
    strategyId: z.ZodOptional<z.ZodEnum<{
        "inbound-leads": "inbound-leads";
        "outbound-sales": "outbound-sales";
        "customer-nurture": "customer-nurture";
        unified: "unified";
    }>>;
    configuration: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodEnum<{
            ">": ">";
            "<": "<";
            ">=": ">=";
            "<=": "<=";
            "==": "==";
            "!=": "!=";
        }>;
        value: z.ZodNumber;
        currency: z.ZodEnum<{
            USD: "USD";
            INR: "INR";
        }>;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
export type ConfigurationDto = z.infer<typeof configurationSchema>;
