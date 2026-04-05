import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const [users, prompts, pitches, reactions] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('prompts').select('*', { count: 'exact', head: true }),
    supabase.from('pitches').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('reactions').select('*', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    total_writers: users.count ?? 0,
    total_topics: prompts.count ?? 0,
    total_pitches: pitches.count ?? 0,
    total_votes: reactions.count ?? 0,
  });
}
