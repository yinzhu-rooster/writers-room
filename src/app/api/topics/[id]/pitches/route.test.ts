import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getConfigInt: vi.fn().mockResolvedValue(3),
}));

vi.mock('@/lib/serialize-pitch', () => ({
  serializePitch: vi.fn((pitch: any) => pitch),
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

function makeGetRequest(id = 'prompt-1') {
  return new NextRequest(`http://localhost/api/topics/${id}/pitches`);
}

function makePostRequest(body: unknown, id = 'prompt-1') {
  return new NextRequest(`http://localhost/api/topics/${id}/pitches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/topics/[id]/pitches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for nonexistent prompt', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain(null)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeGetRequest(), { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(response.status).toBe(404);
  });

  it('returns serialized pitches', async () => {
    const prompt = { closes_at: new Date(Date.now() - 3600000).toISOString() };
    const pitches = [
      { id: 'p1', body: 'Pitch 1', users: { username: 'alice', is_ai: false }, reactions: [] },
    ];

    let callCount = 0;
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockChain(prompt); // prompt lookup
        return mockChain(pitches, null, 1); // pitches query
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await GET(makeGetRequest(), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pitches).toHaveLength(1);
    expect(body.total).toBe(1);
  });
});

describe('POST /api/topics/[id]/pitches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn().mockReturnValue(mockChain()),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ body: 'My pitch' }), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 400 when prompt is closed', async () => {
    const user = { id: 'user-1' };
    const prompt = { closes_at: new Date(Date.now() - 3600000).toISOString() }; // closed

    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue(mockChain(prompt)),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ body: 'My pitch' }), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('PROMPT_CLOSED');
  });

  it('returns 400 when pitch cap reached', async () => {
    const user = { id: 'user-1' };
    const prompt = { closes_at: new Date(Date.now() + 3600000).toISOString() }; // open

    let callCount = 0;
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockChain(prompt); // prompt lookup
        return mockChain(null, null, 3); // pitch count: at cap (getConfigInt returns 3)
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ body: 'My pitch' }), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('PITCH_CAP');
  });

  it('returns 201 on success', async () => {
    const user = { id: 'user-1' };
    const prompt = { closes_at: new Date(Date.now() + 3600000).toISOString() }; // open
    const newPitch = { id: 'pitch-new', body: 'My pitch', user_id: 'user-1' };

    let callCount = 0;
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockChain(prompt); // prompt lookup
        if (callCount === 2) return mockChain(null, null, 0); // pitch count: under cap
        return mockChain(newPitch); // insert
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const response = await POST(makePostRequest({ body: 'My pitch' }), { params: Promise.resolve({ id: 'prompt-1' }) });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe('pitch-new');
  });
});
