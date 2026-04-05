import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock before importing middleware
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/server', () => {
  const actual = {
    NextResponse: {
      next: vi.fn(),
      redirect: vi.fn(),
    },
  };
  return actual;
});

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { middleware } from './middleware';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockCreateClient = vi.mocked(createClient);
const mockNextResponseNext = vi.mocked(NextResponse.next);
const mockNextResponseRedirect = vi.mocked(NextResponse.redirect);

function makeRequest(path: string): any {
  const url = `http://localhost:3000${path}`;
  const request: any = new Request(url);
  request.cookies = { getAll: () => [], set: vi.fn() };
  request.nextUrl = new URL(url);
  return request;
}

function makeMockSupabaseResponse() {
  const cookies: Record<string, string> = {};
  return {
    cookies: {
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      set: vi.fn((name: string, value: string) => { cookies[name] = value; }),
    },
  };
}

function makeSupabaseClient(user: object | null, existingUser: object | null = null) {
  const mockAdminClient = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: existingUser, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };

  mockCreateClient.mockReturnValue(mockAdminClient as any);

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

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
  it('returns next response when env vars are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    const request = makeRequest('/');
    const response = await middleware(request);

    expect(mockNextResponseNext).toHaveBeenCalled();
    expect(mockNextResponseRedirect).not.toHaveBeenCalled();
    // Returns the supabaseResponse (next response) directly
    expect(response).toBeDefined();
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
    const mockSupabase = makeSupabaseClient(mockUser, { id: 'user-1', username: null });
    mockCreateServerClient.mockImplementation((_url, _key, opts) => mockSupabase as any);

    const request = makeRequest('/dashboard');
    await middleware(request);

    expect(mockNextResponseRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'http://localhost:3000/onboarding' })
    );
  });

  it('does not redirect when user has username', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', user_metadata: {} };
    const mockSupabase = makeSupabaseClient(mockUser, { id: 'user-1', username: 'coolwriter' });
    mockCreateServerClient.mockImplementation((_url, _key, opts) => mockSupabase as any);

    const request = makeRequest('/dashboard');
    await middleware(request);

    expect(mockNextResponseRedirect).not.toHaveBeenCalled();
  });

  it('does not redirect for /api/ paths even without username', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', user_metadata: {} };
    const mockSupabase = makeSupabaseClient(mockUser, { id: 'user-1', username: null });
    mockCreateServerClient.mockImplementation((_url, _key, opts) => mockSupabase as any);

    const request = makeRequest('/api/some-endpoint');
    await middleware(request);

    expect(mockNextResponseRedirect).not.toHaveBeenCalled();
  });

  it('does not redirect for /onboarding path even without username', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', user_metadata: {} };
    const mockSupabase = makeSupabaseClient(mockUser, { id: 'user-1', username: null });
    mockCreateServerClient.mockImplementation((_url, _key, opts) => mockSupabase as any);

    const request = makeRequest('/onboarding');
    await middleware(request);

    expect(mockNextResponseRedirect).not.toHaveBeenCalled();
  });

  it('creates new user row when user does not exist in DB', async () => {
    const mockUser = {
      id: 'new-user-1',
      email: 'new@example.com',
      user_metadata: { avatar_url: 'https://example.com/avatar.png' },
    };

    // existingUser = null means no row found — middleware will call insert
    const mockSupabase = makeSupabaseClient(mockUser, null);
    mockCreateServerClient.mockImplementation((_url, _key, opts) => mockSupabase as any);

    const request = makeRequest('/onboarding');
    await middleware(request);

    // After running, grab the admin client that was created by createClient()
    const mockAdminClient = mockCreateClient.mock.results[0]?.value as any;
    expect(mockAdminClient).toBeDefined();
    expect(mockAdminClient.from).toHaveBeenCalledWith('users');
  });
});
