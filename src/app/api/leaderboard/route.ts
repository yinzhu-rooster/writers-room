import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MAX_PAGE } from '@/lib/constants';

const PAGE_SIZE = 100;
const VALID_SORTS = ['total_laughs', 'avg_laughs', 'total_reps', 'reactions_given'] as const;
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
      .select('id, username, avatar_url, is_ai, total_laughs, total_reps', { count: 'exact' })
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

  // For avg_laughs and reactions_given, compute on-read
  // Limit to top 1000 users by total_laughs to avoid loading entire table
  const { data: users } = await supabase
    .from('users')
    .select('id, username, avatar_url, is_ai, total_laughs, total_reps')
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

  if (sort === 'reactions_given') {
    // Use RPC to efficiently count reactions per user
    const { data: ranked } = await supabase.rpc('get_reactions_given', {
      p_limit: PAGE_SIZE,
      p_offset: offset,
    });

    if (!ranked?.length) {
      return NextResponse.json({ leaderboard: [], total: 0, page, page_size: PAGE_SIZE, sort });
    }

    // Fetch user profiles for the ranked user IDs
    const rankedIds = ranked.map((r: { user_id: string }) => r.user_id);
    const { data: rankedUsers } = await supabase
      .from('users')
      .select('id, username, avatar_url, is_ai, total_laughs, total_reps')
      .in('id', rankedIds);

    const userMap = new Map((rankedUsers ?? []).map((u) => [u.id, u]));

    const leaderboard = ranked
      .map((r: { user_id: string; reactions_given: number }) => {
        const u = userMap.get(r.user_id);
        if (!u) return null;
        return { ...u, reactions_given: Number(r.reactions_given) };
      })
      .filter(Boolean);

    // Get total count of users with reactions for pagination
    const { count: totalWithReactions } = await supabase
      .from('reactions')
      .select('user_id', { count: 'exact', head: true });

    return NextResponse.json({
      leaderboard,
      total: totalWithReactions ?? leaderboard.length,
      page,
      page_size: PAGE_SIZE,
      sort,
    });
  }

  return NextResponse.json({ leaderboard: [], total: 0, page, page_size: PAGE_SIZE, sort });
}
