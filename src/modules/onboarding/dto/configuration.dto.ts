import { z } from 'zod';

/**
 * Configuration DTO Schema
 * For Step 2: Mad Libs configuration
 */
export const configurationSchema = z.object({
  strategyId: z.enum(['inbound-leads', 'outbound-sales', 'customer-nurture']),
  configuration: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
});

export type ConfigurationDto = z.infer<typeof configurationSchema>;
