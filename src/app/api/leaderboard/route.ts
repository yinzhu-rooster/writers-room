import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unauthorized } from '@/lib/api-error';

const PAGE_SIZE = 20;
const VALID_SORTS = ['total_laughs', 'avg_laughs', 'total_reps', 'top3_pct'] as const;
type SortMode = typeof VALID_SORTS[number];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const rawSort = searchParams.get('sort') ?? 'total_laughs';
  const sort: SortMode = VALID_SORTS.includes(rawSort as SortMode) ? rawSort as SortMode : 'total_laughs';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  if (sort === 'total_laughs' || sort === 'total_reps') {
    const { data, count } = await supabase
      .from('users')
      .select('id, username, avatar_url, total_laughs, total_reps', { count: 'exact' })
      .order(sort, { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    return NextResponse.json({
      leaderboard: data ?? [],
      total: count ?? 0,
      page,
      page_size: PAGE_SIZE,
      sort,
    });
  }

  // For avg_laughs and top3_pct, compute on-read
  // Get all users with enough pitches
  const { data: users } = await supabase
    .from('users')
    .select('id, username, avatar_url, total_laughs, total_reps');

  if (!users) return NextResponse.json({ leaderboard: [], total: 0, page, page_size: PAGE_SIZE, sort });

  if (sort === 'avg_laughs') {
    const sorted = users
      .filter((u) => u.total_reps > 0)
      .map((u) => ({ ...u, avg_laughs: u.total_laughs / u.total_reps }))
      .sort((a, b) => b.avg_laughs - a.avg_laughs);

    return NextResponse.json({
      leaderboard: sorted.slice(offset, offset + PAGE_SIZE),
      total: sorted.length,
      page,
      page_size: PAGE_SIZE,
      sort,
    });
  }

  if (sort === 'top3_pct') {
    // Need to query pitches for top3 counts — minimum 100 pitches
    const enriched = await Promise.all(
      users.filter((u) => u.total_reps >= 100).map(async (u) => {
        const { count: totalPitches } = await supabase
          .from('pitches')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', u.id)
          .is('deleted_at', null)
          .not('rank', 'is', null);

        const { count: top3Count } = await supabase
          .from('pitches')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', u.id)
          .is('deleted_at', null)
          .lte('rank', 3);

        const pct = totalPitches ? ((top3Count ?? 0) / totalPitches) * 100 : 0;
        return { ...u, top3_pct: Math.round(pct * 10) / 10 };
      })
    );

    const sorted = enriched.sort((a, b) => b.top3_pct - a.top3_pct);

    return NextResponse.json({
      leaderboard: sorted.slice(offset, offset + PAGE_SIZE),
      total: sorted.length,
      page,
      page_size: PAGE_SIZE,
      sort,
    });
  }

  return NextResponse.json({ leaderboard: [], total: 0, page, page_size: PAGE_SIZE, sort });
}
