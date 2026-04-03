import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from '@/lib/api-error';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // User profile
  const { data: user } = await supabase
    .from('users')
    .select('id, username, avatar_url, is_ai, total_reps, total_laughs, created_at')
    .eq('id', id)
    .single();

  if (!user) return notFound('User not found');

  // Pitch count (non-deleted)
  const { count: pitchCount } = await supabase
    .from('pitches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', id)
    .is('deleted_at', null);

  // Topics created count (all)
  const { count: topicsCreated } = await supabase
    .from('prompts')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', id);

  // Closed topics created by this user (public — open topics stay anonymous)
  const now = new Date().toISOString();
  const { data: closedTopics } = await supabase
    .from('prompts')
    .select('id, body, prompt_type, submission_count, closes_at, created_at')
    .eq('created_by', id)
    .lte('closes_at', now)
    .order('closes_at', { ascending: false })
    .limit(50);

  // Best finish
  const { data: bestFinish } = await supabase
    .from('pitches')
    .select('rank')
    .eq('user_id', id)
    .is('deleted_at', null)
    .not('rank', 'is', null)
    .order('rank', { ascending: true })
    .limit(1)
    .single();

  // Total reactions received
  const { data: reactionTotals } = await supabase
    .from('pitches')
    .select('laugh_count, smile_count, surprise_count')
    .eq('user_id', id)
    .is('deleted_at', null);

  const reactions = (reactionTotals ?? []).reduce(
    (acc, p) => ({
      laughs: acc.laughs + p.laugh_count,
      smiles: acc.smiles + p.smile_count,
      surprises: acc.surprises + p.surprise_count,
    }),
    { laughs: 0, smiles: 0, surprises: 0 }
  );

  return NextResponse.json({
    user,
    pitch_count: pitchCount ?? 0,
    topics_created: topicsCreated ?? 0,
    closed_topics: closedTopics ?? [],
    best_finish: bestFinish?.rank ?? null,
    reactions,
  });
}
