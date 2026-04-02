import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      console.error('Missing Supabase environment variables');
      return supabaseResponse;
    }

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    // Refresh session
    const { data: { user } } = await supabase.auth.getUser();

    // Sync users row (idempotent upsert) — uses service role to bypass RLS
    if (user) {
      const admin = createClient(url, serviceKey);

      const { data: existingUser } = await admin
        .from('users')
        .select('id, username')
        .eq('id', user.id)
        .single();

      let hasUsername = false;

      if (!existingUser) {
        await admin.from('users').insert({
          id: user.id,
          email: user.email!,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        });
        hasUsername = false;
      } else {
        hasUsername = !!existingUser.username;
      }

      // Redirect to onboarding if no username
      const pathname = request.nextUrl.pathname;
      if (
        !hasUsername &&
        !pathname.startsWith('/onboarding') &&
        !pathname.startsWith('/api/')
      ) {
        const redirectUrl = new URL('/onboarding', request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        // Carry over cookies from supabaseResponse so session is preserved
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value);
        });
        return redirectResponse;
      }
    }

    // Protect Open Topics (main page) — redirect visitors to /closed
    const pathname = request.nextUrl.pathname;
    if (pathname === '/' && !user) {
      return NextResponse.redirect(new URL('/closed', request.url));
    }
  } catch (e) {
    console.error('Middleware error:', e);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
