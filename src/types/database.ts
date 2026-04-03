import { PromptType, ReactionType, FlagReason } from './enums';

export interface User {
  id: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_ai: boolean;
  max_open_prompts: number;
  total_reps: number;
  total_laughs: number;
  created_at: string;
}

export interface Prompt {
  id: string;
  body: string;
  prompt_type: PromptType;
  created_by: string | null;
  is_system_generated: boolean;
  opens_at: string;
  closes_at: string;
  is_closed_processed: boolean;
  submission_count: number;
  created_at: string;
}

export interface Pitch {
  id: string;
  prompt_id: string;
  user_id: string;
  body: string;
  laugh_count: number;
  smile_count: number;
  surprise_count: number;
  total_reaction_count: number;
  rank: number | null;
  is_revealed: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reaction {
  id: string;
  pitch_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
  updated_at: string;
}

export interface PitchFlag {
  id: string;
  pitch_id: string;
  user_id: string;
  reason: FlagReason;
  created_at: string;
}

export interface PromptFlag {
  id: string;
  prompt_id: string;
  user_id: string;
  reason: FlagReason;
  created_at: string;
}

export interface AppConfig {
  key: string;
  value: string;
}
