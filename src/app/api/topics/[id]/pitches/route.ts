import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPitchSchema } from '@/lib/validators/pitch';
import { badRequest, notFound, unauthorized, serverError, safeJson } from '@/lib/api-error';
import { getConfigInt } from '@/lib/config';
import { serializePitch } from '@/lib/serialize-pitch';
import { rateLimit } from '@/lib/rate-limit';
import { MAX_PAGE } from '@/lib/constants';
import type { PitchWithRelations } from '@/types/database';


const PAGE_SIZE = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: topicId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Math.min(parseInt(searchParams.get('page') ?? '1', 10) || 1, MAX_PAGE));
  const offset = (page - 1) * PAGE_SIZE;

  // Get prompt to check status
  const { data: prompt } = await supabase
    .from('prompts')
    .select('closes_at')
    .eq('id', topicId)
    .single();

  if (!prompt) return notFound('Topic not found');

  const isOpen = new Date(prompt.closes_at) > new Date();

  let query = supabase
    .from('pitches')
    .select('*, users!inner(username, is_ai), reactions!left(reaction_type, user_id)', { count: 'exact' })
    .eq('prompt_id', topicId)
    .is('deleted_at', null);

  if (isOpen) {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('laugh_count', { ascending: false });
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: pitches, count, error } = await query;
  if (error) {
    return serverError('Failed to load pitches');
  }

  const minReactionsForReveal = isOpen ? 0 : await getConfigInt('min_reactions_for_reveal');

  const serialized = (pitches ?? []).map((pitch) =>
    serializePitch(pitch as PitchWithRelations, {
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
  const { id: topicId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const limited = rateLimit(`pitches:${user.id}`, 10);
  if (limited) return limited;

  const body = await safeJson(request);
  if (body instanceof NextResponse) return body;
  const parsed = createPitchSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  // Check prompt is open
  const { data: prompt } = await supabase
    .from('prompts')
    .select('closes_at')
    .eq('id', topicId)
    .single();

  if (!prompt) return notFound('Topic not found');
  if (new Date(prompt.closes_at) <= new Date()) {
    return badRequest('This topic is closed', 'PROMPT_CLOSED');
  }

  // Atomic pitch insert with cap enforcement (prevents race conditions)
  const pitchCap = await getConfigInt('default_pitch_cap_per_prompt');
  const { data: pitchId, error } = await supabase.rpc('insert_pitch_with_cap', {
    p_prompt_id: topicId,
    p_user_id: user.id,
    p_body: parsed.data.body,
    p_cap: pitchCap,
  });

  if (error) {
    if (error.message?.includes('PITCH_CAP_EXCEEDED')) {
      return badRequest(
        `You've hit the pitch limit of ${pitchCap} for this topic. You can delete a pitch to add a new one.`,
        'PITCH_CAP'
      );
    }
    return serverError('Failed to create pitch');
  }

  // Fetch the created pitch to return full object
  const { data: pitch } = await supabase
    .from('pitches')
    .select()
    .eq('id', pitchId)
    .single();

  return NextResponse.json(pitch, { status: 201 });
}
