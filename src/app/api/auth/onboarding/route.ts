import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { badRequest, unauthorized, serverError, safeJson } from '@/lib/api-error';
import { usernameSchema } from '@/lib/validators/username';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const json = await safeJson<{ username?: string }>(request);
  if (json instanceof NextResponse) return json;
  const trimmed = (json.username ?? '').trim();

  const parsed = usernameSchema.safeParse(trimmed);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  // Use admin client to bypass RLS
  const admin = createAdminClient();
  const { error } = await admin
    .from('users')
    .update({ username: parsed.data })
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505') return badRequest('Username already taken');
    return serverError('Failed to set username');
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('has_username', '1', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  return response;
}
