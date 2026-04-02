import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPromptSchema } from '@/lib/validators/prompt';
import { badRequest, unauthorized, safeJson } from '@/lib/api-error';

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'open';
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
    query = query.order('closes_at', { ascending: false });
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: prompts, count, error } = await query;

  if (error) return badRequest('Failed to load prompts');

  // Anonymize creator on open prompts
  const serialized = (prompts ?? []).map((p) => {
    const isOpen = new Date(p.closes_at) > new Date();
    if (isOpen && p.created_by !== user?.id) {
      return { ...p, created_by: null };
    }
    return p;
  });

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
