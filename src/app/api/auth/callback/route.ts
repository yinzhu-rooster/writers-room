import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';
  // Prevent open redirect: validate the redirect stays on the same origin
  let next = '/';
  try {
    const resolved = new URL(rawNext, origin);
    if (resolved.origin === origin) next = resolved.pathname + resolved.search + resolved.hash;
  } catch {
    // Invalid URL — fall back to /
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: session, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && session?.user) {
      // Sync user row on login (runs once per login, not every request)
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!existing && session.user.email) {
        await admin.from('users').insert({
          id: session.user.id,
          email: session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url ?? null,
        }).single();
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
