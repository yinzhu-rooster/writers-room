-- Atomic pitch insert with cap enforcement to prevent race conditions.
-- The count check and insert happen in a single transaction.
create or replace function insert_pitch_with_cap(
  p_prompt_id uuid,
  p_user_id uuid,
  p_body text,
  p_cap integer
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_count integer;
  v_pitch_id uuid;
begin
  -- Lock the user's pitches for this prompt to prevent concurrent inserts
  perform 1
  from pitches
  where prompt_id = p_prompt_id
    and user_id = p_user_id
    and deleted_at is null
  for update;

  select count(*)
  into v_count
  from pitches
  where prompt_id = p_prompt_id
    and user_id = p_user_id
    and deleted_at is null;

  if v_count >= p_cap then
    raise exception 'PITCH_CAP_EXCEEDED'
      using errcode = 'P0001';
  end if;

  insert into pitches (prompt_id, user_id, body)
  values (p_prompt_id, p_user_id, p_body)
  returning id into v_pitch_id;

  return v_pitch_id;
end;
$$;
