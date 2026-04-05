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

describe('GET /api/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns counts for all entities', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'users') return mockChain(null, null, 42);
        if (table === 'prompts') return mockChain(null, null, 10);
        if (table === 'pitches') return mockChain(null, null, 100);
        if (table === 'reactions') return mockChain(null, null, 500);
        return mockChain(null, null, 0);
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total_writers).toBe(42);
    expect(body.total_topics).toBe(10);
    expect(body.total_pitches).toBe(100);
    expect(body.total_votes).toBe(500);
  });

  it('returns zeros when no entities exist', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue(mockChain(null, null, null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total_writers).toBe(0);
    expect(body.total_topics).toBe(0);
    expect(body.total_pitches).toBe(0);
    expect(body.total_votes).toBe(0);
  });
});
