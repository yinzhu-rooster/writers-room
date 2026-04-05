import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from './route';

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

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/users/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await PATCH(makeRequest({ username: 'newname' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid data (bad avatar_url)', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await PATCH(makeRequest({ avatar_url: 'not-a-url' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for no fields to update', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await PATCH(makeRequest({}));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('No fields to update');
  });

  it('returns 400 for duplicate username', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(null, { code: '23505', message: 'duplicate key' })),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await PATCH(makeRequest({ username: 'takenuser' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Username already taken');
  });

  it('returns updated profile on success', async () => {
    const user = { id: 'user-1' };
    const updatedProfile = { id: 'user-1', username: 'newname', avatar_url: null };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(updatedProfile, null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await PATCH(makeRequest({ username: 'newname' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.username).toBe('newname');
  });
});
