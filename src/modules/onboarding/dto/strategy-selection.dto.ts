import { z } from 'zod';

/**
 * Strategy Selection DTO Schema
 * For Step 1: Selecting automation strategy
 */
export const strategySelectionSchema = z.object({
  strategyId: z.enum(['inbound-leads', 'outbound-sales', 'customer-nurture']),
  templateId: z
    .string()
    .min(1, 'Template ID is required')
    .max(100, 'Template ID must not exceed 100 characters'),
});

export type StrategySelectionDto = z.infer<typeof strategySelectionSchema>;
