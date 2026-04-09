import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
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

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/leaderboard');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns leaderboard sorted by total_laughs (default)', async () => {
    const users = [
      { id: 'u1', username: 'Alice', total_laughs: 100, total_reps: 10 },
      { id: 'u2', username: 'Bob', total_laughs: 50, total_reps: 5 },
    ];
    const chain = mockChain(users, null, 2);
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest({ sort: 'total_laughs' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sort).toBe('total_laughs');
    expect(body.leaderboard).toEqual(users);
    expect(body.total).toBe(2);
  });

  it('returns leaderboard sorted by avg_laughs (filters users with 0 reps)', async () => {
    const users = [
      { id: 'u1', username: 'Alice', total_laughs: 100, total_reps: 10 },
      { id: 'u2', username: 'Bob', total_laughs: 0, total_reps: 0 },
      { id: 'u3', username: 'Carol', total_laughs: 200, total_reps: 5 },
    ];
    const chain = mockChain(users, null, 3);
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest({ sort: 'avg_laughs' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sort).toBe('avg_laughs');
    // Bob (total_reps: 0) should be filtered out
    const usernames = body.leaderboard.map((u: any) => u.username);
    expect(usernames).not.toContain('Bob');
    // Carol has 200/5=40 avg, Alice has 100/10=10 avg — Carol should be first
    expect(body.leaderboard[0].username).toBe('Carol');
  });

  it('returns empty leaderboard for reactions_given when no reactions', async () => {
    const users = [
      { id: 'u1', username: 'Alice', total_laughs: 10, total_reps: 5 },
    ];
    const chain = mockChain(users, null, 1);
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest({ sort: 'reactions_given' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sort).toBe('reactions_given');
    expect(body.leaderboard).toEqual([]);
    expect(body.total).toBe(0);
  });
});
