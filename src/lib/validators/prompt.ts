import { z } from 'zod';

export const createPromptSchema = z.object({
  body: z.string()
    .trim()
    .min(1, 'Prompt text is required')
    .max(500, 'Prompt text too long'),
  prompt_type: z.enum(['headline', 'setup', 'format', 'topical', 'evergreen']),
  duration_hours: z.number().int('Duration must be a whole number').min(1).max(72).default(24),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
