import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updatePitchSchema } from '@/lib/validators/pitch';
import { badRequest, unauthorized, forbidden, notFound } from '@/lib/api-error';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = updatePitchSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  // Get pitch with prompt info
  const { data: pitch } = await supabase
    .from('pitches')
    .select('*, prompts!inner(closes_at)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!pitch) return notFound('Pitch not found');
  if (pitch.user_id !== user.id) return forbidden('Not your pitch');

  // Check edit window: min(created_at + 5min, closes_at) > now()
  const prompt = pitch.prompts as unknown as { closes_at: string };
  const editDeadline = Math.min(
    new Date(pitch.created_at).getTime() + 5 * 60 * 1000,
    new Date(prompt.closes_at).getTime()
  );

  if (Date.now() > editDeadline) {
    return badRequest('Edit window has expired', 'EDIT_EXPIRED');
  }

  const { data: updated, error } = await supabase
    .from('pitches')
    .update({
      body: parsed.data.body,
      edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return badRequest(error.message);

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: pitch } = await supabase
    .from('pitches')
    .select('*, prompts!inner(closes_at)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!pitch) return notFound('Pitch not found');
  if (pitch.user_id !== user.id) return forbidden('Not your pitch');

  const prompt = pitch.prompts as unknown as { closes_at: string };
  if (new Date(prompt.closes_at) <= new Date()) {
    return badRequest('Cannot delete pitches on closed prompts', 'PROMPT_CLOSED');
  }

  const { error } = await supabase
    .from('pitches')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return badRequest(error.message);

  return NextResponse.json({ success: true });
}
