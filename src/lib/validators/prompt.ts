import { z } from 'zod';

export const createPromptSchema = z.object({
  body: z.string().min(1, 'Prompt text is required').max(500, 'Prompt text too long'),
  prompt_type: z.enum(['headline', 'setup', 'format', 'topical', 'evergreen']),
  duration_hours: z.number().min(1).max(72).default(24),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
