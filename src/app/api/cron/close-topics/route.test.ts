import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/cron-auth', () => ({
  verifyCronSecret: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/cron-auth';

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

function makeRequest() {
  return new NextRequest('http://localhost/api/cron/close-prompts', {
    method: 'POST',
    headers: { authorization: 'Bearer test-secret' },
  });
}

describe('POST /api/cron/close-prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 with invalid cron secret', async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(false);

    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it('returns { processed: 0 } when no prompts to process', async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(true);

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'prompts') return mockChain([]); // no unprocessed prompts
        return mockChain();
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(supabase as any);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(0);
  });

  it('processes closed prompts and ranks pitches', async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(true);

    const prompts = [{ id: 'prompt-1' }];
    const pitches = [
      { id: 'pitch-1', laugh_count: 10, total_reaction_count: 5, created_at: '2024-01-01T10:00:00Z' },
      { id: 'pitch-2', laugh_count: 5, total_reaction_count: 2, created_at: '2024-01-01T10:01:00Z' },
    ];
    const config = { value: '3' };

    let promptCallCount = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'prompts') {
          promptCallCount++;
          if (promptCallCount === 1) return mockChain(prompts); // find unprocessed
          return mockChain(null, null); // mark as processed
        }
        if (table === 'pitches') return mockChain(pitches);
        if (table === 'app_config') return mockChain(config);
        return mockChain();
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(supabase as any);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(1);
  });
});
