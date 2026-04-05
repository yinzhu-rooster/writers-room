import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

function mockChain(data: unknown = null, error: unknown = null, count: number | null = null) {
  const chain: any = {};
  const chainMethods = ['select','insert','update','delete','upsert','eq','neq','gt','gte','lt','lte','in','is','not','order','limit','range'];
  for (const m of chainMethods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  chain.then = (resolve: any) => resolve({ data, error, count });
  return chain;
}

describe('GET /api/admin/flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not admin', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn((table: string) => {
        if (table === 'users') return mockChain({ is_admin: false });
        return mockChain([]);
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET();
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('Admin access required');
  });

  it('returns flags when user is admin', async () => {
    const user = { id: 'user-1' };
    const pitchFlags = [{ id: 'pf-1', reason: 'offensive' }];
    const promptFlags = [{ id: 'prf-1', reason: 'duplicate' }];

    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn((table: string) => {
        if (table === 'users') return mockChain({ is_admin: true });
        if (table === 'pitch_flags') return mockChain(pitchFlags);
        if (table === 'prompt_flags') return mockChain(promptFlags);
        return mockChain([]);
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pitch_flags).toEqual(pitchFlags);
    expect(body.prompt_flags).toEqual(promptFlags);
  });

  it('returns empty arrays when no flags exist', async () => {
    const user = { id: 'user-1' };

    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn((table: string) => {
        if (table === 'users') return mockChain({ is_admin: true });
        if (table === 'pitch_flags') return mockChain(null);
        if (table === 'prompt_flags') return mockChain(null);
        return mockChain(null);
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pitch_flags).toEqual([]);
    expect(body.prompt_flags).toEqual([]);
  });
});
