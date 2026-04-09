import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unauthorized, forbidden, badRequest, notFound, serverError, safeJson } from '@/lib/api-error';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: unauthorized() };

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return { error: forbidden('Admin access required') };
  return { user };
}

export async function GET() {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if ('error' in auth && auth.error) return auth.error;

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

// Dismiss a flag or delete flagged content
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if ('error' in auth && auth.error) return auth.error;

  const body = await safeJson<{ action: string; flag_id: string; flag_type: string }>(request);
  if (body instanceof NextResponse) return body;

  const { action, flag_id, flag_type } = body;
  if (!flag_id || !flag_type) return badRequest('flag_id and flag_type are required');
  if (!['pitch', 'topic'].includes(flag_type)) return badRequest('flag_type must be "pitch" or "topic"');

  const flagTable = flag_type === 'pitch' ? 'pitch_flags' : 'prompt_flags';
  const flagFk = flag_type === 'pitch' ? 'pitch_id' : 'prompt_id';

  if (action === 'dismiss') {
    const { error } = await supabase.from(flagTable).delete().eq('id', flag_id);
    if (error) return serverError('Failed to dismiss flag');
    return NextResponse.json({ success: true });
  }

  if (action === 'delete_content') {
    // Get the flag to find the flagged content
    const { data: flag } = await supabase.from(flagTable).select(flagFk).eq('id', flag_id).single();
    if (!flag) return notFound('Flag not found');

    const contentId = flag[flagFk as keyof typeof flag] as string;

    if (flag_type === 'pitch') {
      // Soft-delete the pitch
      const { error } = await supabase
        .from('pitches')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', contentId);
      if (error) return serverError('Failed to delete pitch');
    } else {
      // Delete the topic and cascade
      const { error } = await supabase.from('prompts').delete().eq('id', contentId);
      if (error) return serverError('Failed to delete topic');
    }

    // Remove all flags for this content
    await supabase.from(flagTable).delete().eq(flagFk, contentId);

    return NextResponse.json({ success: true });
  }

  return badRequest('action must be "dismiss" or "delete_content"');
}
