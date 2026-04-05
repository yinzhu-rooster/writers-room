import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, DELETE } from './route';

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

function makePostRequest(body: unknown, id = 'pitch-1') {
  return new NextRequest(`http://localhost/api/pitches/${id}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id = 'pitch-1') {
  return new NextRequest(`http://localhost/api/pitches/${id}/reactions`, {
    method: 'DELETE',
  });
}

describe('POST /api/pitches/[id]/reactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ reaction_type: 'laugh' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid reaction_type', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ reaction_type: 'invalid' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid reaction type');
  });

  it('returns 404 for nonexistent pitch', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ reaction_type: 'laugh' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(404);
  });

  it('returns 403 when reacting to own pitch', async () => {
    const user = { id: 'user-1' };
    const pitch = {
      user_id: 'user-1', // same as current user
      prompt_id: 'prompt-1',
      prompts: { closes_at: new Date(Date.now() + 3600000).toISOString() },
    };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(pitch)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ reaction_type: 'laugh' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(403);
  });

  it('toggles off same reaction (returns null)', async () => {
    const user = { id: 'user-1' };
    const pitch = {
      user_id: 'other-user',
      prompt_id: 'prompt-1',
      prompts: { closes_at: new Date(Date.now() + 3600000).toISOString() },
    };
    const existingReaction = { id: 'reaction-1', reaction_type: 'laugh' };

    let callCount = 0;
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'pitches') return mockChain(pitch);
        if (table === 'reactions') {
          callCount++;
          if (callCount === 1) return mockChain(existingReaction); // maybeSingle for existing
          return mockChain(null, null); // delete
        }
        return mockChain();
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ reaction_type: 'laugh' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reaction).toBeNull();
  });

  it('creates new reaction (returns 201)', async () => {
    const user = { id: 'user-1' };
    const pitch = {
      user_id: 'other-user',
      prompt_id: 'prompt-1',
      prompts: { closes_at: new Date(Date.now() + 3600000).toISOString() },
    };
    const newReaction = { id: 'reaction-1', reaction_type: 'laugh', pitch_id: 'pitch-1', user_id: 'user-1' };

    let reactionsCallCount = 0;
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'pitches') return mockChain(pitch);
        if (table === 'reactions') {
          reactionsCallCount++;
          if (reactionsCallCount === 1) return mockChain(null); // no existing reaction
          return mockChain(newReaction); // upsert result
        }
        return mockChain();
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ reaction_type: 'laugh' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.reaction).toEqual(newReaction);
  });
});

describe('DELETE /api/pitches/[id]/reactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(401);
  });

  it('removes reaction', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(null, null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
