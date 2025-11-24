import { z } from 'zod';

/**
 * Configuration DTO Schema
 * For Step 2: Mad Libs configuration
 */
// Condition object schema for qualification criteria
const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['>', '<', '>=', '<=', '==', '!=']),
  value: z.number().min(0),
  currency: z.enum(['USD', 'INR']),
});

export const configurationSchema = z.object({
  strategyId: z.enum(['inbound-leads', 'outbound-sales', 'customer-nurture', 'unified']).optional(), // Optional - unified workflow doesn't need strategy
  configuration: z.record(
    z.string(),
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      conditionSchema, // Allow condition objects
    ]),
  ),
});

export type ConfigurationDto = z.infer<typeof configurationSchema>;
