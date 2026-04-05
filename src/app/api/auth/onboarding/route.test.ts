import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function mockChain(data: unknown = null, error: unknown = null) {
  const chain: any = {};
  const chainMethods = ['select','insert','update','delete','upsert','eq','neq','gt','gte','lt','lte','in','is','not','order','limit','range'];
  for (const m of chainMethods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makeRequest({ username: 'valid_user' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid username (too short)', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makeRequest({ username: 'ab' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('3-20 characters');
  });

  it('returns 400 for invalid username (invalid characters)', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makeRequest({ username: 'bad username!' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for duplicate username (error code 23505)', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const adminChain = mockChain(null, { code: '23505', message: 'duplicate key' });
    const adminClient = { from: vi.fn().mockReturnValue(adminChain) };
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const response = await POST(makeRequest({ username: 'validuser' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Username already taken');
  });

  it('returns success for valid username', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const adminChain = mockChain(null, null);
    const adminClient = { from: vi.fn().mockReturnValue(adminChain) };
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const response = await POST(makeRequest({ username: 'validuser' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
