import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock before importing middleware
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/server', () => {
  const actual = {
    NextResponse: {
      next: vi.fn(),
      redirect: vi.fn(),
    },
  };
  // Make NextResponse a constructor too for error responses
  const NR = function (this: any, body: string, init: any) {
    this.body = body;
    this.status = init?.status;
  } as any;
  NR.next = actual.NextResponse.next;
  NR.redirect = actual.NextResponse.redirect;
  return { NextResponse: NR };
});

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { middleware } from './middleware';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockNextResponseNext = vi.mocked(NextResponse.next);
const mockNextResponseRedirect = vi.mocked(NextResponse.redirect);

function makeRequest(path: string, cookies: Record<string, string> = {}): any {
  const url = `http://localhost:3000${path}`;
  const request: any = new Request(url);
  request.cookies = {
    getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
    get: (name: string) => cookies[name] ? { name, value: cookies[name] } : undefined,
    set: vi.fn(),
  };
  request.nextUrl = new URL(url);
  return request;
}

function makeMockSupabaseResponse() {
  const cookieStore: Record<string, string> = {};
  return {
    cookies: {
      getAll: () => Object.entries(cookieStore).map(([name, value]) => ({ name, value })),
      set: vi.fn((name: string, value: string) => { cookieStore[name] = value; }),
    },
  };
}

function makeSupabaseClient(user: object | null, profile: object | null = null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: profile, error: null }),
    }),
  };
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

  const mockNextResponse = makeMockSupabaseResponse();
  mockNextResponseNext.mockReturnValue(mockNextResponse as any);
  mockNextResponseRedirect.mockImplementation((url: URL | string) => {
    const redirectResponse = makeMockSupabaseResponse();
    (redirectResponse as any).__redirectUrl = url.toString();
    return redirectResponse as any;
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('middleware', () => {
  it('returns 500 when env vars are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const request = makeRequest('/');
    const response = await middleware(request);

    expect(response).toBeDefined();
    expect(response.status).toBe(500);
  });

  it('redirects unauthenticated users from / to /closed', async () => {
    const mockSupabase = makeSupabaseClient(null);
    mockCreateServerClient.mockImplementation((_url, _key, opts) => mockSupabase as any);

    const request = makeRequest('/');
    await middleware(request);

    expect(mockNextResponseRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'http://localhost:3000/closed' })
    );
  });

  it('redirects users without username to /onboarding', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', user_metadata: {} };
    const mockSupabase = makeSupabaseClient(mockUser, { username: null });
    mockCreateServerClient.mockImplementation((_url, _key, opts) => mockSupabase as any);

    const request = makeRequest('/dashboard');
    await middleware(request);

    expect(mockNextResponseRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'http://localhost:3000/onboarding' })
    );
  });

  it('does not redirect when user has username (via DB)', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', user_metadata: {} };
    const mockSupabase = makeSupabaseClient(mockUser, { username: 'testuser' });
    mockCreateServerClient.mockImplementation((_url, _key, opts) => mockSupabase as any);

    const request = makeRequest('/dashboard');
    await middleware(request);

    expect(mockNextResponseRedirect).not.toHaveBeenCalled();
  });

  it('does not redirect for /api/ paths even without username', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', user_metadata: {} };
    const mockSupabase = makeSupabaseClient(mockUser, { username: null });
    mockCreateServerClient.mockImplementation((_url, _key, opts) => mockSupabase as any);

    const request = makeRequest('/api/some-endpoint');
    await middleware(request);

    expect(mockNextResponseRedirect).not.toHaveBeenCalled();
  });

  it('does not redirect for /onboarding path even without username', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', user_metadata: {} };
    const mockSupabase = makeSupabaseClient(mockUser, { username: null });
    mockCreateServerClient.mockImplementation((_url, _key, opts) => mockSupabase as any);

    const request = makeRequest('/onboarding');
    await middleware(request);

    expect(mockNextResponseRedirect).not.toHaveBeenCalled();
  });
});
