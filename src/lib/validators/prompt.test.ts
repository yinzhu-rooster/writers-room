import { describe, it, expect } from 'vitest';
import { createPromptSchema } from './prompt';

describe('createPromptSchema', () => {
  it('accepts valid prompt', () => {
    const result = createPromptSchema.safeParse({
      body: 'Write a headline for...',
      prompt_type: 'headline',
      duration_hours: 24,
    });
    expect(result.success).toBe(true);
  });

  it('defaults duration to 24 hours', () => {
    const result = createPromptSchema.safeParse({
      body: 'Test prompt',
      prompt_type: 'setup',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.duration_hours).toBe(24);
    }
  });

  it('rejects empty body', () => {
    expect(createPromptSchema.safeParse({
      body: '',
      prompt_type: 'headline',
    }).success).toBe(false);
  });

  it('rejects body over 500 chars', () => {
    expect(createPromptSchema.safeParse({
      body: 'x'.repeat(501),
      prompt_type: 'headline',
    }).success).toBe(false);
  });

  it('rejects invalid prompt_type', () => {
    expect(createPromptSchema.safeParse({
      body: 'Test',
      prompt_type: 'invalid',
    }).success).toBe(false);
  });

  it('accepts all valid prompt types', () => {
    for (const type of ['headline', 'setup', 'format', 'topical', 'evergreen']) {
      expect(createPromptSchema.safeParse({
        body: 'Test',
        prompt_type: type,
      }).success).toBe(true);
    }
  });

  it('rejects duration below 1', () => {
    expect(createPromptSchema.safeParse({
      body: 'Test',
      prompt_type: 'headline',
      duration_hours: 0,
    }).success).toBe(false);
  });

  it('rejects duration above 72', () => {
    expect(createPromptSchema.safeParse({
      body: 'Test',
      prompt_type: 'headline',
      duration_hours: 73,
    }).success).toBe(false);
  });

  it('accepts boundary durations', () => {
    expect(createPromptSchema.safeParse({
      body: 'Test',
      prompt_type: 'headline',
      duration_hours: 1,
    }).success).toBe(true);
    expect(createPromptSchema.safeParse({
      body: 'Test',
      prompt_type: 'headline',
      duration_hours: 72,
    }).success).toBe(true);
  });
});
