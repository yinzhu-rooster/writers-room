import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { badRequest, unauthorized, forbidden } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pitchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { reaction_type } = await request.json();
  if (!['smile', 'laugh', 'surprise'].includes(reaction_type)) {
    return badRequest('Invalid reaction type');
  }

  // Get pitch with prompt to validate
  const { data: pitch } = await supabase
    .from('pitches')
    .select('user_id, prompt_id, prompts!inner(closes_at)')
    .eq('id', pitchId)
    .is('deleted_at', null)
    .single();

  if (!pitch) return badRequest('Pitch not found');
  if (pitch.user_id === user.id) return forbidden('Cannot react to your own pitch');

  const prompt = pitch.prompts as unknown as { closes_at: string };
  if (new Date(prompt.closes_at) <= new Date()) {
    return badRequest('This prompt is closed', 'PROMPT_CLOSED');
  }

  // Upsert reaction
  const { data: existing } = await supabase
    .from('reactions')
    .select('id, reaction_type')
    .eq('pitch_id', pitchId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    if (existing.reaction_type === reaction_type) {
      // Toggle off — same reaction means remove
      await supabase.from('reactions').delete().eq('id', existing.id);
      return NextResponse.json({ reaction: null });
    } else {
      // Change reaction type
      const { data: updated } = await supabase
        .from('reactions')
        .update({ reaction_type, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      return NextResponse.json({ reaction: updated });
    }
  } else {
    // Insert new
    const { data: created, error } = await supabase
      .from('reactions')
      .insert({ pitch_id: pitchId, user_id: user.id, reaction_type })
      .select()
      .single();

    if (error) return badRequest(error.message);
    return NextResponse.json({ reaction: created }, { status: 201 });
  }
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

  if (error) return badRequest(error.message);

  return NextResponse.json({ success: true });
}
