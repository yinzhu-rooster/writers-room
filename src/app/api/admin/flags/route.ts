import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unauthorized, forbidden } from '@/lib/api-error';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // Check admin
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return forbidden('Admin access required');

  const [{ data: pitchFlags }, { data: promptFlags }] = await Promise.all([
    supabase
      .from('pitch_flags')
      .select('*, pitches!inner(body, user_id, prompt_id), users!inner(username)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('prompt_flags')
      .select('*, prompts!inner(body, created_by), users!inner(username)')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    pitch_flags: pitchFlags ?? [],
    prompt_flags: promptFlags ?? [],
  });
}
