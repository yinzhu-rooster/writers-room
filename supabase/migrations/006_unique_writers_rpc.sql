-- Returns unique writer counts for a list of prompt IDs
CREATE OR REPLACE FUNCTION get_unique_writer_counts(prompt_ids UUID[])
RETURNS TABLE(prompt_id UUID, unique_writers BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT p.prompt_id, COUNT(DISTINCT p.user_id) AS unique_writers
  FROM pitches p
  WHERE p.prompt_id = ANY(prompt_ids)
    AND p.deleted_at IS NULL
  GROUP BY p.prompt_id;
$$;
