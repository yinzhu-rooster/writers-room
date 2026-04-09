import { describe, it, expect } from 'vitest';
import { createTopicSchema } from './topic';

describe('createTopicSchema', () => {
  it('accepts valid prompt', () => {
    const result = createTopicSchema.safeParse({
      body: 'Write a headline for...',
      prompt_type: 'headline',
      duration_hours: 24,
    });
    expect(result.success).toBe(true);
  });

  it('defaults duration to 24 hours', () => {
    const result = createTopicSchema.safeParse({
      body: 'Test prompt',
      prompt_type: 'setup',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.duration_hours).toBe(24);
    }
  });

  it('rejects empty body', () => {
    expect(createTopicSchema.safeParse({
      body: '',
      prompt_type: 'headline',
    }).success).toBe(false);
  });

  it('rejects body over 500 chars', () => {
    expect(createTopicSchema.safeParse({
      body: 'x'.repeat(501),
      prompt_type: 'headline',
    }).success).toBe(false);
  });

  it('rejects invalid prompt_type', () => {
    expect(createTopicSchema.safeParse({
      body: 'Test',
      prompt_type: 'invalid',
    }).success).toBe(false);
  });

  it('accepts all valid prompt types', () => {
    for (const type of ['headline', 'setup', 'format', 'topical', 'evergreen']) {
      expect(createTopicSchema.safeParse({
        body: 'Test',
        prompt_type: type,
      }).success).toBe(true);
    }
  });

  it('rejects duration below 1', () => {
    expect(createTopicSchema.safeParse({
      body: 'Test',
      prompt_type: 'headline',
      duration_hours: 0,
    }).success).toBe(false);
  });

  it('rejects duration above 72', () => {
    expect(createTopicSchema.safeParse({
      body: 'Test',
      prompt_type: 'headline',
      duration_hours: 73,
    }).success).toBe(false);
  });

  it('accepts boundary durations', () => {
    expect(createTopicSchema.safeParse({
      body: 'Test',
      prompt_type: 'headline',
      duration_hours: 1,
    }).success).toBe(true);
    expect(createTopicSchema.safeParse({
      body: 'Test',
      prompt_type: 'headline',
      duration_hours: 72,
    }).success).toBe(true);
  });
});
