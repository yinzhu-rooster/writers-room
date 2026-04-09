import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

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
  chain.rpc = vi.fn().mockResolvedValue({ data: [], error: null });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  chain.then = (resolve: any) => resolve({ data, error, count });
  return chain;
}

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/topics');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/topics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for open prompts when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain([], null, 0)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeGetRequest({ status: 'open' }));
    expect(response.status).toBe(401);
  });

  it('returns prompts for closed status without auth', async () => {
    const prompts = [
      {
        id: 'p1',
        body: 'Closed topic',
        closes_at: new Date(Date.now() - 3600000).toISOString(),
        created_by: 'user-1',
      },
    ];
    const chain = mockChain(prompts, null, 1);
    // Override rpc to return empty stats
    chain.rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(chain),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeGetRequest({ status: 'closed' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.topics).toHaveLength(1);
  });
});

describe('POST /api/topics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ body: 'Test prompt', prompt_type: 'headline', duration_hours: 24 }));
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ body: '', prompt_type: 'headline' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when max open prompts reached', async () => {
    const user = { id: 'user-1' };
    let callCount = 0;
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockChain({ max_open_prompts: 2 }); // profile
        return mockChain(null, null, 2); // count: already at max
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ body: 'New prompt', prompt_type: 'headline', duration_hours: 24 }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('MAX_OPEN_PROMPTS');
  });

  it('returns 201 on success', async () => {
    const user = { id: 'user-1' };
    const newPrompt = { id: 'p-new', body: 'New prompt', prompt_type: 'headline' };

    let callCount = 0;
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockChain({ max_open_prompts: 2 }); // profile
        if (callCount === 2) return mockChain(null, null, 0); // count check
        return mockChain(newPrompt); // insert
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ body: 'New prompt', prompt_type: 'headline', duration_hours: 24 }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe('p-new');
  });
});
