-- Migration 4: RLS Policies

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read profiles, users can update own
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Prompts: readable by all, insert by authenticated
CREATE POLICY "Prompts are viewable by everyone" ON prompts
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create prompts" ON prompts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Pitches: filter out soft-deleted, insert/update/delete own
CREATE POLICY "Non-deleted pitches are viewable" ON pitches
  FOR SELECT USING (deleted_at IS NULL OR user_id = auth.uid());
CREATE POLICY "Authenticated users can create pitches" ON pitches
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pitches" ON pitches
  FOR UPDATE USING (auth.uid() = user_id);

-- Reactions: read all, write own
CREATE POLICY "Reactions are viewable by everyone" ON reactions
  FOR SELECT USING (true);
CREATE POLICY "Users can create own reactions" ON reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reactions" ON reactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Pitch Flags: insert only
CREATE POLICY "Users can create pitch flags" ON pitch_flags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own pitch flags" ON pitch_flags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all pitch flags" ON pitch_flags
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- Prompt Flags: insert only
CREATE POLICY "Users can create prompt flags" ON prompt_flags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own prompt flags" ON prompt_flags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all prompt flags" ON prompt_flags
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- App Config: read-only for everyone
CREATE POLICY "App config is readable by everyone" ON app_config
  FOR SELECT USING (true);
