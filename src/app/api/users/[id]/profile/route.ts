import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notFound } from '@/lib/api-error';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // User profile
  const { data: user } = await supabase
    .from('users')
    .select('id, username, avatar_url, is_ai, total_reps, total_laughs, created_at')
    .eq('id', id)
    .single();

  if (!user) return notFound('User not found');

  const now = new Date().toISOString();

  // Run independent queries in parallel
  const [
    { count: pitchCount },
    { count: topicsCreated },
    { data: closedTopics },
    { data: bestFinish },
    { data: reactionTotals },
    { count: reactionsGiven },
  ] = await Promise.all([
    supabase
      .from('pitches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)
      .is('deleted_at', null),
    supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', id),
    supabase
      .from('prompts')
      .select('id, body, prompt_type, submission_count, closes_at, created_at')
      .eq('created_by', id)
      .lte('closes_at', now)
      .order('closes_at', { ascending: false })
      .limit(50),
    supabase
      .from('pitches')
      .select('rank')
      .eq('user_id', id)
      .is('deleted_at', null)
      .not('rank', 'is', null)
      .order('rank', { ascending: true })
      .limit(1)
      .single(),
    supabase
      .from('pitches')
      .select('laugh_count, smile_count, surprise_count')
      .eq('user_id', id)
      .is('deleted_at', null)
      .limit(1000),
    supabase
      .from('reactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id),
  ]);

  const reactions = (reactionTotals ?? []).reduce(
    (acc, p) => ({
      laughs: acc.laughs + (p.laugh_count ?? 0),
      smiles: acc.smiles + (p.smile_count ?? 0),
      surprises: acc.surprises + (p.surprise_count ?? 0),
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
    reactions_given: reactionsGiven ?? 0,
  });
}
