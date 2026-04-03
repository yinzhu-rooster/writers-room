-- Replace writer counts RPC with a fuller stats RPC that includes reaction counts
CREATE OR REPLACE FUNCTION get_prompt_stats(prompt_ids UUID[])
RETURNS TABLE(prompt_id UUID, unique_writers BIGINT, total_reactions BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.prompt_id,
    COUNT(DISTINCT p.user_id) AS unique_writers,
    COALESCE(SUM(p.total_reaction_count), 0) AS total_reactions
  FROM pitches p
  WHERE p.prompt_id = ANY(prompt_ids)
    AND p.deleted_at IS NULL
  GROUP BY p.prompt_id;
$$;
