-- Migration 2: Triggers for cached counts

-- Reaction counts on pitches + total_laughs on users
CREATE OR REPLACE FUNCTION update_pitch_reaction_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_pitch_author UUID;
  v_old_is_laugh BOOLEAN := FALSE;
  v_new_is_laugh BOOLEAN := FALSE;
BEGIN
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE pitches SET
      laugh_count = laugh_count - CASE WHEN OLD.reaction_type = 'laugh' THEN 1 ELSE 0 END,
      smile_count = smile_count - CASE WHEN OLD.reaction_type = 'smile' THEN 1 ELSE 0 END,
      surprise_count = surprise_count - CASE WHEN OLD.reaction_type = 'surprise' THEN 1 ELSE 0 END,
      total_reaction_count = total_reaction_count - 1
    WHERE id = OLD.pitch_id;

    -- Update user total_laughs if was a laugh
    IF OLD.reaction_type = 'laugh' THEN
      SELECT user_id INTO v_pitch_author FROM pitches WHERE id = OLD.pitch_id;
      UPDATE users SET total_laughs = total_laughs - 1 WHERE id = v_pitch_author;
    END IF;

    RETURN OLD;
  END IF;

  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    UPDATE pitches SET
      laugh_count = laugh_count + CASE WHEN NEW.reaction_type = 'laugh' THEN 1 ELSE 0 END,
      smile_count = smile_count + CASE WHEN NEW.reaction_type = 'smile' THEN 1 ELSE 0 END,
      surprise_count = surprise_count + CASE WHEN NEW.reaction_type = 'surprise' THEN 1 ELSE 0 END,
      total_reaction_count = total_reaction_count + 1
    WHERE id = NEW.pitch_id;

    -- Update user total_laughs if new is a laugh
    IF NEW.reaction_type = 'laugh' THEN
      SELECT user_id INTO v_pitch_author FROM pitches WHERE id = NEW.pitch_id;
      UPDATE users SET total_laughs = total_laughs + 1 WHERE id = v_pitch_author;
    END IF;

    RETURN NEW;
  END IF;

  -- Handle UPDATE (reaction type change)
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

    -- Update user total_laughs for laugh delta
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reaction_counts
AFTER INSERT OR UPDATE OR DELETE ON reactions
FOR EACH ROW
EXECUTE FUNCTION update_pitch_reaction_counts();

-- Submission count on prompts + total_reps on users
CREATE OR REPLACE FUNCTION update_prompt_submission_count()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  -- INSERT: new pitch added
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE prompts SET submission_count = submission_count + 1 WHERE id = NEW.prompt_id;

    -- Check if this is user's first pitch on this prompt (for total_reps)
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

  -- UPDATE: check soft-delete transitions
  IF TG_OP = 'UPDATE' THEN
    -- Soft-deleted
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE prompts SET submission_count = submission_count - 1 WHERE id = NEW.prompt_id;

      -- Check if user has no more non-deleted pitches on this prompt
      SELECT COUNT(*) INTO v_existing_count
      FROM pitches
      WHERE prompt_id = NEW.prompt_id
        AND user_id = NEW.user_id
        AND deleted_at IS NULL
        AND id != NEW.id;

      IF v_existing_count = 0 THEN
        UPDATE users SET total_reps = total_reps - 1 WHERE id = NEW.user_id;
      END IF;
    -- Un-deleted (restore)
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

  -- Handle DELETE (e.g. cascade from user deletion)
  IF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE prompts SET submission_count = GREATEST(0, submission_count - 1) WHERE id = OLD.prompt_id;

      -- Check if user had no other non-deleted pitches on this prompt
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_submission_count
AFTER INSERT OR UPDATE OR DELETE ON pitches
FOR EACH ROW
EXECUTE FUNCTION update_prompt_submission_count();
