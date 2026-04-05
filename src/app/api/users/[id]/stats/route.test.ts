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

function makeRequest(id = 'user-1') {
  return new NextRequest(`http://localhost/api/users/${id}/stats`);
}

describe('GET /api/users/[id]/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 403 when viewing other user stats', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    // Trying to view user-2's stats while logged in as user-1
    const response = await GET(makeRequest('user-2'), { params: Promise.resolve({ id: 'user-2' }) });
    expect(response.status).toBe(403);
  });

  it('returns stats for authenticated user', async () => {
    const user = { id: 'user-1' };
    const profileUser = {
      id: 'user-1',
      username: 'alice',
      avatar_url: null,
      total_reps: 5,
      total_laughs: 20,
      created_at: '2024-01-01',
    };
    const pitches = [
      { laugh_count: 5, smile_count: 2, surprise_count: 1 },
    ];

    let pitchCallCount = 0;
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'users') return mockChain(profileUser);
        if (table === 'pitches') {
          pitchCallCount++;
          if (pitchCallCount === 1) return mockChain({ rank: 1 }); // best finish
          if (pitchCallCount === 2) return mockChain([]); // pitch history
          return mockChain(pitches); // reaction totals
        }
        return mockChain();
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest('user-1'), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.username).toBe('alice');
    expect(body).toHaveProperty('best_finish');
    expect(body).toHaveProperty('pitch_history');
    expect(body).toHaveProperty('reaction_breakdown');
    expect(body.reaction_breakdown).toHaveProperty('laughs');
  });
});
