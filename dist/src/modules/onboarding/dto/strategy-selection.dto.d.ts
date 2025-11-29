import { z } from 'zod';
export declare const strategySelectionSchema: z.ZodObject<{
    strategyId: z.ZodEnum<{
        "inbound-leads": "inbound-leads";
        "outbound-sales": "outbound-sales";
        "customer-nurture": "customer-nurture";
    }>;
    templateId: z.ZodString;
}, z.core.$strip>;
export type StrategySelectionDto = z.infer<typeof strategySelectionSchema>;
