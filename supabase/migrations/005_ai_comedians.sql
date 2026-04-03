-- Add is_ai flag to users table for AI comedian bots
ALTER TABLE users ADD COLUMN is_ai BOOLEAN NOT NULL DEFAULT FALSE;
