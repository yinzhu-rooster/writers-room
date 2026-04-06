import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      console.error('Missing Supabase environment variables');
      return new NextResponse('Internal Server Error', { status: 500 });
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

    const pathname = request.nextUrl.pathname;

    if (user) {
      // Check onboarding status — always verify against DB for authenticated users
      // on non-API, non-onboarding pages
      if (
        !pathname.startsWith('/onboarding') &&
        !pathname.startsWith('/api/')
      ) {
        const { data: profile } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();

        if (!profile?.username) {
          const redirectUrl = new URL('/onboarding', request.url);
          const redirectResponse = NextResponse.redirect(redirectUrl);
          // Copy cookies with their full attributes
          supabaseResponse.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie);
          });
          return redirectResponse;
        }
      }
    }

    // Protect Open Topics (main page) — redirect visitors to /closed
    if (pathname === '/' && !user) {
      return NextResponse.redirect(new URL('/closed', request.url));
    }
  } catch (e) {
    console.error('Middleware error:', e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
