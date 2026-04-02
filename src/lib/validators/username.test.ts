import { describe, it, expect } from 'vitest';
import { usernameSchema } from './username';

describe('usernameSchema', () => {
  it('accepts valid usernames', () => {
    expect(usernameSchema.safeParse('abc').success).toBe(true);
    expect(usernameSchema.safeParse('user_123').success).toBe(true);
    expect(usernameSchema.safeParse('A'.repeat(20)).success).toBe(true);
  });

  it('rejects too short', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false);
    expect(usernameSchema.safeParse('').success).toBe(false);
  });

  it('rejects too long', () => {
    expect(usernameSchema.safeParse('a'.repeat(21)).success).toBe(false);
  });

  it('rejects special characters', () => {
    expect(usernameSchema.safeParse('user name').success).toBe(false);
    expect(usernameSchema.safeParse('user@name').success).toBe(false);
    expect(usernameSchema.safeParse('user-name').success).toBe(false);
    expect(usernameSchema.safeParse('user.name').success).toBe(false);
  });

  it('allows underscores', () => {
    expect(usernameSchema.safeParse('_test_').success).toBe(true);
  });
});
