import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notFound, unauthorized } from '@/lib/api-error';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // Get user profile
  const { data: profileUser } = await supabase
    .from('users')
    .select('id, username, avatar_url, total_reps, total_laughs, created_at')
    .eq('id', id)
    .single();

  if (!profileUser) return notFound('User not found');

  // Best finish (lowest rank across all pitches)
  const { data: bestFinish } = await supabase
    .from('pitches')
    .select('rank')
    .eq('user_id', id)
    .is('deleted_at', null)
    .not('rank', 'is', null)
    .order('rank', { ascending: true })
    .limit(1)
    .single();

  // Pitch history (from closed prompts only)
  const { data: pitchHistory } = await supabase
    .from('pitches')
    .select('id, body, laugh_count, smile_count, surprise_count, total_reaction_count, rank, created_at, prompts!inner(id, body, closes_at)')
    .eq('user_id', id)
    .is('deleted_at', null)
    .not('rank', 'is', null)
    .eq('is_revealed', true)
    .order('created_at', { ascending: false })
    .limit(50);

  // Reaction breakdown (aggregate of all reactions received)
  const { data: reactionTotals } = await supabase
    .from('pitches')
    .select('laugh_count, smile_count, surprise_count')
    .eq('user_id', id)
    .is('deleted_at', null);

  const totals = (reactionTotals ?? []).reduce(
    (acc, p) => ({
      laughs: acc.laughs + p.laugh_count,
      smiles: acc.smiles + p.smile_count,
      surprises: acc.surprises + p.surprise_count,
    }),
    { laughs: 0, smiles: 0, surprises: 0 }
  );

  return NextResponse.json({
    user: profileUser,
    best_finish: bestFinish?.rank ?? null,
    pitch_history: pitchHistory ?? [],
    reaction_breakdown: totals,
  });
}
