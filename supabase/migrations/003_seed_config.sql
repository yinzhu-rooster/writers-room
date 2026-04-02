-- Migration 3: Seed app_config

INSERT INTO app_config (key, value) VALUES
  ('min_reactions_for_reveal', '3'),
  ('default_max_open_prompts', '2'),
  ('default_pitch_cap_per_prompt', '50'),
  ('default_prompt_duration_hours', '24');
