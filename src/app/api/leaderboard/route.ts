import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MAX_PAGE } from '@/lib/constants';

const PAGE_SIZE = 100;
const VALID_SORTS = ['total_laughs', 'avg_laughs', 'total_reps', 'top3_pct'] as const;
type SortMode = typeof VALID_SORTS[number];

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const rawSort = searchParams.get('sort') ?? 'total_laughs';
  const sort: SortMode = VALID_SORTS.includes(rawSort as SortMode) ? rawSort as SortMode : 'total_laughs';
  const page = Math.max(1, Math.min(parseInt(searchParams.get('page') ?? '1', 10) || 1, MAX_PAGE));
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
  // Limit to top 1000 users by total_laughs to avoid loading entire table
  const { data: users } = await supabase
    .from('users')
    .select('id, username, avatar_url, total_laughs, total_reps')
    .order('total_laughs', { ascending: false })
    .limit(1000);

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
    // Single query: fetch all ranked pitches, then compute top3_pct per user in JS
    const eligibleUsers = users.filter((u) => u.total_reps >= 100);
    const eligibleIds = eligibleUsers.map((u) => u.id);

    if (eligibleIds.length === 0) {
      return NextResponse.json({ leaderboard: [], total: 0, page, page_size: PAGE_SIZE, sort });
    }

    const { data: rankedPitches } = await supabase
      .from('pitches')
      .select('user_id, rank')
      .in('user_id', eligibleIds)
      .is('deleted_at', null)
      .not('rank', 'is', null);

    // Tally per user
    const stats = new Map<string, { total: number; top3: number }>();
    for (const p of rankedPitches ?? []) {
      const s = stats.get(p.user_id) ?? { total: 0, top3: 0 };
      s.total++;
      if (p.rank <= 3) s.top3++;
      stats.set(p.user_id, s);
    }

    const enriched = eligibleUsers.map((u) => {
      const s = stats.get(u.id);
      const pct = s && s.total > 0 ? (s.top3 / s.total) * 100 : 0;
      return { ...u, top3_pct: Math.round(pct * 10) / 10 };
    });

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
