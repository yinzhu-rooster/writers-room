import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { badRequest, notFound, unauthorized, conflict, safeJson } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promptId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const json = await safeJson<{ reason?: string }>(request);
  if (json instanceof NextResponse) return json;
  const { reason } = json;
  if (!reason || !['offensive', 'duplicate', 'plagiarized'].includes(reason)) {
    return badRequest('Invalid flag reason');
  }

  // Verify prompt is open
  const { data: prompt } = await supabase
    .from('prompts')
    .select('closes_at')
    .eq('id', promptId)
    .single();

  if (!prompt) return notFound('Prompt not found');
  if (new Date(prompt.closes_at) <= new Date()) {
    return badRequest('Cannot flag closed prompts');
  }

  const { error } = await supabase
    .from('prompt_flags')
    .insert({ prompt_id: promptId, user_id: user.id, reason });

  if (error) {
    if (error.code === '23505') return conflict('Already flagged');
    return badRequest('Failed to flag prompt');
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
