import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPromptSchema } from '@/lib/validators/prompt';
import { badRequest, unauthorized, safeJson } from '@/lib/api-error';

const PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'open';
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date().toISOString();

  let query = supabase.from('prompts').select('*', { count: 'exact' });

  if (status === 'open') {
    if (!user) return unauthorized('Sign in to view open topics');
    query = query.lte('opens_at', now).gt('closes_at', now);
    query = query.order('closes_at', { ascending: true });
  } else {
    query = query.lte('closes_at', now);
    // Sort options for closed: newest (default), oldest, most_pitches
    // most_reactions is handled client-side after stats are fetched
    if (sort === 'oldest') {
      query = query.order('closes_at', { ascending: true });
    } else if (sort === 'most_pitches') {
      query = query.order('submission_count', { ascending: false });
    } else {
      query = query.order('closes_at', { ascending: false });
    }
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: prompts, count, error } = await query;

  if (error) return badRequest('Failed to load prompts');

  // For closed prompts, fetch stats (unique writers + total reactions) via RPC
  const statsMap = new Map<string, { unique_writers: number; total_reactions: number }>();
  if (status === 'closed' && prompts?.length) {
    const promptIds = prompts.map(p => p.id);
    const { data: statsData } = await supabase.rpc('get_prompt_stats', {
      prompt_ids: promptIds,
    });
    if (statsData) {
      for (const row of statsData) {
        statsMap.set(row.prompt_id, {
          unique_writers: Number(row.unique_writers),
          total_reactions: Number(row.total_reactions),
        });
      }
    }
  }

  // Anonymize creator on open prompts, attach stats
  const serialized = (prompts ?? []).map((p) => {
    const isOpen = new Date(p.closes_at) > new Date();
    const stats = statsMap.get(p.id) ?? { unique_writers: 0, total_reactions: 0 };
    if (isOpen && p.created_by !== user?.id) {
      return { ...p, created_by: null, unique_writers: 0, total_reactions: 0 };
    }
    return { ...p, unique_writers: stats.unique_writers, total_reactions: stats.total_reactions };
  });

  // Sort by most_reactions client-side (DB doesn't have this column)
  if (status === 'closed' && sort === 'most_reactions') {
    serialized.sort((a, b) => b.total_reactions - a.total_reactions);
  }

  return NextResponse.json({
    prompts: serialized,
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await safeJson(request);
  if (body instanceof NextResponse) return body;
  const parsed = createPromptSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  // Check open prompts cap
  const { data: profile } = await supabase
    .from('users')
    .select('max_open_prompts')
    .eq('id', user.id)
    .single();

  const maxOpen = profile?.max_open_prompts ?? 2;
  const now = new Date().toISOString();

  const { count } = await supabase
    .from('prompts')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .lte('opens_at', now)
    .gt('closes_at', now);

  if ((count ?? 0) >= maxOpen) {
    return badRequest(`You can only have ${maxOpen} open prompts at a time`, 'MAX_OPEN_PROMPTS');
  }

  const opensAt = new Date();
  const closesAt = new Date(opensAt.getTime() + parsed.data.duration_hours * 60 * 60 * 1000);

  const { data: prompt, error } = await supabase
    .from('prompts')
    .insert({
      body: parsed.data.body,
      prompt_type: parsed.data.prompt_type,
      created_by: user.id,
      opens_at: opensAt.toISOString(),
      closes_at: closesAt.toISOString(),
    })
    .select()
    .single();

  if (error) return badRequest('Failed to create prompt');

  return NextResponse.json(prompt, { status: 201 });
}
