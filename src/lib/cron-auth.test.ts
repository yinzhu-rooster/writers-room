import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyCronSecret } from './cron-auth';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('verifyCronSecret', () => {
  it('returns false when CRON_SECRET is not set', () => {
    vi.stubEnv('CRON_SECRET', '');
    expect(verifyCronSecret('Bearer some-secret')).toBe(false);
  });

  it('returns false when authHeader is null', () => {
    vi.stubEnv('CRON_SECRET', 'my-secret');
    expect(verifyCronSecret(null)).toBe(false);
  });

  it('returns false for wrong secret', () => {
    vi.stubEnv('CRON_SECRET', 'correct-secret');
    expect(verifyCronSecret('Bearer wrong-secret--')).toBe(false);
  });

  it('returns false for wrong length header', () => {
    vi.stubEnv('CRON_SECRET', 'my-secret');
    // 'Bearer my-secret' is 16 chars; send something shorter
    expect(verifyCronSecret('Bearer short')).toBe(false);
  });

  it('returns true for correct secret', () => {
    vi.stubEnv('CRON_SECRET', 'my-secret');
    expect(verifyCronSecret('Bearer my-secret')).toBe(true);
  });
});
