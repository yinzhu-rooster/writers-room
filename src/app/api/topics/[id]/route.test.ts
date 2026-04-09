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

function makeRequest(id = 'prompt-1') {
  return new NextRequest(`http://localhost/api/topics/${id}`);
}

describe('GET /api/topics/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for nonexistent prompt', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain(null, { message: 'not found' })),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(response.status).toBe(404);
  });

  it('returns prompt data for closed prompt', async () => {
    const prompt = {
      id: 'prompt-1',
      body: 'Test prompt',
      closes_at: new Date(Date.now() - 3600000).toISOString(), // closed
      created_by: 'user-1',
    };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain(prompt, null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('prompt-1');
    // Closed prompts expose creator
    expect(body.created_by).toBe('user-1');
  });

  it('anonymizes creator for open prompts (non-owner)', async () => {
    const prompt = {
      id: 'prompt-1',
      body: 'Open prompt',
      closes_at: new Date(Date.now() + 3600000).toISOString(), // open
      created_by: 'user-owner',
    };
    const viewer = { id: 'user-viewer' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: viewer } }) },
      from: vi.fn().mockReturnValue(mockChain(prompt, null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.created_by).toBeNull();
  });

  it('shows creator for open prompts when viewing own', async () => {
    const ownerId = 'user-owner';
    const prompt = {
      id: 'prompt-1',
      body: 'Open prompt',
      closes_at: new Date(Date.now() + 3600000).toISOString(), // open
      created_by: ownerId,
    };
    const owner = { id: ownerId };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: owner } }) },
      from: vi.fn().mockReturnValue(mockChain(prompt, null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.created_by).toBe(ownerId);
  });
});
