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
  const url = new URL('http://localhost/api/users');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns users sorted by name (default)', async () => {
    const users = [
      { id: 'u1', username: 'Alice', created_at: '2024-01-01' },
      { id: 'u2', username: 'Bob', created_at: '2024-01-02' },
    ];
    const supabase = {
      from: vi.fn().mockReturnValue(mockChain(users, null, 2)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.writers).toEqual(users);
    expect(body.total).toBe(2);
  });

  it('returns users sorted by newest', async () => {
    const users = [
      { id: 'u2', username: 'Bob', created_at: '2024-01-02' },
      { id: 'u1', username: 'Alice', created_at: '2024-01-01' },
    ];
    const supabase = {
      from: vi.fn().mockReturnValue(mockChain(users, null, 2)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest({ sort: 'newest' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.writers[0].username).toBe('Bob');
  });

  it('handles errors', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue(mockChain(null, { message: 'DB error' })),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
