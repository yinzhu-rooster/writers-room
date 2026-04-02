import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { badRequest, unauthorized, safeJson } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const json = await safeJson<{ username?: string }>(request);
  if (json instanceof NextResponse) return json;
  const { username } = json;
  const trimmed = (username ?? '').trim();

  if (trimmed.length < 3 || trimmed.length > 20) {
    return badRequest('Username must be 3-20 characters');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return badRequest('Username can only contain letters, numbers, and underscores');
  }

  // Use admin client to bypass RLS
  const admin = createAdminClient();
  const { error } = await admin
    .from('users')
    .update({ username: trimmed })
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505') return badRequest('Username already taken');
    return badRequest('Failed to set username');
  }

  return NextResponse.json({ success: true });
}
