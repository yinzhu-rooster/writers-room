import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/cron-auth', () => ({
  verifyCronSecret: vi.fn(),
}));

vi.mock('@/lib/ai/prompt-generator', () => ({
  generatePrompts: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/cron-auth';
import { generatePrompts } from '@/lib/ai/prompt-generator';

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
  return new NextRequest('http://localhost/api/cron/generate-prompts', {
    method: 'POST',
    headers: { authorization: 'Bearer test-secret' },
  });
}

describe('POST /api/cron/generate-prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 with invalid cron secret', async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(false);

    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it('skips if already generated for today', async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(true);

    const supabase = {
      from: vi.fn().mockReturnValue(mockChain(null, null, 5)), // already 5 prompts exist
    };
    vi.mocked(createAdminClient).mockReturnValue(supabase as any);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('Already generated');
  });

  it('generates and inserts prompts', async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(true);

    const generatedPrompts = [
      { body: 'Prompt 1', prompt_type: 'headline' },
      { body: 'Prompt 2', prompt_type: 'setup' },
      { body: 'Prompt 3', prompt_type: 'format' },
      { body: 'Prompt 4', prompt_type: 'topical' },
      { body: 'Prompt 5', prompt_type: 'evergreen' },
    ];
    vi.mocked(generatePrompts).mockResolvedValue(generatedPrompts as any);

    let callCount = 0;
    const supabase = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockChain(null, null, 0); // no existing prompts today
        return mockChain(null, null); // insert
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(supabase as any);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.generated).toBe(5);
  });
});
