-- Migration 8: RLS policy fixes + trigger security hardening

-- 1. Fix prompt INSERT policy: users can only create prompts attributed to themselves
--    and cannot set is_system_generated = true
DROP POLICY IF EXISTS "Authenticated users can create prompts" ON prompts;
CREATE POLICY "Authenticated users can create prompts" ON prompts
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND is_system_generated = false
  );

-- 2. Fix user UPDATE policy: protect is_ai column (added in migration 005 after original policy)
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT u.is_admin FROM users u WHERE u.id = auth.uid())
    AND is_ai = (SELECT u.is_ai FROM users u WHERE u.id = auth.uid())
    AND total_reps = (SELECT u.total_reps FROM users u WHERE u.id = auth.uid())
    AND total_laughs = (SELECT u.total_laughs FROM users u WHERE u.id = auth.uid())
    AND max_open_prompts = (SELECT u.max_open_prompts FROM users u WHERE u.id = auth.uid())
  );

-- 3. Harden SECURITY DEFINER trigger functions with explicit search_path
CREATE OR REPLACE FUNCTION update_pitch_reaction_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_pitch_author UUID;
  v_old_is_laugh BOOLEAN := FALSE;
  v_new_is_laugh BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE pitches SET
      laugh_count = laugh_count - CASE WHEN OLD.reaction_type = 'laugh' THEN 1 ELSE 0 END,
      smile_count = smile_count - CASE WHEN OLD.reaction_type = 'smile' THEN 1 ELSE 0 END,
      surprise_count = surprise_count - CASE WHEN OLD.reaction_type = 'surprise' THEN 1 ELSE 0 END,
      total_reaction_count = total_reaction_count - 1
    WHERE id = OLD.pitch_id;

    IF OLD.reaction_type = 'laugh' THEN
      SELECT user_id INTO v_pitch_author FROM pitches WHERE id = OLD.pitch_id;
      UPDATE users SET total_laughs = total_laughs - 1 WHERE id = v_pitch_author;
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    UPDATE pitches SET
      laugh_count = laugh_count + CASE WHEN NEW.reaction_type = 'laugh' THEN 1 ELSE 0 END,
      smile_count = smile_count + CASE WHEN NEW.reaction_type = 'smile' THEN 1 ELSE 0 END,
      surprise_count = surprise_count + CASE WHEN NEW.reaction_type = 'surprise' THEN 1 ELSE 0 END,
      total_reaction_count = total_reaction_count + 1
    WHERE id = NEW.pitch_id;

    IF NEW.reaction_type = 'laugh' THEN
      SELECT user_id INTO v_pitch_author FROM pitches WHERE id = NEW.pitch_id;
      UPDATE users SET total_laughs = total_laughs + 1 WHERE id = v_pitch_author;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.reaction_type != NEW.reaction_type THEN
    v_old_is_laugh := OLD.reaction_type = 'laugh';
    v_new_is_laugh := NEW.reaction_type = 'laugh';

    UPDATE pitches SET
      laugh_count = laugh_count
        - CASE WHEN OLD.reaction_type = 'laugh' THEN 1 ELSE 0 END
        + CASE WHEN NEW.reaction_type = 'laugh' THEN 1 ELSE 0 END,
      smile_count = smile_count
        - CASE WHEN OLD.reaction_type = 'smile' THEN 1 ELSE 0 END
        + CASE WHEN NEW.reaction_type = 'smile' THEN 1 ELSE 0 END,
      surprise_count = surprise_count
        - CASE WHEN OLD.reaction_type = 'surprise' THEN 1 ELSE 0 END
        + CASE WHEN NEW.reaction_type = 'surprise' THEN 1 ELSE 0 END
    WHERE id = NEW.pitch_id;

    IF v_old_is_laugh != v_new_is_laugh THEN
      SELECT user_id INTO v_pitch_author FROM pitches WHERE id = NEW.pitch_id;
      UPDATE users SET total_laughs = total_laughs
        + CASE WHEN v_new_is_laugh THEN 1 ELSE -1 END
      WHERE id = v_pitch_author;
    END IF;

    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_prompt_submission_count()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE prompts SET submission_count = submission_count + 1 WHERE id = NEW.prompt_id;

    SELECT COUNT(*) INTO v_existing_count
    FROM pitches
    WHERE prompt_id = NEW.prompt_id
      AND user_id = NEW.user_id
      AND deleted_at IS NULL
      AND id != NEW.id;

    IF v_existing_count = 0 THEN
      UPDATE users SET total_reps = total_reps + 1 WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE prompts SET submission_count = submission_count - 1 WHERE id = NEW.prompt_id;

      SELECT COUNT(*) INTO v_existing_count
      FROM pitches
      WHERE prompt_id = NEW.prompt_id
        AND user_id = NEW.user_id
        AND deleted_at IS NULL
        AND id != NEW.id;

      IF v_existing_count = 0 THEN
        UPDATE users SET total_reps = total_reps - 1 WHERE id = NEW.user_id;
      END IF;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE prompts SET submission_count = submission_count + 1 WHERE id = NEW.prompt_id;

      SELECT COUNT(*) INTO v_existing_count
      FROM pitches
      WHERE prompt_id = NEW.prompt_id
        AND user_id = NEW.user_id
        AND deleted_at IS NULL
        AND id != NEW.id;

      IF v_existing_count = 0 THEN
        UPDATE users SET total_reps = total_reps + 1 WHERE id = NEW.user_id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE prompts SET submission_count = GREATEST(0, submission_count - 1) WHERE id = OLD.prompt_id;

      SELECT COUNT(*) INTO v_existing_count
      FROM pitches
      WHERE prompt_id = OLD.prompt_id
        AND user_id = OLD.user_id
        AND deleted_at IS NULL
        AND id != OLD.id;

      IF v_existing_count = 0 THEN
        UPDATE users SET total_reps = GREATEST(0, total_reps - 1) WHERE id = OLD.user_id;
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Drop superseded RPC
DROP FUNCTION IF EXISTS get_unique_writer_counts(uuid[]);
