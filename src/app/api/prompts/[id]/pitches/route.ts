import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPitchSchema } from '@/lib/validators/pitch';
import { badRequest, unauthorized } from '@/lib/api-error';
import { getConfigInt } from '@/lib/config';

const PAGE_SIZE = 20;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promptId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Get prompt to check status
  const { data: prompt } = await supabase
    .from('prompts')
    .select('closes_at')
    .eq('id', promptId)
    .single();

  if (!prompt) return badRequest('Prompt not found');

  const isOpen = new Date(prompt.closes_at) > new Date();

  let query = supabase
    .from('pitches')
    .select('*, reactions!left(reaction_type, user_id)', { count: 'exact' })
    .eq('prompt_id', promptId)
    .is('deleted_at', null);

  if (isOpen) {
    // Random order not easily done in Supabase, use created_at and shuffle client-side
    query = query.order('created_at', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: true });
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: pitches, count, error } = await query;
  if (error) return badRequest(error.message);

  // Serialize with anonymity rules
  const serialized = (pitches ?? []).map((pitch) => {
    const isOwn = user?.id === pitch.user_id;

    // Extract current user's reaction
    const myReaction = user
      ? (pitch.reactions as { reaction_type: string; user_id: string }[])?.find(
          (r) => r.user_id === user.id
        )?.reaction_type ?? null
      : null;

    const base = {
      id: pitch.id,
      prompt_id: pitch.prompt_id,
      body: pitch.body,
      created_at: pitch.created_at,
      edited_at: pitch.edited_at,
      is_own: isOwn,
      my_reaction: myReaction,
    };

    if (isOpen) {
      // Hide author, hide counts, compute edit_deadline
      const editDeadline = new Date(
        Math.min(
          new Date(pitch.created_at).getTime() + 5 * 60 * 1000,
          new Date(prompt.closes_at).getTime()
        )
      ).toISOString();

      return {
        ...base,
        user_id: isOwn ? pitch.user_id : null,
        laugh_count: null,
        smile_count: null,
        surprise_count: null,
        total_reaction_count: null,
        rank: null,
        is_revealed: false,
        edit_deadline: isOwn ? editDeadline : null,
      };
    } else {
      // Full data for closed prompts
      return {
        ...base,
        user_id: pitch.is_revealed || isOwn ? pitch.user_id : null,
        laugh_count: pitch.laugh_count,
        smile_count: pitch.smile_count,
        surprise_count: pitch.surprise_count,
        total_reaction_count: pitch.total_reaction_count,
        rank: pitch.rank,
        is_revealed: pitch.is_revealed,
        edit_deadline: null,
      };
    }
  });

  // Shuffle for open prompts
  if (isOpen) {
    for (let i = serialized.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [serialized[i], serialized[j]] = [serialized[j], serialized[i]];
    }
  }

  return NextResponse.json({
    pitches: serialized,
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promptId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = createPitchSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  // Check prompt is open
  const { data: prompt } = await supabase
    .from('prompts')
    .select('closes_at')
    .eq('id', promptId)
    .single();

  if (!prompt) return badRequest('Prompt not found');
  if (new Date(prompt.closes_at) <= new Date()) {
    return badRequest('This prompt is closed', 'PROMPT_CLOSED');
  }

  // Check pitch cap
  const pitchCap = await getConfigInt('default_pitch_cap_per_prompt');
  const { count } = await supabase
    .from('pitches')
    .select('*', { count: 'exact', head: true })
    .eq('prompt_id', promptId)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if ((count ?? 0) >= pitchCap) {
    return badRequest(
      `You've hit the pitch limit of ${pitchCap} for this topic. You can delete a pitch to add a new one.`,
      'PITCH_CAP'
    );
  }

  const { data: pitch, error } = await supabase
    .from('pitches')
    .insert({
      prompt_id: promptId,
      user_id: user.id,
      body: parsed.data.body,
    })
    .select()
    .single();

  if (error) return badRequest(error.message);

  return NextResponse.json(pitch, { status: 201 });
}
