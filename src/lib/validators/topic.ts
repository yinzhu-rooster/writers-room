import { z } from 'zod';

export const createTopicSchema = z.object({
  body: z.string()
    .trim()
    .min(1, 'Topic text is required')
    .max(500, 'Topic text too long'),
  prompt_type: z.enum(['headline', 'setup', 'format', 'topical', 'evergreen']),
  duration_hours: z.number().int('Duration must be a whole number').min(1).max(72).default(24),
});

export type CreateTopicInput = z.infer<typeof createTopicSchema>;
