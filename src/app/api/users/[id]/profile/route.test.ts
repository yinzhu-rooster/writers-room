import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';

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
  return new NextRequest(`http://localhost/api/users/${id}/profile`);
}

describe('GET /api/users/[id]/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for nonexistent user', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue(mockChain(null)),
    };
    vi.mocked(createAdminClient).mockReturnValue(supabase as any);

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(response.status).toBe(404);
  });

  it('returns profile data with stats', async () => {
    const userData = {
      id: 'user-1',
      username: 'alice',
      avatar_url: null,
      is_ai: false,
      total_reps: 5,
      total_laughs: 20,
      created_at: '2024-01-01',
    };
    const pitches = [
      { laugh_count: 10, smile_count: 5, surprise_count: 2 },
      { laugh_count: 3, smile_count: 1, surprise_count: 0 },
    ];

    let callCount = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'users') return mockChain(userData);
        if (table === 'pitches') {
          callCount++;
          if (callCount === 1) return mockChain(null, null, 8); // pitch count
          if (callCount === 2) return mockChain(null, null, 0); // topics count
          if (callCount === 3) return mockChain([]); // closed topics
          if (callCount === 4) return mockChain({ rank: 2 }); // best finish
          return mockChain(pitches); // reaction totals
        }
        if (table === 'prompts') return mockChain(null, null, 3);
        return mockChain(null, null, 0);
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(supabase as any);

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.username).toBe('alice');
    expect(body).toHaveProperty('pitch_count');
    expect(body).toHaveProperty('topics_created');
    expect(body).toHaveProperty('best_finish');
    expect(body).toHaveProperty('reactions');
    expect(body.reactions).toHaveProperty('laughs');
    expect(body.reactions).toHaveProperty('smiles');
    expect(body.reactions).toHaveProperty('surprises');
  });
});
