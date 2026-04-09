-- Returns reaction counts per user for leaderboard sorting
create or replace function get_reactions_given(
  p_limit int default 100,
  p_offset int default 0
)
returns table(user_id uuid, reactions_given bigint)
language sql stable
as $$
  select r.user_id, count(*) as reactions_given
  from reactions r
  group by r.user_id
  order by reactions_given desc
  limit p_limit offset p_offset;
$$;
