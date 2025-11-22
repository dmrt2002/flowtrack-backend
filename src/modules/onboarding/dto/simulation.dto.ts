import { z } from 'zod';

/**
 * Simulation DTO Schema
 * For Step 4: Generating simulation data
 */
export const simulationSchema = z.object({
  strategyId: z.enum(['inbound-leads', 'outbound-sales', 'customer-nurture']),
  configurationId: z.string().uuid('Invalid configuration ID'),
});

export type SimulationDto = z.infer<typeof simulationSchema>;
