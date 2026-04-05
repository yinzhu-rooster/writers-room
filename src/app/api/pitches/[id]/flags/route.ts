import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { badRequest, unauthorized, conflict, serverError, safeJson } from '@/lib/api-error';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pitchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const limited = rateLimit(`flags:${user.id}`, 10);
  if (limited) return limited;

  const json = await safeJson<{ reason?: string }>(request);
  if (json instanceof NextResponse) return json;
  const { reason } = json;
  if (!reason || !['offensive', 'duplicate', 'plagiarized'].includes(reason)) {
    return badRequest('Invalid flag reason');
  }

  // Verify pitch exists and prompt is open
  const { data: pitch } = await supabase
    .from('pitches')
    .select('prompt_id, prompts!inner(closes_at)')
    .eq('id', pitchId)
    .is('deleted_at', null)
    .single();

  if (!pitch) return badRequest('Pitch not found');

  const prompts = pitch.prompts as unknown as { closes_at: string } | { closes_at: string }[];
  const prompt = Array.isArray(prompts) ? prompts[0] : prompts;
  if (new Date(prompt.closes_at) <= new Date()) {
    return badRequest('Cannot flag on closed prompts');
  }

  const { error } = await supabase
    .from('pitch_flags')
    .insert({ pitch_id: pitchId, user_id: user.id, reason });

  if (error) {
    if (error.code === '23505') return conflict('Already flagged');
    return serverError('Failed to flag pitch');
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
