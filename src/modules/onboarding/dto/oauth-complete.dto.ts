import { z } from 'zod';

/**
 * OAuth Complete DTO Schema
 * For Step 3: Confirming OAuth connection
 */
export const oauthCompleteSchema = z.object({
  provider: z.enum(['gmail', 'outlook']),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export type OAuthCompleteDto = z.infer<typeof oauthCompleteSchema>;
