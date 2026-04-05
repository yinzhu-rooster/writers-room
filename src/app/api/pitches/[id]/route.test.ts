import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';

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

function makeRequest(body: unknown, id = 'pitch-1') {
  return new NextRequest(`http://localhost/api/pitches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id = 'pitch-1') {
  return new NextRequest(`http://localhost/api/pitches/${id}`, {
    method: 'DELETE',
  });
}

describe('PATCH /api/pitches/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await PATCH(makeRequest({ body: 'new body' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 404 for nonexistent pitch', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await PATCH(makeRequest({ body: 'new body' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(404);
  });

  it('returns 403 when not own pitch', async () => {
    const user = { id: 'user-1' };
    const pitch = {
      id: 'pitch-1',
      user_id: 'other-user',
      created_at: new Date().toISOString(),
      prompts: { closes_at: new Date(Date.now() + 3600000).toISOString() },
    };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(pitch)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await PATCH(makeRequest({ body: 'new body' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(403);
  });

  it('returns 400 when edit window expired', async () => {
    const user = { id: 'user-1' };
    // created_at was 10 minutes ago, well past the 5-minute edit window
    const pitch = {
      id: 'pitch-1',
      user_id: 'user-1',
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      prompts: { closes_at: new Date(Date.now() + 3600000).toISOString() },
    };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(pitch)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await PATCH(makeRequest({ body: 'new body' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('EDIT_EXPIRED');
  });

  it('returns updated pitch on success', async () => {
    const user = { id: 'user-1' };
    const pitch = {
      id: 'pitch-1',
      user_id: 'user-1',
      created_at: new Date().toISOString(), // just now — within edit window
      prompts: { closes_at: new Date(Date.now() + 3600000).toISOString() },
    };
    const updatedPitch = { id: 'pitch-1', body: 'new body', user_id: 'user-1' };

    let callCount = 0;
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockChain(pitch); // first call: fetch pitch
        return mockChain(updatedPitch); // second call: update pitch
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await PATCH(makeRequest({ body: 'new body' }), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.body).toBe('new body');
  });
});

describe('DELETE /api/pitches/[id]', () => {
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

  it('returns 404 for nonexistent pitch', async () => {
    const user = { id: 'user-1' };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(404);
  });

  it('returns 400 when prompt is closed', async () => {
    const user = { id: 'user-1' };
    const pitch = {
      id: 'pitch-1',
      user_id: 'user-1',
      prompts: { closes_at: new Date(Date.now() - 3600000).toISOString() }, // closed 1 hour ago
    };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(pitch)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('PROMPT_CLOSED');
  });

  it('soft-deletes on success', async () => {
    const user = { id: 'user-1' };
    const pitch = {
      id: 'pitch-1',
      user_id: 'user-1',
      prompts: { closes_at: new Date(Date.now() + 3600000).toISOString() }, // open
    };

    let callCount = 0;
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockChain(pitch); // fetch pitch
        return mockChain(null, null); // soft-delete
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: 'pitch-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
