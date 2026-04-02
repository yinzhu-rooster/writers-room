-- Migration 1: Enums + Tables

-- Custom types
CREATE TYPE prompt_type AS ENUM ('headline', 'setup', 'format', 'topical', 'evergreen');
CREATE TYPE reaction_type AS ENUM ('smile', 'laugh', 'surprise');
CREATE TYPE flag_reason AS ENUM ('offensive', 'duplicate', 'plagiarized');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  max_open_prompts INTEGER NOT NULL DEFAULT 2,
  total_reps INTEGER NOT NULL DEFAULT 0,
  total_laughs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prompts
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  prompt_type prompt_type NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  is_closed_processed BOOLEAN NOT NULL DEFAULT FALSE,
  submission_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pitches
CREATE TABLE pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) <= 1000),
  laugh_count INTEGER NOT NULL DEFAULT 0,
  smile_count INTEGER NOT NULL DEFAULT 0,
  surprise_count INTEGER NOT NULL DEFAULT 0,
  total_reaction_count INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  is_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reactions
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type reaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pitch_id, user_id)
);

-- Pitch Flags
CREATE TABLE pitch_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason flag_reason NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pitch_id, user_id)
);

-- Prompt Flags
CREATE TABLE prompt_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason flag_reason NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prompt_id, user_id)
);

-- App Config
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_prompts_open_close ON prompts (opens_at, closes_at);
CREATE INDEX idx_pitches_prompt_listing ON pitches (prompt_id, deleted_at, created_at);
CREATE INDEX idx_pitches_prompt_ranking ON pitches (prompt_id, deleted_at, laugh_count DESC);
CREATE INDEX idx_pitches_user_prompts ON pitches (user_id, deleted_at, prompt_id);
CREATE INDEX idx_reactions_user_pitch ON reactions (user_id, pitch_id);
CREATE INDEX idx_pitch_flags_pitch ON pitch_flags (pitch_id);
CREATE INDEX idx_prompt_flags_prompt ON prompt_flags (prompt_id);
