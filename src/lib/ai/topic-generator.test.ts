import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTopics } from './topic-generator';

describe('generateTopics', () => {
  it('returns exactly 5 prompts', async () => {
    const prompts = await generateTopics();
    expect(prompts).toHaveLength(5);
  });

  it('returns one prompt per type', async () => {
    const prompts = await generateTopics();
    const types = prompts.map((p) => p.prompt_type);
    expect(types).toContain('headline');
    expect(types).toContain('setup');
    expect(types).toContain('format');
    expect(types).toContain('topical');
    expect(types).toContain('evergreen');
    expect(new Set(types).size).toBe(5);
  });

  it('all prompts have non-empty body strings', async () => {
    const prompts = await generateTopics();
    for (const p of prompts) {
      expect(typeof p.body).toBe('string');
      expect(p.body.length).toBeGreaterThan(10);
    }
  });

  it('returns same prompts for the same day (deterministic)', async () => {
    const first = await generateTopics();
    const second = await generateTopics();
    expect(first).toEqual(second);
  });

  it('returns different prompts on different days', async () => {
    const today = await generateTopics();

    // Mock Date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    vi.useFakeTimers();
    vi.setSystemTime(tomorrow);

    const tomorrowPrompts = await generateTopics();

    vi.useRealTimers();

    // At least some prompts should differ (extremely unlikely all 5 match)
    const sameCount = today.filter(
      (p, i) => p.body === tomorrowPrompts[i].body
    ).length;
    expect(sameCount).toBeLessThan(5);
  });

  it('prompt_type is always a valid enum value', async () => {
    const valid = ['headline', 'setup', 'format', 'topical', 'evergreen'];
    const prompts = await generateTopics();
    for (const p of prompts) {
      expect(valid).toContain(p.prompt_type);
    }
  });
});
