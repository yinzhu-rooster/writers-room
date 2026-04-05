import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

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

function makeRequest(body: unknown, id = 'prompt-1') {
  return new NextRequest(`http://localhost/api/prompts/${id}/flags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/prompts/[id]/flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makeRequest({ reason: 'offensive' }), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid reason', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makeRequest({ reason: 'not_valid' }), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid flag reason');
  });

  it('returns 404 when prompt not found', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makeRequest({ reason: 'offensive' }), { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(response.status).toBe(404);
  });

  it('returns 400 when prompt is closed', async () => {
    const user = { id: 'user-1' };
    const prompt = { closes_at: new Date(Date.now() - 3600000).toISOString() }; // closed

    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'prompts') return mockChain(prompt);
        return mockChain();
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makeRequest({ reason: 'offensive' }), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('closed');
  });

  it('returns 409 for duplicate flag', async () => {
    const user = { id: 'user-1' };
    const prompt = { closes_at: new Date(Date.now() + 3600000).toISOString() }; // open

    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'prompts') return mockChain(prompt);
        if (table === 'prompt_flags') return mockChain(null, { code: '23505', message: 'duplicate' });
        return mockChain();
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makeRequest({ reason: 'offensive' }), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('Already flagged');
  });

  it('returns 201 on success', async () => {
    const user = { id: 'user-1' };
    const prompt = { closes_at: new Date(Date.now() + 3600000).toISOString() }; // open

    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'prompts') return mockChain(prompt);
        if (table === 'prompt_flags') return mockChain(null, null);
        return mockChain();
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makeRequest({ reason: 'offensive' }), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
