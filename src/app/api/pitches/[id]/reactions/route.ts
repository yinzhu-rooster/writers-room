import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { badRequest, notFound, unauthorized, forbidden, serverError, safeJson } from '@/lib/api-error';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pitchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const limited = rateLimit(`reactions:${user.id}`, 30);
  if (limited) return limited;

  const json = await safeJson<{ reaction_type?: string }>(request);
  if (json instanceof NextResponse) return json;
  const { reaction_type } = json;
  if (!reaction_type || !['smile', 'laugh', 'surprise'].includes(reaction_type)) {
    return badRequest('Invalid reaction type');
  }

  // Get pitch with prompt to validate
  const { data: pitch } = await supabase
    .from('pitches')
    .select('user_id, prompt_id, prompts!inner(closes_at)')
    .eq('id', pitchId)
    .is('deleted_at', null)
    .single();

  if (!pitch) return notFound('Pitch not found');
  if (pitch.user_id === user.id) return forbidden('Cannot react to your own pitch');

  const prompts = pitch.prompts as unknown as { closes_at: string } | { closes_at: string }[];
  const prompt = Array.isArray(prompts) ? prompts[0] : prompts;
  if (new Date(prompt.closes_at) <= new Date()) {
    return badRequest('This prompt is closed', 'PROMPT_CLOSED');
  }

  // Try to delete an existing reaction of the same type (toggle off).
  // Using compound key match makes this safe against concurrent requests.
  const { data: deleted } = await supabase
    .from('reactions')
    .delete()
    .eq('pitch_id', pitchId)
    .eq('user_id', user.id)
    .eq('reaction_type', reaction_type)
    .select()
    .maybeSingle();

  if (deleted) {
    // Had the same reaction — toggled off
    return NextResponse.json({ reaction: null });
  }

  // Upsert handles both new reactions and type changes atomically
  const { data: upserted, error } = await supabase
    .from('reactions')
    .upsert(
      { pitch_id: pitchId, user_id: user.id, reaction_type },
      { onConflict: 'pitch_id,user_id' }
    )
    .select()
    .single();

  if (error) return serverError('Failed to save reaction');
  return NextResponse.json({ reaction: upserted });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pitchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('pitch_id', pitchId)
    .eq('user_id', user.id);

  if (error) return serverError('Failed to remove reaction');

  return NextResponse.json({ success: true });
}
