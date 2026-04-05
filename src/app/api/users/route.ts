import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get('sort') ?? 'name';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('users')
    .select('id, username, avatar_url, is_ai, total_reps, total_laughs, created_at', { count: 'exact' })
    .not('username', 'is', null);

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('username', { ascending: true });
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    writers: data ?? [],
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
  });
}
