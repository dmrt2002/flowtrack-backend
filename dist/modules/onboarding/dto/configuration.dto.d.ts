import { z } from 'zod';
export declare const configurationSchema: z.ZodObject<{
    strategyId: z.ZodEnum<{
        "inbound-leads": "inbound-leads";
        "outbound-sales": "outbound-sales";
        "customer-nurture": "customer-nurture";
    }>;
    configuration: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
}, z.core.$strip>;
export type ConfigurationDto = z.infer<typeof configurationSchema>;
