import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/cron-auth', () => ({
  verifyCronSecret: vi.fn(),
}));

vi.mock('@/lib/ai/pitch-comedian', () => ({
  generateComedianPitches: vi.fn(),
  getComedianPitchHour: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/cron-auth';
import { generateComedianPitches, getComedianPitchHour } from '@/lib/ai/pitch-comedian';

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
  const url = new URL('http://localhost/api/cron/ai-pitch');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), {
    method: 'POST',
    headers: { authorization: 'Bearer test-secret' },
  });
}

describe('POST /api/cron/ai-pitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 with invalid cron secret', async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(false);

    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it('returns message when no open prompts', async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(true);

    const supabase = {
      from: vi.fn().mockReturnValue(mockChain([], null)), // no open prompts
    };
    vi.mocked(createAdminClient).mockReturnValue(supabase as any);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('No open prompts');
  });

  it('generates pitches for comedians when forced', async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(true);
    // getComedianPitchHour returns a low hour so all comedians pass hour check when forced
    vi.mocked(getComedianPitchHour).mockReturnValue(0);

    const openPrompts = [
      { id: 'prompt-1', body: 'Headline prompt', prompt_type: 'headline' },
    ];
    const generatedPitches = [
      { prompt_id: 'prompt-1', body: 'AI pitch text' },
    ];
    vi.mocked(generateComedianPitches).mockReturnValue(generatedPitches as any);

    let callCount = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'prompts') return mockChain(openPrompts, null);
        if (table === 'pitches') {
          callCount++;
          // Alternate between existing pitches check (empty) and insert (null error)
          if (callCount % 2 === 1) return mockChain([], null); // no existing pitches
          return mockChain(null, null); // insert success
        }
        return mockChain();
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(supabase as any);

    const response = await POST(makeRequest({ force: 'true' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('pitched');
    expect(body).toHaveProperty('skipped');
    expect(body.prompts).toBe(1);
  });
});
