import { z } from 'zod';

export const createPitchSchema = z.object({
  body: z.string().trim().min(1, 'Pitch cannot be empty').max(1000, 'Pitch cannot exceed 1000 characters'),
});

export const updatePitchSchema = z.object({
  body: z.string().trim().min(1, 'Pitch cannot be empty').max(1000, 'Pitch cannot exceed 1000 characters'),
});

export type CreatePitchInput = z.infer<typeof createPitchSchema>;
export type UpdatePitchInput = z.infer<typeof updatePitchSchema>;
