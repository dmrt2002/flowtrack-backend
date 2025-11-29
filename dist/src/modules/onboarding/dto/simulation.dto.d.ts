import { z } from 'zod';
export declare const simulationSchema: z.ZodObject<{
    strategyId: z.ZodOptional<z.ZodEnum<{
        "inbound-leads": "inbound-leads";
        "outbound-sales": "outbound-sales";
        "customer-nurture": "customer-nurture";
        unified: "unified";
    }>>;
    configurationId: z.ZodString;
}, z.core.$strip>;
export type SimulationDto = z.infer<typeof simulationSchema>;
