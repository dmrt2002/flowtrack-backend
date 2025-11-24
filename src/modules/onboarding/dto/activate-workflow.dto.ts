import { z } from 'zod';

/**
 * Activate Workflow DTO Schema
 * For Step 4: Activating the configured workflow
 */
export const activateWorkflowSchema = z.object({
  strategyId: z.enum(['inbound-leads', 'outbound-sales', 'customer-nurture', 'unified']).optional(), // Optional - unified workflow doesn't need strategy
  configurationId: z.string().uuid('Invalid configuration ID'),
});

export type ActivateWorkflowDto = z.infer<typeof activateWorkflowSchema>;
