import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPitchSchema } from '@/lib/validators/pitch';
import { badRequest, unauthorized, safeJson } from '@/lib/api-error';
import { getConfigInt } from '@/lib/config';
import { serializePitch } from '@/lib/serialize-pitch';


const PAGE_SIZE = 100;

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
    .select('*, users!inner(username, is_ai), reactions!left(reaction_type, user_id)', { count: 'exact' })
    .eq('prompt_id', promptId)
    .is('deleted_at', null);

  if (isOpen) {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('laugh_count', { ascending: false });
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: pitches, count, error } = await query;
  if (error) {
    console.error('Pitches load error:', error.message, error.details, error.code);
    return badRequest('Failed to load pitches');
  }

  const minReactionsForReveal = isOpen ? 0 : await getConfigInt('min_reactions_for_reveal');

  const serialized = (pitches ?? []).map((pitch) =>
    serializePitch(pitch as never, {
      currentUserId: user?.id ?? null,
      isOpen,
      closesAt: prompt.closes_at,
      minReactionsForReveal,
    })
  );

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

  const body = await safeJson(request);
  if (body instanceof NextResponse) return body;
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

  if (error) {
    console.error('Pitch insert error:', error.message, error.details, error.code);
    return badRequest(error.message);
  }

  return NextResponse.json(pitch, { status: 201 });
}
