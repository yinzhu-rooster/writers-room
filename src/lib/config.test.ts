import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { getConfigValue, getConfigInt } from './config';

const mockCreateAdminClient = vi.mocked(createAdminClient);

function makeSupabaseWithValue(value: string | null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: value !== null ? { value } : null,
        error: value !== null ? null : { code: 'PGRST116' },
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getConfigValue', () => {
  it('returns DB value when available', async () => {
    mockCreateAdminClient.mockReturnValue(makeSupabaseWithValue('5') as any);

    const result = await getConfigValue('min_reactions_for_reveal');
    expect(result).toBe('5');
  });

  it('returns default when DB returns null', async () => {
    mockCreateAdminClient.mockReturnValue(makeSupabaseWithValue(null) as any);

    const result = await getConfigValue('min_reactions_for_reveal');
    expect(result).toBe('3'); // default from CONFIG_DEFAULTS
  });

  it('returns empty string for unknown key with no DB value', async () => {
    mockCreateAdminClient.mockReturnValue(makeSupabaseWithValue(null) as any);

    const result = await getConfigValue('nonexistent_key');
    expect(result).toBe('');
  });
});

describe('getConfigInt', () => {
  it('parses integer from DB value', async () => {
    mockCreateAdminClient.mockReturnValue(makeSupabaseWithValue('10') as any);

    const result = await getConfigInt('min_reactions_for_reveal');
    expect(result).toBe(10);
  });

  it('returns default integer when DB returns NaN-producing value', async () => {
    mockCreateAdminClient.mockReturnValue(makeSupabaseWithValue('not-a-number') as any);

    const result = await getConfigInt('min_reactions_for_reveal');
    expect(result).toBe(3); // parseInt('3', 10) from CONFIG_DEFAULTS
  });

  it('returns 0 for unknown key with NaN value', async () => {
    mockCreateAdminClient.mockReturnValue(makeSupabaseWithValue(null) as any);

    const result = await getConfigInt('nonexistent_key');
    expect(result).toBe(0);
  });
});
